/**
 * 앱인토스 게임 로그인 - 유저 식별자 관리
 *
 * getUserKeyForGame()을 래핑하여 hash 캐싱 + localStorage fallback 제공.
 * 프로모션(grantPromotionRewardForGame)은 이 hash가 내부적으로 필요.
 */

import { getUserKeyForGame } from '@apps-in-toss/web-framework';

const CACHE_KEY = 'math-attack-user-hash';
const LOCAL_USER_ID_KEY = 'math-time-attack-local-user-id';

let cachedHash: string | null = null;

/**
 * 앱인토스 환경 판별
 * isSupported는 런타임에 존재하지만 SDK 타입 정의에 없어서 optional chaining 사용
 */
export function isAppsInTossEnvironment(): boolean {
  try {
    const fn = getUserKeyForGame as unknown as { isSupported?: () => boolean };
    return typeof fn.isSupported === 'function' && fn.isSupported();
  } catch {
    return false;
  }
}

/**
 * 로컬 사용자 ID 생성 또는 조회 (비-AIT 환경용)
 */
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

/**
 * 앱 시작 시 호출 — hash 조회 후 캐싱
 * AIT 환경이 아니면 localStorage fallback 사용
 */
export async function initializeUserIdentity(): Promise<string> {
  if (cachedHash) return cachedHash;

  // localStorage 캐시 먼저 확인
  try {
    const stored = localStorage.getItem(CACHE_KEY);
    if (stored) {
      cachedHash = stored;
      return stored;
    }
  } catch {
    // localStorage 실패 무시
  }

  // AIT 환경이면 getUserKeyForGame 호출
  if (isAppsInTossEnvironment()) {
    try {
      const result = await getUserKeyForGame();

      if (!result) {
        console.warn('[userIdentity] 지원하지 않는 앱 버전');
        return fallbackToLocalId();
      }
      if (result === 'INVALID_CATEGORY') {
        console.warn('[userIdentity] 게임 카테고리가 아닌 미니앱');
        return fallbackToLocalId();
      }
      if (result === 'ERROR') {
        console.warn('[userIdentity] getUserKeyForGame 오류');
        return fallbackToLocalId();
      }
      if (result.type === 'HASH') {
        cachedHash = result.hash;
        try {
          localStorage.setItem(CACHE_KEY, result.hash);
        } catch {
          // localStorage 저장 실패 무시
        }
        return result.hash;
      }

      console.warn('[userIdentity] 알 수 없는 반환값:', result);
      return fallbackToLocalId();
    } catch (err) {
      console.warn('[userIdentity] getUserKeyForGame 실패:', err);
      return fallbackToLocalId();
    }
  }

  return fallbackToLocalId();
}

function fallbackToLocalId(): string {
  const localId = getOrCreateLocalUserId();
  cachedHash = localId;
  return localId;
}

/**
 * 현재 사용자 ID (async getter)
 * initializeUserIdentity가 먼저 호출된 경우 캐시 반환, 아니면 초기화 실행
 */
export async function getUserId(): Promise<string> {
  if (cachedHash) return cachedHash;
  return initializeUserIdentity();
}

/**
 * 현재 캐싱된 hash (sync, 없으면 null)
 */
export function getCachedUserId(): string | null {
  return cachedHash;
}

/**
 * 캐시 초기화 (테스트용)
 */
export function resetUserIdentityCache(): void {
  cachedHash = null;
}
