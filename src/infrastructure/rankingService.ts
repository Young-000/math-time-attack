/**
 * Apps-in-Toss 랭킹 시스템 연동 서비스
 * Toss 앱 내 랭킹 시스템과 통합
 */

import type { DifficultyType, OperationType, RankingItem, GameModeKey } from '@domain/entities';
import { createGameModeKey } from '@domain/entities';
import { getRankings as getSupabaseRankings, getMyRank as getSupabaseMyRank } from '@data/recordService';

// Apps-in-Toss ODL API 타입 (앱인토스 프레임워크에서 제공)
declare global {
  interface Window {
    ODL?: {
      getUserId: () => Promise<string | null>;
      getUserInfo: () => Promise<{ id: string; nickname?: string } | null>;
    };
  }
}

/**
 * 현재 사용자 ODL ID 가져오기
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    // Apps-in-Toss 환경인지 확인
    if (typeof window !== 'undefined' && window.ODL) {
      return await window.ODL.getUserId();
    }
    return null;
  } catch (err) {
    console.warn('Failed to get user ID from ODL:', err);
    return null;
  }
}

/**
 * 현재 사용자 정보 가져오기
 */
export async function getCurrentUserInfo(): Promise<{ id: string; nickname?: string } | null> {
  try {
    if (typeof window !== 'undefined' && window.ODL) {
      return await window.ODL.getUserInfo();
    }
    return null;
  } catch (err) {
    console.warn('Failed to get user info from ODL:', err);
    return null;
  }
}

/**
 * Apps-in-Toss 환경인지 확인
 */
export function isAppsInTossEnvironment(): boolean {
  return typeof window !== 'undefined' && Boolean(window.ODL);
}

/**
 * 랭킹 데이터 가져오기 (Supabase 연동)
 */
export async function fetchRankings(
  difficulty: DifficultyType,
  operation: OperationType,
  limit: number = 10
): Promise<RankingItem[]> {
  return getSupabaseRankings(difficulty, operation, limit);
}

/**
 * 내 순위 가져오기
 */
export async function fetchMyRank(
  difficulty: DifficultyType,
  operation: OperationType
): Promise<number | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  return getSupabaseMyRank(userId, difficulty, operation);
}

/**
 * 랭킹 컨텍스트 타입
 */
export interface RankingContext {
  rankings: RankingItem[];
  myRank: number | null;
  isLoading: boolean;
  error: string | null;
  gameMode: GameModeKey;
}

/**
 * 랭킹 데이터 전체 조회
 */
export async function fetchRankingContext(
  difficulty: DifficultyType,
  operation: OperationType
): Promise<RankingContext> {
  const gameMode = createGameModeKey(difficulty, operation);

  try {
    const [rankings, myRank] = await Promise.all([
      fetchRankings(difficulty, operation),
      fetchMyRank(difficulty, operation),
    ]);

    return {
      rankings,
      myRank,
      isLoading: false,
      error: null,
      gameMode,
    };
  } catch (err) {
    return {
      rankings: [],
      myRank: null,
      isLoading: false,
      error: err instanceof Error ? err.message : 'Failed to fetch rankings',
      gameMode,
    };
  }
}

/**
 * 랭킹 업데이트 알림 (선택적 - Toss 알림 시스템 연동)
 */
export async function notifyRankingUpdate(
  newRank: number,
  difficulty: DifficultyType,
  operation: OperationType
): Promise<void> {
  // Apps-in-Toss 환경에서만 알림 표시
  if (!isAppsInTossEnvironment()) return;

  // 향후 Toss 알림 시스템과 연동 가능
  console.log(`New ranking: ${newRank} for ${difficulty}/${operation}`);
}
