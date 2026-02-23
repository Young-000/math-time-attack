/**
 * promotionService.ts 테스트
 *
 * Edge Function 기반 프로모션 지급 플로우를 검증한다.
 * 시나리오: 성공, 실패, 이미 지급됨, 네트워크 에러, 비AIT 환경, userKey 미제공
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.hoisted를 사용하여 mock 함수를 hoisted 스코프에서 생성
const { mockAppLoginIsSupported } = vi.hoisted(() => {
  const mockAppLoginIsSupported = vi.fn(() => false);
  return { mockAppLoginIsSupported };
});

vi.mock('@apps-in-toss/web-framework', () => ({
  appLogin: Object.assign(
    vi.fn(() => Promise.resolve(undefined)),
    { isSupported: mockAppLoginIsSupported },
  ),
}));

import {
  claimPromotion,
  resetPromotionClaims,
} from '../promotionService';

// fetch mock
const originalFetch = globalThis.fetch;
const mockFetch = vi.fn();

const TEST_CODE = 'TEST_PROMO_CODE_123';
const TEST_AMOUNT = 100;
const TEST_USER_KEY = 'test-user-key-abc';

describe('promotionService', () => {
  beforeEach(() => {
    resetPromotionClaims();
    localStorage.clear();
    vi.clearAllMocks();
    mockAppLoginIsSupported.mockReturnValue(false);
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('claimPromotion', () => {
    it('비AIT 환경에서는 에러를 반환한다', async () => {
      mockAppLoginIsSupported.mockReturnValue(false);

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('AIT 환경이 아닙니다');
      }
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('userKey 미제공 시 에러를 반환한다', async () => {
      mockAppLoginIsSupported.mockReturnValue(true);

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('userKey가 필요합니다');
      }
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('Edge Function 성공 시 포인트 지급 성공을 반환한다', async () => {
      mockAppLoginIsSupported.mockReturnValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          key: 'promo-key-xyz',
        }),
      });

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toContain(`${TEST_AMOUNT} 포인트 지급 성공`);
        expect(result.message).toContain('promo-key-xyz');
      }

      // Edge Function에 올바른 요청이 전달되었는지 확인
      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/functions/v1/promotion');
      const body = JSON.parse(options.body as string);
      expect(body).toEqual({
        promotionCode: TEST_CODE,
        amount: TEST_AMOUNT,
        userKey: TEST_USER_KEY,
      });
    });

    it('성공 후 localStorage에 지급 완료 기록이 남는다', async () => {
      mockAppLoginIsSupported.mockReturnValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, key: 'key-123' }),
      });

      await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      const claimed = JSON.parse(localStorage.getItem('math-attack-promo-claimed') ?? '[]');
      expect(claimed).toContain(TEST_CODE);
    });

    it('이미 지급된 프로모션은 중복 호출하지 않는다', async () => {
      mockAppLoginIsSupported.mockReturnValue(true);
      // localStorage에 미리 claimed 기록
      localStorage.setItem(
        'math-attack-promo-claimed',
        JSON.stringify([TEST_CODE])
      );

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('이미 지급된 프로모션');
      }
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('Edge Function 에러 응답 시 에러 메시지를 반환한다', async () => {
      mockAppLoginIsSupported.mockReturnValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'GET_KEY_FAILED',
          message: 'Invalid promotion code',
        }),
      });

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('GET_KEY_FAILED');
        expect(result.error).toContain('Invalid promotion code');
      }
    });

    it('서버 측 ALREADY_CLAIMED 응답 시 클라이언트도 claimed 마킹한다', async () => {
      mockAppLoginIsSupported.mockReturnValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: false,
          error: 'ALREADY_CLAIMED',
          message: 'Promotion already claimed for this user',
        }),
      });

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('이미 지급된 프로모션');
      }

      // localStorage에도 claimed 기록됨
      const claimed = JSON.parse(localStorage.getItem('math-attack-promo-claimed') ?? '[]');
      expect(claimed).toContain(TEST_CODE);
    });

    it('네트워크 에러(fetch throw) 시 에러 메시지를 반환한다', async () => {
      mockAppLoginIsSupported.mockReturnValue(true);
      mockFetch.mockRejectedValue(new Error('Network request failed'));

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('프로모션 요청 실패');
        expect(result.error).toContain('Network request failed');
      }
    });

    it('fetch가 non-Error를 throw해도 처리한다', async () => {
      mockAppLoginIsSupported.mockReturnValue(true);
      mockFetch.mockRejectedValue('unexpected string error');

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('알 수 없는 오류');
      }
    });

    it('다른 프로모션 코드는 독립적으로 지급 가능하다', async () => {
      mockAppLoginIsSupported.mockReturnValue(true);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, key: 'key-1' }),
      });

      // 첫 번째 프로모션 지급
      await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      // 두 번째 다른 프로모션 코드
      const ANOTHER_CODE = 'ANOTHER_PROMO_CODE';
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, key: 'key-2' }),
      });

      const result = await claimPromotion(ANOTHER_CODE, 50, TEST_USER_KEY);

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('resetPromotionClaims', () => {
    it('localStorage의 claimed 기록을 초기화한다', () => {
      localStorage.setItem(
        'math-attack-promo-claimed',
        JSON.stringify([TEST_CODE])
      );

      resetPromotionClaims();

      expect(localStorage.getItem('math-attack-promo-claimed')).toBeNull();
    });
  });
});
