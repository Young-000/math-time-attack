/**
 * 앱인토스 비게임 인증 - 유저 식별자 관리
 *
 * appLogin() -> Supabase Edge Function(mTLS) -> 토스 파트너 API
 * -> userKey 추출 -> 클라이언트 캐싱
 *
 * 기존 getUserKeyForGame() 기반에서 appLogin() 기반으로 전환.
 * 비게임 카테고리에서는 getUserKeyForGame이 INVALID_CATEGORY를 반환하므로
 * appLogin + 서버 토큰 교환 방식을 사용한다.
 */

import { appLogin } from '@apps-in-toss/web-framework';

// --- 상수 ---

const USER_KEY_CACHE = 'math-attack-user-key';
const USER_KEY_EXPIRY = 'math-attack-user-key-expiry';
const LOCAL_USER_ID_KEY = 'math-time-attack-local-user-id';
const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth`;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// 캐시 TTL: AccessToken 만료보다 약간 짧게 (50분, 토큰 유효기간 60분 기준)
const CACHE_TTL_MS = 50 * 60 * 1000;

let cachedUserKey: string | null = null;

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

interface AuthResponse {
  userKey: string;
  expiresAt: string;
}

interface AuthErrorResponse {
  error: string;
  message: string;
}

/**
 * authorizationCode를 Edge Function에 전송하여 userKey를 받아온다.
 */
async function exchangeAuthCode(authorizationCode: string): Promise<string> {
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ authorizationCode }),
  });

  if (!response.ok) {
    const error = await response.json() as AuthErrorResponse;
    throw new Error(error.error ?? `HTTP ${response.status}`);
  }

  const data = await response.json() as AuthResponse;
  return data.userKey;
}

// --- 메인 초기화 ---

/**
 * 앱 시작 시 호출 -- userKey 조회 후 캐싱
 *
 * 1. 메모리/localStorage 캐시 확인 (TTL 기반)
 * 2. AIT 환경: appLogin() -> Edge Function -> userKey
 * 3. 비AIT 환경: localStorage fallback
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

  // 2. AIT 환경이면 appLogin 플로우
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
      console.warn('[userIdentity] appLogin 플로우 실패:', err);
      return fallbackToLocalId();
    }
  }

  // 3. 비AIT 환경
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
 * 캐시 초기화 (테스트/로그아웃용)
 */
export function resetUserIdentityCache(): void {
  cachedUserKey = null;
  try {
    localStorage.removeItem(USER_KEY_CACHE);
    localStorage.removeItem(USER_KEY_EXPIRY);
  } catch {
    // localStorage 접근 실패
  }
}
