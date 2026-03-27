/**
 * 프로모션(토스 포인트) 지급 서비스
 *
 * SDK grantPromotionReward() 직접 호출 방식.
 * Edge Function 불필요 — 클라이언트에서 직접 토스 프로모션 API 호출.
 * SDK v2.0.8+ 필요 (현재 2.0.9).
 */

import { grantPromotionReward } from '@apps-in-toss/web-framework';

// --- 타입 ---

export type PromotionResult =
  | { success: true; message: string }
  | { success: false; error: string };

// --- Public API ---

/**
 * 프로모션 리워드 지급 (SDK 직접 호출)
 *
 * @param promotionCode 콘솔에서 생성한 프로모션 코드
 * @param amount 지급 금액 (토스 포인트)
 */
export async function claimPromotion(
  promotionCode: string,
  amount: number,
  _userKey?: string,
): Promise<PromotionResult> {
  try {
    const result = await grantPromotionReward({
      params: { promotionCode, amount },
    });

    // undefined = 앱 버전 미지원
    if (result === undefined) {
      return { success: false, error: '앱 업데이트가 필요합니다 (v5.232.0+)' };
    }

    // 에러 응답
    if (result === 'ERROR') {
      return { success: false, error: '알 수 없는 오류가 발생했습니다' };
    }

    // 에러 코드 응답
    if ('errorCode' in result) {
      const code = result.errorCode;
      if (code === '4100') return { success: false, error: '프로모션 정보를 찾을 수 없습니다' };
      if (code === '4109') return { success: false, error: '프로모션이 진행 중이 아닙니다' };
      if (code === '4112') return { success: false, error: '프로모션 예산이 소진되었습니다' };
      if (code === '4114') return { success: false, error: '1회 지급 한도를 초과했습니다' };
      return { success: false, error: `프로모션 오류 (${code}): ${result.message}` };
    }

    // 성공 응답 { key: string }
    if ('key' in result) {
      return {
        success: true,
        message: `${amount} 포인트 지급 성공!`,
      };
    }

    return { success: false, error: '예상치 못한 응답입니다' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : '네트워크 오류';
    return { success: false, error: msg };
  }
}
