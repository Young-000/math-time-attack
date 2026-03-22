/**
 * 앱인토스 비게임 인증 - 유저 식별자 관리
 *
 * appLogin() -> Supabase Edge Function(mTLS) -> 토스 파트너 API
 * -> userKey 추출 -> 클라이언트 캐싱
 *
 * Token refresh flow:
 * 1. 캐시 유효 → 즉시 반환
 * 2. 캐시 만료 + refreshToken 존재 → refreshUserToken() 시도
 * 3. refresh 실패 → 전체 appLogin() fallback
 */

import { appLogin, closeView } from '@apps-in-toss/web-framework';

// --- 상수 ---

const USER_KEY_CACHE = 'math-attack-user-key';
const USER_KEY_EXPIRY = 'math-attack-user-key-expiry';
const REFRESH_TOKEN_CACHE = 'math-attack-refresh-token';
const LOCAL_USER_ID_KEY = 'math-time-attack-local-user-id';
const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// 캐시 TTL: AccessToken 만료보다 약간 짧게 (50분, 토큰 유효기간 60분 기준)
const CACHE_TTL_MS = 50 * 60 * 1000;

// Edge Function 요청 타임아웃 (5초)
const EDGE_FUNCTION_TIMEOUT_MS = 5_000;

let cachedUserKey: string | null = null;
let lastAuthError: string | null = null;

// --- 환경 감지 ---

/**
 * 앱인토스 환경 판별 (appLogin 기반)
 * isSupported는 런타임에 존재하지만 SDK 타입 정의에 없어서 타입 캐스팅 사용
 */
export function isAppsInTossEnvironment(): boolean {
  try {
    const fn = appLogin as unknown as { isSupported?: () => boolean };
    return typeof fn.isSupported === 'function' && fn.isSupported();
  } catch {
    return false;
  }
}

// --- 캐시 관리 ---

function getCachedUserKey(): string | null {
  if (cachedUserKey) return cachedUserKey;
  try {
    const key = localStorage.getItem(USER_KEY_CACHE);
    const expiry = localStorage.getItem(USER_KEY_EXPIRY);
    if (key && expiry && Date.now() < Number(expiry)) {
      cachedUserKey = key;
      return key;
    }
    // 만료된 캐시 정리
    localStorage.removeItem(USER_KEY_CACHE);
    localStorage.removeItem(USER_KEY_EXPIRY);
  } catch {
    // localStorage 접근 실패
  }
  return null;
}

function setCachedUserKey(userKey: string, ttlMs: number = CACHE_TTL_MS): void {
  cachedUserKey = userKey;
  try {
    localStorage.setItem(USER_KEY_CACHE, userKey);
    localStorage.setItem(USER_KEY_EXPIRY, String(Date.now() + ttlMs));
  } catch {
    // localStorage 저장 실패 -- 메모리 캐시만 유지
  }
}

function getCachedRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_CACHE);
  } catch {
    return null;
  }
}

function setCachedRefreshToken(refreshToken: string): void {
  try {
    localStorage.setItem(REFRESH_TOKEN_CACHE, refreshToken);
  } catch {
    // localStorage 저장 실패 — 무시
  }
}

function clearAllCaches(): void {
  cachedUserKey = null;
  try {
    localStorage.removeItem(USER_KEY_CACHE);
    localStorage.removeItem(USER_KEY_EXPIRY);
    localStorage.removeItem(REFRESH_TOKEN_CACHE);
  } catch {
    // localStorage 접근 실패
  }
}

// --- 로컬 ID fallback ---

function getOrCreateLocalUserId(): string {
  try {
    let localId = localStorage.getItem(LOCAL_USER_ID_KEY);
    if (!localId) {
      localId = `local-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      localStorage.setItem(LOCAL_USER_ID_KEY, localId);
    }
    return localId;
  } catch {
    return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

function fallbackToLocalId(): string {
  const localId = getOrCreateLocalUserId();
  cachedUserKey = localId;
  return localId;
}

// --- Edge Function 통신 ---

type AuthResponse = {
  readonly userKey: string;
  readonly expiresAt: string;
  readonly refreshToken?: string;
};

type AuthErrorResponse = {
  readonly error: string;
  readonly message: string;
};

/**
 * Edge Function에 fetch 요청을 보내는 공통 헬퍼.
 * AbortController로 5초 타임아웃을 적용한다.
 */
async function callEdgeFunction(body: Record<string, string>): Promise<AuthResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EDGE_FUNCTION_TIMEOUT_MS);

  try {
    const response = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const error = await response.json() as AuthErrorResponse;
      throw new Error(error.error ?? `HTTP ${response.status}`);
    }

    return await response.json() as AuthResponse;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Edge Function 타임아웃 (${EDGE_FUNCTION_TIMEOUT_MS}ms)`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * authorizationCode를 Edge Function에 전송하여 userKey를 받아온다.
 */
async function exchangeAuthCode(authorizationCode: string): Promise<string> {
  const data = await callEdgeFunction({ authorizationCode });

  // refreshToken이 반환되면 캐싱
  if (data.refreshToken) {
    setCachedRefreshToken(data.refreshToken);
  }

  return data.userKey;
}

/**
 * refreshToken으로 새 accessToken(userKey)을 갱신한다.
 * 실패 시 null을 반환하여 호출부에서 full login fallback을 진행한다.
 */
async function refreshUserToken(): Promise<string | null> {
  const refreshToken = getCachedRefreshToken();
  if (!refreshToken) return null;

  try {
    const data = await callEdgeFunction({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    });

    // 새 refreshToken이 반환되면 갱신
    if (data.refreshToken) {
      setCachedRefreshToken(data.refreshToken);
    }

    return data.userKey;
  } catch (err) {
    console.warn('[userIdentity] refreshToken 갱신 실패:', err);
    // refresh 실패 시 모든 캐시 제거
    clearAllCaches();
    return null;
  }
}

// --- 메인 초기화 ---

/**
 * 앱 시작 시 호출 -- userKey 조회 후 캐싱
 *
 * 1. 메모리/localStorage 캐시 확인 (TTL 기반)
 * 2. 캐시 만료 시 refreshToken으로 갱신 시도
 * 3. AIT 환경: appLogin() -> Edge Function -> userKey
 * 4. 비AIT 환경: localStorage fallback
 */
export async function initializeUserIdentity(): Promise<string> {
  // 개발 모드 mock 지원
  if (import.meta.env.DEV && import.meta.env.VITE_MOCK_USER_KEY) {
    const mockKey = import.meta.env.VITE_MOCK_USER_KEY as string;
    setCachedUserKey(mockKey);
    return mockKey;
  }

  // 1. 메모리/localStorage 캐시 확인
  const cached = getCachedUserKey();
  if (cached) return cached;

  // 2. refreshToken으로 갱신 시도
  const refreshedKey = await refreshUserToken();
  if (refreshedKey) {
    setCachedUserKey(refreshedKey);
    return refreshedKey;
  }

  // 3. AIT 환경이면 appLogin 플로우
  if (isAppsInTossEnvironment()) {
    try {
      const loginResult = await appLogin();

      // SDK 미지원 (앱 버전 낮음)
      if (!loginResult) {
        console.warn('[userIdentity] appLogin 미지원 앱 버전');
        return fallbackToLocalId();
      }

      const { authorizationCode } = loginResult;

      // Edge Function으로 토큰 교환
      const userKey = await exchangeAuthCode(authorizationCode);
      setCachedUserKey(userKey);
      return userKey;
    } catch (err) {
      const errorMsg = err instanceof Error
        ? `${err.name}: ${err.message}`
        : String(err);
      console.warn('[userIdentity] appLogin 플로우 실패:', errorMsg);
      lastAuthError = errorMsg;

      // AIT 가이드라인: 약관 닫기/로그인 취소 시 미니앱 종료
      try { closeView(); } catch { /* ignore */ }
      throw err;
    }
  }

  // 4. 비AIT 환경
  return fallbackToLocalId();
}

// --- Public API (하위 호환) ---

/**
 * 현재 사용자 ID (async getter)
 * initializeUserIdentity가 먼저 호출된 경우 캐시 반환, 아니면 초기화 실행
 */
export async function getUserId(): Promise<string> {
  if (cachedUserKey) return cachedUserKey;
  return initializeUserIdentity();
}

/**
 * 현재 캐싱된 userKey (sync, 없으면 null)
 */
export function getCachedUserId(): string | null {
  return cachedUserKey;
}

/**
 * 마지막 appLogin 에러 메시지 (디버깅용)
 */
export function getLastAuthError(): string | null {
  return lastAuthError;
}

/**
 * 캐시 초기화 (테스트/로그아웃용)
 */
export function resetUserIdentityCache(): void {
  cachedUserKey = null;
  lastAuthError = null;
  clearAllCaches();
}

/**
 * UNLINK / WITHDRAWAL referrer 체크
 * 토스앱 설정에서 연결 해제 시 URL에 referrer 파라미터가 전달됨
 * - UNLINK: 로그인 연결 해제
 * - WITHDRAWAL_TERMS: 약관 철회
 * - WITHDRAWAL_TOSS: 토스 탈퇴
 */
export function checkUnlinkReferrer(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const referrer = params.get('referrer');
    return referrer === 'UNLINK' || referrer === 'WITHDRAWAL_TERMS' || referrer === 'WITHDRAWAL_TOSS';
  } catch {
    return false;
  }
}

/**
 * 앱에서 사용하는 모든 localStorage 키 목록.
 * UNLINK 시 전부 삭제하여 유저 데이터가 남지 않도록 한다.
 */
const ALL_APP_STORAGE_KEYS = [
  'math-attack-user-key',
  'math-attack-user-key-expiry',
  'math-attack-refresh-token',
  'math-time-attack-local-user-id',
  'math-time-attack-records-v2',
  'math-time-attack-nickname',
  'math-attack-promo-claimed',
  'math-time-attack-hearts',
  'math-attack-daily-bonus',
  'math-attack-achievements',
  'math-time-attack-streak',
  'math-attack-track-missions',
  'math-attack-track-counters',
  'math-attack-daily-login',
  'math-attack-star-balance',
  'math-attack-star-history',
  'ad-interstitial-freq',
  'ad-rewarded-freq',
] as const;

/**
 * 앱의 모든 유저 데이터를 삭제한다.
 * 토스 로그인 연결 해제(UNLINK) 시 호출.
 */
export function clearAllUserData(): void {
  cachedUserKey = null;
  lastAuthError = null;
  try {
    for (const key of ALL_APP_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    // 타임어택 최고기록 키 (동적 패턴: math-time-attack-timeattack-*)
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('math-time-attack-timeattack-') || key.startsWith('daily-challenge'))) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // localStorage 접근 실패
  }
}
