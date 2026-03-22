/**
 * Supabase Edge Function: auth
 *
 * appLogin() authorizationCode를 받아 토스 파트너 API에서
 * mTLS로 토큰을 발급받고, userKey를 반환한다.
 *
 * POST /functions/v1/auth
 * Body: { authorizationCode: string }
 * Response: { userKey: string, expiresAt: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, handleCorsPreflightRequest, getCorsHeaders } from './_shared/cors.ts';
import { generateToken, refreshTokenByRefreshToken } from './_shared/toss-api-client.ts';
import { ErrorCode } from './_shared/types.ts';
import type { AuthRequest, AuthSuccessResponse, AuthErrorResponse } from './_shared/types.ts';

// --- 요청 검증 ---

function validateRequest(body: unknown): AuthRequest {
  if (!body || typeof body !== 'object') {
    throw new Error(`${ErrorCode.INVALID_REQUEST}: Request body is required`);
  }

  const { authorizationCode } = body as Record<string, unknown>;

  if (!authorizationCode || typeof authorizationCode !== 'string') {
    throw new Error(
      `${ErrorCode.INVALID_REQUEST}: authorizationCode is required and must be a string`
    );
  }

  if (authorizationCode.trim().length === 0) {
    throw new Error(
      `${ErrorCode.INVALID_REQUEST}: authorizationCode must not be empty`
    );
  }

  return { authorizationCode: authorizationCode.trim() };
}

// --- 토큰 저장 (Supabase DB) ---

async function storeUserSession(
  userKey: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
): Promise<void> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[auth] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    // DB 저장 실패해도 userKey 반환은 가능하므로 throw하지 않음
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: 'math_attack' },
  });

  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

  const { error } = await supabase
    .from('user_sessions')
    .upsert(
      {
        user_key: userKey,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_key' }
    );

  if (error) {
    console.error('[auth] Failed to store user session:', error.message);
    // DB 저장 실패해도 userKey 반환은 가능
  }
}

// --- 에러 코드 -> HTTP 상태 코드 매핑 ---

function getHttpStatusForError(errorMessage: string): number {
  if (errorMessage.startsWith(ErrorCode.INVALID_REQUEST)) return 400;
  if (errorMessage.startsWith(ErrorCode.INVALID_AUTH_CODE)) return 400;
  if (errorMessage.startsWith(ErrorCode.EXPIRED_AUTH_CODE)) return 400;
  if (errorMessage.startsWith(ErrorCode.SERVER_AUTH_FAILED)) return 502;
  if (errorMessage.startsWith(ErrorCode.TOSS_SERVER_ERROR)) return 502;
  if (errorMessage.startsWith(ErrorCode.NETWORK_ERROR)) return 502;
  if (errorMessage.startsWith(ErrorCode.TOKEN_DECODE_FAILED)) return 502;
  if (errorMessage.startsWith(ErrorCode.SERVER_CONFIG_ERROR)) return 500;
  if (errorMessage.startsWith(ErrorCode.DB_ERROR)) return 500;
  return 500;
}

function extractErrorCode(errorMessage: string): string {
  // 에러 메시지에서 에러 코드 부분만 추출 (콜론 앞)
  const colonIndex = errorMessage.indexOf(':');
  if (colonIndex > 0) {
    return errorMessage.substring(0, colonIndex).trim();
  }
  return 'UNKNOWN_ERROR';
}

function extractErrorMessage(errorMessage: string): string {
  // 에러 메시지에서 설명 부분만 추출 (콜론 뒤)
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
    const errorResponse: AuthErrorResponse = {
      error: ErrorCode.INVALID_REQUEST,
      message: 'Only POST method is allowed',
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 405,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. 요청 파싱
    const body = await req.json();

    // grant_type: 'refresh_token' 분기 처리
    const isRefresh = body && typeof body === 'object'
      && body.grant_type === 'refresh_token'
      && typeof body.refresh_token === 'string';

    let result;
    if (isRefresh) {
      // Refresh token flow
      result = await refreshTokenByRefreshToken(body.refresh_token as string);
    } else {
      // Authorization code flow
      const { authorizationCode } = validateRequest(body);
      result = await generateToken(authorizationCode);
    }

    // 3. 토큰을 서버 측에 저장
    await storeUserSession(
      result.userKey,
      result.accessToken,
      result.refreshToken,
      result.expiresIn,
    );

    // 4. 클라이언트에 userKey + refreshToken 반환
    const expiresAt = new Date(Date.now() + result.expiresIn * 1000).toISOString();
    const successResponse: AuthSuccessResponse = {
      userKey: result.userKey,
      expiresAt,
      refreshToken: result.refreshToken,
    };

    return new Response(JSON.stringify(successResponse), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    const status = getHttpStatusForError(errorMessage);
    const errorCode = extractErrorCode(errorMessage);
    const message = extractErrorMessage(errorMessage);

    // 민감 정보 필터링: SERVER_CONFIG_ERROR의 경우 상세 메시지 숨김
    const safeMessage = errorCode === ErrorCode.SERVER_CONFIG_ERROR
      ? 'Server configuration error'
      : message;

    console.error(`[auth] Error: ${errorCode} - ${message}`);

    const errorResponse: AuthErrorResponse = {
      error: errorCode,
      message: safeMessage,
    };

    return new Response(JSON.stringify(errorResponse), {
      status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }
});
