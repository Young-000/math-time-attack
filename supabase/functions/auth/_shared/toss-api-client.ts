/**
 * mTLS 토스 파트너 API 클라이언트
 *
 * Supabase Edge Function(Deno 런타임)에서 mTLS 인증서를 사용하여
 * 토스 파트너 API와 통신한다.
 *
 * 환경변수:
 * - TOSS_MTLS_CERT: 클라이언트 인증서 (base64 PEM)
 * - TOSS_MTLS_KEY: 클라이언트 개인키 (base64 PEM)
 * - TOSS_MTLS_CA: CA 인증서 (base64 PEM)
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
  const caEncoded = getRequiredEnv('TOSS_MTLS_CA');
  const baseUrl = Deno.env.get('TOSS_API_BASE_URL') ?? 'https://api-partner.toss.im';
  const appKey = getRequiredEnv('TOSS_APP_KEY');

  const cert = decodePem(certEncoded);
  const key = decodePem(keyEncoded);
  const caCerts = [decodePem(caEncoded)];

  // Deno의 Deno.createHttpClient로 mTLS 설정
  const client = Deno.createHttpClient({
    certChain: cert,
    privateKey: key,
    caCerts,
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

    try {
      const errorJson = JSON.parse(errorBody) as TossApiErrorResponse;

      // 토스 API 에러 코드 매핑
      if (errorJson.errorCode === 'INVALID_AUTHORIZATION_CODE') {
        throw new Error(
          `${ErrorCode.INVALID_AUTH_CODE}: ${errorJson.message}`
        );
      }
      if (errorJson.errorCode === 'EXPIRED_AUTHORIZATION_CODE') {
        throw new Error(
          `${ErrorCode.EXPIRED_AUTH_CODE}: ${errorJson.message}`
        );
      }

      // 401 = mTLS 인증 실패
      if (response.status === 401) {
        throw new Error(
          `${ErrorCode.SERVER_AUTH_FAILED}: ${errorJson.message}`
        );
      }

      // 기타 서버 에러
      throw new Error(
        `${ErrorCode.TOSS_SERVER_ERROR}: [${errorJson.errorCode}] ${errorJson.message}`
      );
    } catch (parseErr) {
      // JSON 파싱 실패 시
      if (parseErr instanceof Error && parseErr.message.startsWith('INVALID_AUTH_CODE')) {
        throw parseErr;
      }
      if (parseErr instanceof Error && parseErr.message.startsWith('EXPIRED_AUTH_CODE')) {
        throw parseErr;
      }
      if (parseErr instanceof Error && parseErr.message.startsWith('SERVER_AUTH_FAILED')) {
        throw parseErr;
      }
      if (parseErr instanceof Error && parseErr.message.startsWith('TOSS_SERVER_ERROR')) {
        throw parseErr;
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
