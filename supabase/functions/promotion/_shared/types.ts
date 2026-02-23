/**
 * Supabase Edge Function promotion - 공유 타입 정의
 *
 * 토스 비게임 프로모션 API 타입 및 Edge Function 요청/응답 타입.
 */

// --- 클라이언트 -> Edge Function 요청/응답 ---

export interface PromotionRequest {
  promotionCode: string;
  amount: number;
  userKey: string;
}

export interface PromotionSuccessResponse {
  success: true;
  key: string;
}

export interface PromotionErrorResponse {
  success: false;
  error: string;
  message: string;
}

export type PromotionResponse = PromotionSuccessResponse | PromotionErrorResponse;

// --- 토스 비게임 프로모션 API 타입 ---

// get-key 응답
export interface TossGetKeySuccessResponse {
  resultType: 'SUCCESS';
  success: {
    key: string;
  };
}

export interface TossApiFailResponse {
  resultType: 'FAIL';
  error: {
    errorType: number;
    errorCode: string;
    reason: string;
  };
}

export type TossGetKeyResponse = TossGetKeySuccessResponse | TossApiFailResponse;

// execute-promotion 응답
export interface TossExecuteSuccessResponse {
  resultType: 'SUCCESS';
  success: Record<string, unknown>;
}

export type TossExecuteResponse = TossExecuteSuccessResponse | TossApiFailResponse;

// execution-result 응답
export interface TossExecutionResultSuccessResponse {
  resultType: 'SUCCESS';
  success: 'SUCCESS' | 'PENDING' | 'FAILED';
}

export type TossExecutionResultResponse =
  | TossExecutionResultSuccessResponse
  | TossApiFailResponse;

// --- 에러 코드 ---

export const PromotionErrorCode = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  GET_KEY_FAILED: 'GET_KEY_FAILED',
  EXECUTE_FAILED: 'EXECUTE_FAILED',
  EXECUTION_RESULT_FAILED: 'EXECUTION_RESULT_FAILED',
  PROMOTION_PENDING: 'PROMOTION_PENDING',
  PROMOTION_FAILED: 'PROMOTION_FAILED',
  ALREADY_CLAIMED: 'ALREADY_CLAIMED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  SERVER_CONFIG_ERROR: 'SERVER_CONFIG_ERROR',
  DB_ERROR: 'DB_ERROR',
  POLLING_TIMEOUT: 'POLLING_TIMEOUT',
} as const;

export type PromotionErrorCodeType =
  typeof PromotionErrorCode[keyof typeof PromotionErrorCode];

// --- DB Record ---

export interface PromotionRecord {
  id: string;
  user_key: string;
  promotion_code: string;
  amount: number;
  promotion_key: string | null;
  status: 'pending' | 'success' | 'failed';
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
