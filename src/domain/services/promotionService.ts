/**
 * 프로모션(토스 포인트) 지급 서비스
 *
 * grantPromotionRewardForGame()을 래핑하여 중복 지급 방지 + 결과 처리 제공.
 * getUserKeyForGame()의 hash가 내부적으로 사용됨 → initializeUserIdentity() 선행 필요.
 */

import { grantPromotionRewardForGame } from '@apps-in-toss/web-framework';
// TODO: 프로모션 테스트 완료 후 복원
// import { isAppsInTossEnvironment } from '@infrastructure/userIdentity';

const CLAIMED_KEY = 'math-attack-promo-claimed';

type PromotionResult =
  | { success: true; message: string }
  | { success: false; error: string };

/**
 * 이미 지급된 프로모션인지 확인 (클라이언트 방어)
 */
function isAlreadyClaimed(promotionCode: string): boolean {
  try {
    const claimed = JSON.parse(localStorage.getItem(CLAIMED_KEY) ?? '[]') as string[];
    return claimed.includes(promotionCode);
  } catch {
    return false;
  }
}

/**
 * 지급 완료 기록
 */
function markClaimed(promotionCode: string): void {
  try {
    const claimed = JSON.parse(localStorage.getItem(CLAIMED_KEY) ?? '[]') as string[];
    if (!claimed.includes(promotionCode)) {
      claimed.push(promotionCode);
      localStorage.setItem(CLAIMED_KEY, JSON.stringify(claimed));
    }
  } catch {
    // localStorage 실패 무시
  }
}

/**
 * 프로모션 리워드 지급
 *
 * @param promotionCode 콘솔에서 생성한 프로모션 코드 (예: TEST_01KHRY05GMV8Q502AMZPFZX6J1)
 * @param amount 지급 금액 (토스 포인트)
 */
export async function claimPromotion(
  promotionCode: string,
  amount: number,
): Promise<PromotionResult> {
  // TODO: 프로모션 테스트 완료 후 환경 체크 복원
  // if (!isAppsInTossEnvironment()) {
  //   return { success: false, error: 'AIT 환경이 아닙니다 (웹 브라우저에서는 사용 불가)' };
  // }

  if (isAlreadyClaimed(promotionCode)) {
    return { success: false, error: '이미 지급된 프로모션입니다' };
  }

  try {
    const result = await grantPromotionRewardForGame({
      params: { promotionCode, amount },
    });

    // undefined → 앱 버전 미지원
    if (result === undefined) {
      return { success: false, error: '지원하지 않는 앱 버전입니다' };
    }

    // 'ERROR' 문자열 → 알 수 없는 오류
    if (result === 'ERROR') {
      return { success: false, error: '포인트 지급 중 오류가 발생했습니다' };
    }

    // { key: string } → 성공
    if ('key' in result) {
      markClaimed(promotionCode);
      return { success: true, message: `${amount} 포인트 지급 성공! (key: ${result.key})` };
    }

    // { errorCode: string, message: string } → 실패
    if ('errorCode' in result) {
      return { success: false, error: `[${result.errorCode}] ${result.message}` };
    }

    return { success: false, error: `알 수 없는 응답: ${JSON.stringify(result)}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : '알 수 없는 오류';
    return { success: false, error: `프로모션 요청 실패: ${message}` };
  }
}

/**
 * 클라이언트 지급 기록 초기화 (테스트용)
 */
export function resetPromotionClaims(): void {
  try {
    localStorage.removeItem(CLAIMED_KEY);
  } catch {
    // localStorage 실패 무시
  }
}
