/**
 * Supabase Edge Function: promotion
 *
 * 비게임 프로모션(토스 포인트) 서버 사이드 지급 API.
 * 클라이언트에서 userKey + promotionCode + amount를 전달하면,
 * mTLS 인증으로 토스 파트너 API 3단계 플로우를 실행한다.
 *
 * POST /functions/v1/promotion
 * Body: { promotionCode: string, amount: number, userKey: string }
 * Response:
 *   Success: { success: true, key: string }
 *   Error:   { success: false, error: string, message: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCorsPreflightRequest, getCorsHeaders } from '../auth/_shared/cors.ts';
import { executePromotionFlow } from './_shared/promotion-client.ts';
import { PromotionErrorCode } from './_shared/types.ts';
import type {
  PromotionRequest,
  PromotionSuccessResponse,
  PromotionErrorResponse,
} from './_shared/types.ts';

// --- 요청 검증 ---

function validateRequest(body: unknown): PromotionRequest {
  if (!body || typeof body !== 'object') {
    throw new Error(`${PromotionErrorCode.INVALID_REQUEST}: Request body is required`);
  }

  const { promotionCode, amount, userKey } = body as Record<string, unknown>;

  if (!promotionCode || typeof promotionCode !== 'string') {
    throw new Error(
      `${PromotionErrorCode.INVALID_REQUEST}: promotionCode is required and must be a string`
    );
  }

  if (promotionCode.trim().length === 0) {
    throw new Error(
      `${PromotionErrorCode.INVALID_REQUEST}: promotionCode must not be empty`
    );
  }

  if (amount === undefined || amount === null || typeof amount !== 'number') {
    throw new Error(
      `${PromotionErrorCode.INVALID_REQUEST}: amount is required and must be a number`
    );
  }

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(
      `${PromotionErrorCode.INVALID_REQUEST}: amount must be a positive integer`
    );
  }

  if (!userKey || typeof userKey !== 'string') {
    throw new Error(
      `${PromotionErrorCode.INVALID_REQUEST}: userKey is required and must be a string`
    );
  }

  if (userKey.trim().length === 0) {
    throw new Error(
      `${PromotionErrorCode.INVALID_REQUEST}: userKey must not be empty`
    );
  }

  return {
    promotionCode: promotionCode.trim(),
    amount,
    userKey: userKey.trim(),
  };
}

// --- DB 기록 ---

function getSupabaseClient(): ReturnType<typeof createClient> | null {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[promotion] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    return null;
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: 'math_attack' },
  });
}

async function checkAlreadyClaimed(
  userKey: string,
  promotionCode: string,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { data, error } = await supabase
    .from('promotion_records')
    .select('id, status')
    .eq('user_key', userKey)
    .eq('promotion_code', promotionCode)
    .maybeSingle();

  if (error) {
    console.error('[promotion] DB check error:', error.message);
    return false;
  }

  // 이미 성공한 기록이 있으면 중복
  return data?.status === 'success';
}

async function createPromotionRecord(
  userKey: string,
  promotionCode: string,
  amount: number,
): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('promotion_records')
    .upsert(
      {
        user_key: userKey,
        promotion_code: promotionCode,
        amount,
        status: 'pending',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_key,promotion_code' }
    )
    .select('id')
    .single();

  if (error) {
    console.error('[promotion] DB insert error:', error.message);
    return null;
  }

  return data?.id ?? null;
}

async function updatePromotionRecord(
  userKey: string,
  promotionCode: string,
  updates: {
    status: 'success' | 'failed';
    promotion_key?: string;
    error_code?: string;
    error_message?: string;
  },
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase
    .from('promotion_records')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_key', userKey)
    .eq('promotion_code', promotionCode);

  if (error) {
    console.error('[promotion] DB update error:', error.message);
  }
}

// --- 에러 코드 -> HTTP 상태 매핑 ---

function getHttpStatusForError(errorMessage: string): number {
  if (errorMessage.startsWith(PromotionErrorCode.INVALID_REQUEST)) return 400;
  if (errorMessage.startsWith(PromotionErrorCode.ALREADY_CLAIMED)) return 409;
  if (errorMessage.startsWith(PromotionErrorCode.GET_KEY_FAILED)) return 502;
  if (errorMessage.startsWith(PromotionErrorCode.EXECUTE_FAILED)) return 502;
  if (errorMessage.startsWith(PromotionErrorCode.EXECUTION_RESULT_FAILED)) return 502;
  if (errorMessage.startsWith(PromotionErrorCode.PROMOTION_FAILED)) return 502;
  if (errorMessage.startsWith(PromotionErrorCode.POLLING_TIMEOUT)) return 504;
  if (errorMessage.startsWith(PromotionErrorCode.NETWORK_ERROR)) return 502;
  if (errorMessage.startsWith(PromotionErrorCode.SERVER_CONFIG_ERROR)) return 500;
  if (errorMessage.startsWith(PromotionErrorCode.DB_ERROR)) return 500;
  return 500;
}

function extractErrorCode(errorMessage: string): string {
  const colonIndex = errorMessage.indexOf(':');
  if (colonIndex > 0) {
    return errorMessage.substring(0, colonIndex).trim();
  }
  return 'UNKNOWN_ERROR';
}

function extractErrorMessage(errorMessage: string): string {
  const colonIndex = errorMessage.indexOf(':');
  if (colonIndex > 0) {
    return errorMessage.substring(colonIndex + 1).trim();
  }
  return errorMessage;
}

// --- 메인 핸들러 ---

Deno.serve(async (req: Request): Promise<Response> => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest();
  }

  const headers = getCorsHeaders(req);

  // POST만 허용
  if (req.method !== 'POST') {
    const errorResponse: PromotionErrorResponse = {
      success: false,
      error: PromotionErrorCode.INVALID_REQUEST,
      message: 'Only POST method is allowed',
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. 요청 파싱 및 검증
    const body = await req.json();
    const { promotionCode, amount, userKey } = validateRequest(body);

    // 2. 중복 지급 확인 (서버 측)
    const alreadyClaimed = await checkAlreadyClaimed(userKey, promotionCode);
    if (alreadyClaimed) {
      throw new Error(
        `${PromotionErrorCode.ALREADY_CLAIMED}: Promotion already claimed for this user`
      );
    }

    // 3. DB에 pending 기록 생성
    await createPromotionRecord(userKey, promotionCode, amount);

    // 4. 프로모션 3단계 플로우 실행 (mTLS)
    const result = await executePromotionFlow(promotionCode, amount, userKey);

    // 5. 결과에 따라 DB 업데이트
    if (result.status === 'SUCCESS') {
      await updatePromotionRecord(userKey, promotionCode, {
        status: 'success',
        promotion_key: result.key,
      });

      const successResponse: PromotionSuccessResponse = {
        success: true,
        key: result.key,
      };

      return new Response(JSON.stringify(successResponse), {
        status: 200,
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
    }

    // FAILED
    await updatePromotionRecord(userKey, promotionCode, {
      status: 'failed',
      promotion_key: result.key,
      error_code: 'PROMOTION_FAILED',
      error_message: `Execution result: ${result.status}`,
    });

    throw new Error(
      `${PromotionErrorCode.PROMOTION_FAILED}: Promotion execution failed (status: ${result.status})`
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const status = getHttpStatusForError(errorMessage);
    const errorCode = extractErrorCode(errorMessage);
    const message = extractErrorMessage(errorMessage);

    // 민감 정보 필터링
    const safeMessage = errorCode === PromotionErrorCode.SERVER_CONFIG_ERROR
      ? 'Server configuration error'
      : message;

    console.error(`[promotion] Error: ${errorCode} - ${message}`);

    const errorResponse: PromotionErrorResponse = {
      success: false,
      error: errorCode,
      message: safeMessage,
    };

    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
});
