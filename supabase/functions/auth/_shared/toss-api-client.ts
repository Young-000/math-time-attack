/**
 * mTLS 토스 파트너 API 클라이언트
 *
 * Supabase Edge Function(Deno 런타임)에서 mTLS 인증서를 사용하여
 * 토스 파트너 API와 통신한다.
 *
 * 환경변수:
 * - TOSS_MTLS_CERT: 클라이언트 인증서 (base64 PEM)
 * - TOSS_MTLS_KEY: 클라이언트 개인키 (base64 PEM)
 * - TOSS_API_BASE_URL: 토스 파트너 API 베이스 URL
 * - TOSS_APP_KEY: 앱 식별 키
 */

import type {
  TossGenerateTokenResponse,
  TossApiErrorResponse,
  AccessTokenPayload,
} from './types.ts';
import { ErrorCode } from './types.ts';

// --- 환경변수 로드 ---

function getRequiredEnv(key: string): string {
  const value = Deno.env.get(key);
  if (!value) {
    throw new Error(`${ErrorCode.SERVER_CONFIG_ERROR}: Missing environment variable: ${key}`);
  }
  return value;
}

// --- base64 PEM 디코딩 ---

function decodePem(encoded: string): string {
  const binaryString = atob(encoded);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// --- mTLS HTTP 클라이언트 ---

/**
 * mTLS fetch wrapper for Toss Partner API
 *
 * Deno.createHttpClient로 mTLS 인증서를 설정하고,
 * 토스 파트너 API에 POST 요청을 보낸다.
 */
async function tossApiFetch(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const certEncoded = getRequiredEnv('TOSS_MTLS_CERT');
  const keyEncoded = getRequiredEnv('TOSS_MTLS_KEY');
  const baseUrl = Deno.env.get('TOSS_API_BASE_URL') ?? 'https://apps-in-toss-api.toss.im';
  const appKey = getRequiredEnv('TOSS_APP_KEY');

  const certPem = decodePem(certEncoded);
  const keyPem = decodePem(keyEncoded);

  // Deno의 Deno.createHttpClient로 mTLS 설정 (CA는 시스템 기본 사용)
  const client = Deno.createHttpClient({
    cert: certPem,
    key: keyPem,
  });

  try {
    return await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': appKey,
      },
      body: JSON.stringify(body),
      // @ts-ignore Deno-specific fetch option
      client,
    });
  } finally {
    client.close();
  }
}

// --- JWT 디코딩 (verify 불필요 -- 서버 내부 처리) ---

function decodeJwtPayload(token: string): AccessTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error(`${ErrorCode.TOKEN_DECODE_FAILED}: Invalid JWT format`);
  }

  // base64url -> base64 -> JSON
  const payload = parts[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
  const decoded = atob(padded);
  return JSON.parse(decoded) as AccessTokenPayload;
}

/**
 * accessToken에서 userKey를 추출한다.
 * JWT payload의 sub 또는 userKey 필드에서 추출.
 */
export function extractUserKeyFromToken(accessToken: string): string {
  const payload = decodeJwtPayload(accessToken);

  // userKey 필드 우선, 없으면 sub 필드
  const userKey = payload.userKey ?? payload.sub;

  if (!userKey || typeof userKey !== 'string') {
    throw new Error(
      `${ErrorCode.TOKEN_DECODE_FAILED}: userKey not found in token payload`
    );
  }

  return userKey;
}

// --- Public API ---

export interface GenerateTokenResult {
  accessToken: string;
  refreshToken: string;
  userKey: string;
  expiresIn: number;
}

/**
 * refreshToken을 사용하여 토스 파트너 API에서 새 토큰을 발급받는다.
 *
 * POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token
 * (refreshToken 방식)
 *
 * @returns accessToken, refreshToken, userKey, expiresIn
 * @throws Error with ErrorCode prefix
 */
export async function refreshTokenByRefreshToken(
  refreshToken: string,
): Promise<GenerateTokenResult> {
  const endpoint = '/api-partner/v1/apps-in-toss/user/oauth2/generate-token';

  let response: Response;
  try {
    response = await tossApiFetch(endpoint, { refreshToken });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message.startsWith(ErrorCode.SERVER_CONFIG_ERROR)) {
      throw err;
    }
    throw new Error(`${ErrorCode.NETWORK_ERROR}: ${message}`);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[auth] Toss refresh error (HTTP ${response.status}):`, errorBody);
    throw new Error(
      `${ErrorCode.TOSS_SERVER_ERROR}: HTTP ${response.status} - ${errorBody}`
    );
  }

  const data = (await response.json()) as TossGenerateTokenResponse;
  const userKey = extractUserKeyFromToken(data.accessToken);

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    userKey,
    expiresIn: data.expiresIn,
  };
}

/**
 * authorizationCode를 사용하여 토스 파트너 API에서 토큰을 발급받는다.
 *
 * POST /api-partner/v1/apps-in-toss/user/oauth2/generate-token
 *
 * @returns accessToken, refreshToken, userKey, expiresIn
 * @throws Error with ErrorCode prefix
 */
export async function generateToken(
  authorizationCode: string,
): Promise<GenerateTokenResult> {
  const endpoint = '/api-partner/v1/apps-in-toss/user/oauth2/generate-token';

  let response: Response;
  try {
    response = await tossApiFetch(endpoint, { authorizationCode });
  } catch (err) {
    // mTLS 또는 네트워크 에러
    const message = err instanceof Error ? err.message : 'Unknown error';

    // SERVER_CONFIG_ERROR는 그대로 전파
    if (message.startsWith(ErrorCode.SERVER_CONFIG_ERROR)) {
      throw err;
    }

    throw new Error(`${ErrorCode.NETWORK_ERROR}: ${message}`);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[auth] Toss API error (HTTP ${response.status}):`, errorBody);

    try {
      const errorJson = JSON.parse(errorBody) as Record<string, unknown>;

      // 토스 API 에러 코드 추출 (두 가지 형식 지원)
      // 형식 1: { errorCode, message } (auth API)
      // 형식 2: { resultType: 'FAIL', error: { errorCode, reason } } (promotion/일반 API)
      let errorCode: string | undefined;
      let errorMessage: string | undefined;

      if (typeof errorJson.errorCode === 'string') {
        errorCode = errorJson.errorCode;
        errorMessage = errorJson.message as string;
      } else if (
        errorJson.resultType === 'FAIL' &&
        errorJson.error &&
        typeof errorJson.error === 'object'
      ) {
        const err = errorJson.error as Record<string, unknown>;
        errorCode = err.errorCode as string;
        errorMessage = err.reason as string;
      }

      // 토스 API 에러 코드 매핑
      if (errorCode === 'INVALID_AUTHORIZATION_CODE') {
        throw new Error(
          `${ErrorCode.INVALID_AUTH_CODE}: ${errorMessage ?? 'Invalid authorization code'}`
        );
      }
      if (errorCode === 'EXPIRED_AUTHORIZATION_CODE') {
        throw new Error(
          `${ErrorCode.EXPIRED_AUTH_CODE}: ${errorMessage ?? 'Expired authorization code'}`
        );
      }

      // 401 = mTLS 인증 실패
      if (response.status === 401) {
        throw new Error(
          `${ErrorCode.SERVER_AUTH_FAILED}: ${errorMessage ?? errorBody}`
        );
      }

      // 기타 서버 에러 (원본 응답 포함)
      throw new Error(
        `${ErrorCode.TOSS_SERVER_ERROR}: [${errorCode ?? 'UNKNOWN'}] ${errorMessage ?? errorBody}`
      );
    } catch (parseErr) {
      // 이미 우리가 던진 에러는 그대로 전파
      if (parseErr instanceof Error) {
        const knownPrefixes = [
          ErrorCode.INVALID_AUTH_CODE,
          ErrorCode.EXPIRED_AUTH_CODE,
          ErrorCode.SERVER_AUTH_FAILED,
          ErrorCode.TOSS_SERVER_ERROR,
        ];
        if (knownPrefixes.some((p) => parseErr.message.startsWith(p))) {
          throw parseErr;
        }
      }

      throw new Error(
        `${ErrorCode.TOSS_SERVER_ERROR}: HTTP ${response.status} - ${errorBody}`
      );
    }
  }

  const data = (await response.json()) as TossGenerateTokenResponse;

  // accessToken에서 userKey 추출
  const userKey = extractUserKeyFromToken(data.accessToken);

  return {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    userKey,
    expiresIn: data.expiresIn,
  };
}
