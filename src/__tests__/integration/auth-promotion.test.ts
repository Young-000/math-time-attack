/**
 * 통합 테스트: 인증 → 프로모션 지급 플로우 (서비스 레이어)
 *
 * appLogin → userKey → claimPromotion(SDK grantPromotionReward) 흐름을 검증한다.
 *
 * 테스트 범위:
 * - userIdentity: appLogin → Edge Function → userKey 획득
 * - promotionService: SDK 직접 호출 (userKey·AIT 환경 게이트 없음)
 * - 서비스 레이어에서는 인증 실패가 claimPromotion을 막지 않음
 *
 * 주의: 화면 레이어(ExchangePage)는 캐시된 userKey가 없으면 지급 전에 막는다 — 여기서 다루지 않는다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockAppLogin, mockGrantPromotionReward } = vi.hoisted(() => ({
  mockAppLogin: vi.fn(),
  mockGrantPromotionReward: vi.fn(),
}));

vi.mock('@apps-in-toss/web-framework', () => ({
  appLogin: mockAppLogin,
  grantPromotionReward: mockGrantPromotionReward,
}));

import {
  initializeUserIdentity,
  resetUserIdentityCache,
} from '@infrastructure/userIdentity';
import { claimPromotion } from '@domain/services/promotionService';

const MOCK_AUTH_CODE = 'auth-code-promo-test';
const MOCK_USER_KEY = 'toss-user-key-promo-xyz789';
const PROMO_CODE = 'MATH_PROMO_2026_01';
const PROMO_AMOUNT = 100;

const originalFetch = globalThis.fetch;
const mockFetch = vi.fn();

function mockAuthFetch(): void {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({
      userKey: MOCK_USER_KEY,
      expiresAt: '2026-03-01T12:00:00.000Z',
    }),
  });
}

describe('통합: 인증 → 프로모션 지급 플로우', () => {
  beforeEach(() => {
    resetUserIdentityCache();
    localStorage.clear();
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    mockAppLogin.mockResolvedValue({
      authorizationCode: MOCK_AUTH_CODE,
      referrer: 'home',
    });
    mockGrantPromotionReward.mockResolvedValue({ key: 'promo-execution-key-001' });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('appLogin으로 userKey를 획득한 후 프로모션을 지급한다', async () => {
    mockAuthFetch();
    const userKey = await initializeUserIdentity();
    expect(userKey).toBe(MOCK_USER_KEY);

    const result = await claimPromotion(PROMO_CODE, PROMO_AMOUNT, userKey);

    expect(result).toEqual({ success: true, message: `${PROMO_AMOUNT} 포인트 지급 성공!` });
  });

  it('프로모션 지급은 SDK로만 요청하고 별도 서버 호출을 하지 않는다', async () => {
    mockAuthFetch();
    const userKey = await initializeUserIdentity();

    await claimPromotion(PROMO_CODE, PROMO_AMOUNT, userKey);

    // fetch는 인증(Edge Function) 1회뿐
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockGrantPromotionReward).toHaveBeenCalledWith({
      params: { promotionCode: PROMO_CODE, amount: PROMO_AMOUNT },
    });
  });

  it('appLogin이 실패해도 프로모션 지급은 시도된다', async () => {
    mockAppLogin.mockResolvedValue(undefined);

    await expect(initializeUserIdentity()).rejects.toThrow('appLogin 미지원 앱 버전');
    const result = await claimPromotion(PROMO_CODE, PROMO_AMOUNT);

    expect(mockGrantPromotionReward).toHaveBeenCalledTimes(1);
    expect(result.success).toBe(true);
  });

  it('SDK 에러 코드는 인증 성공 여부와 무관하게 사용자 메시지로 반환된다', async () => {
    mockAuthFetch();
    const userKey = await initializeUserIdentity();
    mockGrantPromotionReward.mockResolvedValue({ errorCode: '4112', message: 'budget' });

    const result = await claimPromotion(PROMO_CODE, PROMO_AMOUNT, userKey);

    expect(result).toEqual({ success: false, error: '프로모션 예산이 소진되었습니다' });
  });
});
