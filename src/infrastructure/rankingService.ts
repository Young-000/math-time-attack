/**
 * 랭킹 시스템 서비스
 *
 * ## userKey 기반 전환 (Cycle 3)
 *
 * 기존 getUserKeyForGame() hash 기반 odl_id에서
 * appLogin() 기반 토스 userKey로 전환되었다.
 *
 * - 컬럼명 `odl_id` 는 유지 (DB 마이그레이션 불필요)
 * - 저장되는 값이 hash → appLogin userKey로 변경됨
 * - 기존 hash 기반 데이터는 레거시로 보존 (조회 시 혼재 가능)
 * - userKey는 `getUserId()` (userIdentity.ts) 통해 획득
 */

import type { DifficultyType, OperationType, RankingItem, GameModeKey } from '@domain/entities';
import { createGameModeKey } from '@domain/entities';
import { getRankings as getSupabaseRankings, getMyRank as getSupabaseMyRank } from '@data/recordService';
import { getUserId, isAppsInTossEnvironment } from '@infrastructure/userIdentity';

/**
 * 현재 사용자 ID 가져오기 (하위 호환 — userIdentity로 위임)
 *
 * 반환값:
 * - AIT 환경: appLogin userKey (토스 유저 고유키)
 * - 비AIT/fallback: localStorage 기반 local-{timestamp}-{random}
 */
export async function getCurrentUserId(): Promise<string | null> {
  return getUserId();
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
  _newRank: number,
  _difficulty: DifficultyType,
  _operation: OperationType
): Promise<void> {
  if (!isAppsInTossEnvironment()) return;
}
