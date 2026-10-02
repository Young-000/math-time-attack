/**
 * promotionService.ts 테스트
 *
 * SDK grantPromotionReward() 직접 호출 방식의 결과 매핑을 검증한다.
 * 시나리오: 성공, 앱 버전 미지원(undefined), 'ERROR', 에러 코드, 예상 밖 응답, 예외
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGrantPromotionReward } = vi.hoisted(() => ({
  mockGrantPromotionReward: vi.fn(),
}));

vi.mock('@apps-in-toss/web-framework', () => ({
  grantPromotionReward: mockGrantPromotionReward,
}));

import { claimPromotion } from '../promotionService';

const TEST_CODE = 'TEST_PROMO_CODE_123';
const TEST_AMOUNT = 100;
const TEST_USER_KEY = 'test-user-key-abc';

describe('promotionService', () => {
  beforeEach(() => {
    mockGrantPromotionReward.mockReset();
  });

  describe('claimPromotion', () => {
    it('프로모션 코드와 금액으로 SDK를 호출한다', async () => {
      mockGrantPromotionReward.mockResolvedValue({ key: 'reward-key-1' });

      await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(mockGrantPromotionReward).toHaveBeenCalledWith({
        params: { promotionCode: TEST_CODE, amount: TEST_AMOUNT },
      });
    });

    it('userKey 없이도 SDK를 호출한다 (환경·userKey 게이트 없음)', async () => {
      mockGrantPromotionReward.mockResolvedValue({ key: 'reward-key-1' });

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT);

      expect(mockGrantPromotionReward).toHaveBeenCalledTimes(1);
      expect(result.success).toBe(true);
    });

    it('{ key } 응답이면 포인트 지급 성공을 반환한다', async () => {
      mockGrantPromotionReward.mockResolvedValue({ key: 'reward-key-1' });

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result).toEqual({ success: true, message: '100 포인트 지급 성공!' });
    });

    it('같은 코드를 다시 호출해도 매번 SDK에 위임한다 (중복 판정은 서버 몫)', async () => {
      mockGrantPromotionReward.mockResolvedValue({ key: 'reward-key-1' });

      await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);
      await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(mockGrantPromotionReward).toHaveBeenCalledTimes(2);
    });

    it('undefined 응답이면 앱 업데이트 안내를 반환한다', async () => {
      mockGrantPromotionReward.mockResolvedValue(undefined);

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result).toEqual({ success: false, error: '앱 업데이트가 필요합니다 (v5.232.0+)' });
    });

    it("'ERROR' 응답이면 알 수 없는 오류를 반환한다", async () => {
      mockGrantPromotionReward.mockResolvedValue('ERROR');

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result).toEqual({ success: false, error: '알 수 없는 오류가 발생했습니다' });
    });

    it.each([
      ['4100', '프로모션 정보를 찾을 수 없습니다'],
      ['4109', '프로모션이 진행 중이 아닙니다'],
      ['4112', '프로모션 예산이 소진되었습니다'],
      ['4114', '1회 지급 한도를 초과했습니다'],
    ])('에러 코드 %s는 사용자 메시지로 바꿔 반환한다', async (errorCode, message) => {
      mockGrantPromotionReward.mockResolvedValue({ errorCode, message: 'sdk message' });

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result).toEqual({ success: false, error: message });
    });

    it('매핑되지 않은 에러 코드는 코드와 SDK 메시지를 함께 반환한다', async () => {
      mockGrantPromotionReward.mockResolvedValue({ errorCode: '4113', message: '이미 지급된 내역' });

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result).toEqual({ success: false, error: '프로모션 오류 (4113): 이미 지급된 내역' });
    });

    it('key도 errorCode도 없는 응답은 예상 밖 응답으로 처리한다', async () => {
      mockGrantPromotionReward.mockResolvedValue({ code: 'UNKNOWN' });

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result).toEqual({ success: false, error: '예상치 못한 응답입니다' });
    });

    it('SDK가 Error를 throw하면 에러 메시지를 반환한다', async () => {
      mockGrantPromotionReward.mockRejectedValue(new Error('Bridge not available'));

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result).toEqual({ success: false, error: 'Bridge not available' });
    });

    it('SDK가 non-Error를 throw해도 처리한다', async () => {
      mockGrantPromotionReward.mockRejectedValue('string error');

      const result = await claimPromotion(TEST_CODE, TEST_AMOUNT, TEST_USER_KEY);

      expect(result).toEqual({ success: false, error: '네트워크 오류' });
    });
  });
});
