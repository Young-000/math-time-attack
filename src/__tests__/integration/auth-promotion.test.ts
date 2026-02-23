/**
 * 통합 테스트: 인증 → 프로모션 지급 플로우
 *
 * appLogin → userKey → claimPromotion → 성공/중복 방지 확인.
 *
 * 테스트 범위:
 * - userIdentity: appLogin → Edge Function → userKey 획득
 * - promotionService: userKey로 프로모션 지급 요청
 * - 중복 방지: 동일 사용자 동일 코드 2회 지급 차단
 * - AIT 환경 필수 검증
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockAppLogin, mockAppLoginIsSupported } = vi.hoisted(() => {
  const mockAppLoginIsSupported = vi.fn(() => false);
  const mockAppLogin = Object.assign(
    vi.fn(() => Promise.resolve(undefined as unknown)),
    { isSupported: mockAppLoginIsSupported },
  );
  return { mockAppLogin, mockAppLoginIsSupported };
});

vi.mock('@apps-in-toss/web-framework', () => ({
  appLogin: mockAppLogin,
}));

import {
  initializeUserIdentity,
  resetUserIdentityCache,
} from '@infrastructure/userIdentity';
import {
  claimPromotion,
  resetPromotionClaims,
} from '@domain/services/promotionService';

const MOCK_AUTH_CODE = 'auth-code-promo-test';
const MOCK_USER_KEY = 'toss-user-key-promo-xyz789';
const PROMO_CODE = 'MATH_PROMO_2026_01';
const PROMO_AMOUNT = 100;

const originalFetch = globalThis.fetch;
const mockFetch = vi.fn();

// fetch 응답을 목적에 따라 분리 (auth와 promotion)
function mockAuthFetch(): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({
      userKey: MOCK_USER_KEY,
      expiresAt: '2026-03-01T12:00:00.000Z',
    }),
  });
}

function mockPromotionFetch(response: {
  success: boolean;
  key?: string;
  error?: string;
  message?: string;
}): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(response),
  });
}

describe('통합: 인증 → 프로모션 지급 플로우', () => {
  beforeEach(() => {
    resetUserIdentityCache();
    resetPromotionClaims();
    localStorage.clear();
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;

    mockAppLoginIsSupported.mockReturnValue(true);
    mockAppLogin.mockResolvedValue({
      authorizationCode: MOCK_AUTH_CODE,
      referrer: 'home',
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('정상 플로우: 인증 후 프로모션 지급', () => {
    it('appLogin으로 userKey를 획득한 후 프로모션을 지급한다', async () => {
      // Step 1: 인증
      mockAuthFetch();
      const userKey = await initializeUserIdentity();
      expect(userKey).toBe(MOCK_USER_KEY);

      // Step 2: 프로모션 지급
      mockPromotionFetch({ success: true, key: 'promo-execution-key-001' });
      const result = await claimPromotion(PROMO_CODE, PROMO_AMOUNT, userKey);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toContain(`${PROMO_AMOUNT} 포인트 지급 성공`);
        expect(result.message).toContain('promo-execution-key-001');
      }
    });

    it('프로모션 Edge Function에 올바른 userKey가 전달된다', async () => {
      mockAuthFetch();
      const userKey = await initializeUserIdentity();

      mockPromotionFetch({ success: true, key: 'key-123' });
      await claimPromotion(PROMO_CODE, PROMO_AMOUNT, userKey);

      // 두 번째 fetch 호출이 promotion
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const [, promoOptions] = mockFetch.mock.calls[1] as [string, RequestInit];
      const body = JSON.parse(promoOptions.body as string);
      expect(body.userKey).toBe(MOCK_USER_KEY);
      expect(body.promotionCode).toBe(PROMO_CODE);
      expect(body.amount).toBe(PROMO_AMOUNT);
    });
  });

  describe('중복 방지: 동일 코드 재지급 차단', () => {
    it('동일한 userKey로 같은 코드를 두 번 지급하면 두 번째는 차단된다', async () => {
      mockAuthFetch();
      const userKey = await initializeUserIdentity();

      // 첫 번째 지급 성공
      mockPromotionFetch({ success: true, key: 'exec-key-first' });
      const firstResult = await claimPromotion(PROMO_CODE, PROMO_AMOUNT, userKey);
      expect(firstResult.success).toBe(true);

      // 두 번째 지급 시도 — 클라이언트에서 차단 (fetch 호출 없음)
      const fetchCallsBefore = mockFetch.mock.calls.length;
      const secondResult = await claimPromotion(PROMO_CODE, PROMO_AMOUNT, userKey);

      expect(secondResult.success).toBe(false);
      if (!secondResult.success) {
        expect(secondResult.error).toContain('이미 지급된 프로모션');
      }
      // 두 번째 시도에서 fetch가 추가 호출되지 않아야 함
      expect(mockFetch.mock.calls.length).toBe(fetchCallsBefore);
    });

    it('서버에서 ALREADY_CLAIMED 응답 시 클라이언트도 claimed로 마킹되어 이후 요청을 차단한다', async () => {
      mockAuthFetch();
      const userKey = await initializeUserIdentity();

      // 서버 측 중복 응답
      mockPromotionFetch({
        success: false,
        error: 'ALREADY_CLAIMED',
        message: 'Promotion already claimed',
      });
      const firstResult = await claimPromotion(PROMO_CODE, PROMO_AMOUNT, userKey);

      expect(firstResult.success).toBe(false);

      // 이후 재시도는 클라이언트에서 차단
      const fetchCallsBefore = mockFetch.mock.calls.length;
      const retryResult = await claimPromotion(PROMO_CODE, PROMO_AMOUNT, userKey);

      expect(retryResult.success).toBe(false);
      if (!retryResult.success) {
        expect(retryResult.error).toContain('이미 지급된 프로모션');
      }
      expect(mockFetch.mock.calls.length).toBe(fetchCallsBefore);
    });
  });

  describe('다른 프로모션 코드는 독립적으로 지급 가능', () => {
    it('다른 코드는 동일 userKey로도 지급 가능하다', async () => {
      mockAuthFetch();
      const userKey = await initializeUserIdentity();

      // 첫 번째 코드 지급
      mockPromotionFetch({ success: true, key: 'key-promo-A' });
      const resultA = await claimPromotion('PROMO_CODE_A', PROMO_AMOUNT, userKey);
      expect(resultA.success).toBe(true);

      // 두 번째 다른 코드 지급
      mockPromotionFetch({ success: true, key: 'key-promo-B' });
      const resultB = await claimPromotion('PROMO_CODE_B', 200, userKey);
      expect(resultB.success).toBe(true);

      // 총 fetch 호출: auth 1회 + promotion 2회
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('비AIT 환경: 프로모션 지급 불가', () => {
    it('비AIT 환경에서는 userKey 획득 없이 프로모션 지급이 차단된다', async () => {
      mockAppLoginIsSupported.mockReturnValue(false);
      resetUserIdentityCache();

      // fallback ID는 local- 접두사
      const userId = await initializeUserIdentity();
      expect(userId).toMatch(/^local-/);

      const result = await claimPromotion(PROMO_CODE, PROMO_AMOUNT, userId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('AIT 환경이 아닙니다');
      }
      // fetch는 호출되지 않아야 함
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('Edge Function 장애: 프로모션 에러 처리', () => {
    it('Edge Function 서버 에러 시 사용자 친화적 에러 메시지를 반환한다', async () => {
      mockAuthFetch();
      const userKey = await initializeUserIdentity();

      mockPromotionFetch({
        success: false,
        error: 'TOSS_SERVER_ERROR',
        message: '토스 서버 일시 장애',
      });
      const result = await claimPromotion(PROMO_CODE, PROMO_AMOUNT, userKey);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('TOSS_SERVER_ERROR');
        expect(result.error).toContain('토스 서버 일시 장애');
      }
    });

    it('네트워크 에러 시 에러 메시지를 반환하고 claimed로 마킹하지 않는다', async () => {
      mockAuthFetch();
      const userKey = await initializeUserIdentity();

      mockFetch.mockRejectedValueOnce(new Error('Network unavailable'));
      const result = await claimPromotion(PROMO_CODE, PROMO_AMOUNT, userKey);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('프로모션 요청 실패');
      }

      // claimed 마킹 안 됨 → 재시도 가능
      mockPromotionFetch({ success: true, key: 'retry-key' });
      const retryResult = await claimPromotion(PROMO_CODE, PROMO_AMOUNT, userKey);
      expect(retryResult.success).toBe(true);
    });
  });

  describe('userKey 미획득: 프로모션 지급 차단', () => {
    it('userKey 없이 claimPromotion 호출 시 에러를 반환한다', async () => {
      // userKey 없이 직접 호출
      const result = await claimPromotion(PROMO_CODE, PROMO_AMOUNT, undefined);

      expect(result.success).toBe(false);
      if (!result.success) {
        // isAppsInTossEnvironment가 false면 AIT 에러, true면 userKey 에러
        expect(
          result.error.includes('AIT 환경이 아닙니다') ||
          result.error.includes('userKey가 필요합니다')
        ).toBe(true);
      }
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });
});
