/**
 * Supabase Edge Function auth - 공유 타입 정의
 */

// --- 클라이언트 요청/응답 ---

export interface AuthRequest {
  authorizationCode: string;
}

export interface AuthSuccessResponse {
  userKey: string;
  expiresAt: string;
}

export interface AuthErrorResponse {
  error: string;
  message: string;
}

// --- 토스 파트너 API ---

export interface TossGenerateTokenRequest {
  authorizationCode: string;
}

export interface TossGenerateTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface TossApiErrorResponse {
  errorCode: string;
  message: string;
}

// --- JWT Payload (accessToken 디코딩용) ---

export interface AccessTokenPayload {
  sub?: string;
  userKey?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

// --- DB ---

export interface UserSession {
  id: string;
  user_key: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  created_at: string;
  updated_at: string;
}

// --- 에러 코드 ---

export const ErrorCode = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_AUTH_CODE: 'INVALID_AUTH_CODE',
  EXPIRED_AUTH_CODE: 'EXPIRED_AUTH_CODE',
  SERVER_AUTH_FAILED: 'SERVER_AUTH_FAILED',
  TOSS_SERVER_ERROR: 'TOSS_SERVER_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TOKEN_DECODE_FAILED: 'TOKEN_DECODE_FAILED',
  SERVER_CONFIG_ERROR: 'SERVER_CONFIG_ERROR',
  DB_ERROR: 'DB_ERROR',
} as const;

export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];
