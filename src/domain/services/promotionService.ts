/**
 * 프로모션(토스 포인트) 지급 서비스
 *
 * 서버 사이드 프로모션 API (Supabase Edge Function) 기반.
 * 비게임 카테고리에서는 grantPromotionRewardForGame()이 동작하지 않으므로,
 * Edge Function을 통해 mTLS 인증된 토스 프로모션 API를 호출한다.
 *
 * 플로우:
 * 1. 클라이언트 localStorage 중복 체크
 * 2. userKey 조회 (userIdentity)
 * 3. Edge Function POST /functions/v1/promotion
 *    → 서버: get-key → execute-promotion → execution-result (polling)
 * 4. 클라이언트 localStorage 지급 완료 기록
 */

import { isAppsInTossEnvironment } from '@infrastructure/userIdentity';

// --- 상수 ---

const CLAIMED_KEY = 'math-attack-promo-claimed';
const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/promotion`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// --- 타입 ---

export type PromotionResult =
  | { success: true; message: string }
  | { success: false; error: string };

interface PromotionSuccessResponse {
  success: true;
  key: string;
}

interface PromotionErrorResponse {
  success: false;
  error: string;
  message: string;
}

type EdgeFunctionResponse = PromotionSuccessResponse | PromotionErrorResponse;

// --- localStorage 중복 방지 (클라이언트 방어) ---

function isAlreadyClaimed(promotionCode: string): boolean {
  try {
    const claimed = JSON.parse(localStorage.getItem(CLAIMED_KEY) ?? '[]') as string[];
    return claimed.includes(promotionCode);
  } catch {
    return false;
  }
}

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

// --- Edge Function 호출 ---

async function callPromotionEdgeFunction(
  promotionCode: string,
  amount: number,
  userKey: string,
): Promise<EdgeFunctionResponse> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ promotionCode, amount, userKey }),
  });

  const data = (await response.json()) as EdgeFunctionResponse;
  return data;
}

// --- Public API ---

/**
 * 프로모션 리워드 지급
 *
 * @param promotionCode 콘솔에서 생성한 프로모션 코드 (예: TEST_01KHRY05GMV8Q502AMZPFZX6J1)
 * @param amount 지급 금액 (토스 포인트)
 * @param userKey 토스 유저 고유 식별키 (userIdentity에서 획득)
 */
export async function claimPromotion(
  promotionCode: string,
  amount: number,
  userKey?: string,
): Promise<PromotionResult> {
  // 비AIT 환경 체크
  if (!isAppsInTossEnvironment()) {
    return { success: false, error: 'AIT 환경이 아닙니다 (웹 브라우저에서는 사용 불가)' };
  }

  // 클라이언트 중복 체크
  if (isAlreadyClaimed(promotionCode)) {
    return { success: false, error: '이미 지급된 프로모션입니다' };
  }

  // userKey 필수
  if (!userKey) {
    return { success: false, error: 'userKey가 필요합니다. 로그인 후 다시 시도해주세요.' };
  }

  try {
    const result = await callPromotionEdgeFunction(promotionCode, amount, userKey);

    if (result.success) {
      markClaimed(promotionCode);
      return {
        success: true,
        message: `${amount} 포인트 지급 성공! (key: ${result.key})`,
      };
    }

    // 서버 측 중복 체크
    if (result.error === 'ALREADY_CLAIMED') {
      markClaimed(promotionCode);
      return { success: false, error: '이미 지급된 프로모션입니다' };
    }

    return {
      success: false,
      error: `[${result.error}] ${result.message}`,
    };
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
