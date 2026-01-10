/**
 * Record Service
 * 최고 기록 저장/조회 (localStorage + Supabase 하이브리드)
 */

import type {
  DifficultyType,
  OperationType,
  BestRecord,
  GameRecord,
  RankingItem,
} from '@domain/entities';
import { Operation, createGameModeKey } from '@domain/entities';
import { getSupabaseClient, isSupabaseConfigured } from '../infrastructure/supabase';

export const STORAGE_KEY = 'math-time-attack-records-v2';

interface StoredRecordItem {
  time: number;
  achievedAt: string;
  operation: OperationType;
}

interface StoredRecords {
  [key: string]: StoredRecordItem;
}

// ============================================
// LocalStorage 기반 함수 (오프라인/폴백용)
// ============================================

/**
 * localStorage에서 전체 기록 조회
 */
function getStoredRecords(): StoredRecords {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * localStorage에 기록 저장
 */
function setStoredRecords(records: StoredRecords): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch {
    console.warn('Failed to save records to localStorage');
    return false;
  }
}

/**
 * 특정 모드의 최고 기록 조회 (로컬)
 */
export function getBestRecord(
  difficulty: DifficultyType,
  operation: OperationType = Operation.MULTIPLICATION
): BestRecord | null {
  const records = getStoredRecords();
  const key = createGameModeKey(difficulty, operation);
  const record = records[key];

  if (!record) return null;

  return {
    difficulty,
    operation: record.operation,
    time: record.time,
    achievedAt: record.achievedAt,
  };
}

/**
 * 최고 기록 저장 (기존 기록보다 좋을 때만, 로컬)
 */
export function saveBestRecord(
  difficulty: DifficultyType,
  time: number,
  operation: OperationType = Operation.MULTIPLICATION
): boolean {
  const existing = getBestRecord(difficulty, operation);

  // 기존 기록이 있고, 새 기록이 더 느리면 저장하지 않음
  if (existing && time >= existing.time) {
    return false;
  }

  const records = getStoredRecords();
  const key = createGameModeKey(difficulty, operation);
  records[key] = {
    time,
    operation,
    achievedAt: new Date().toISOString(),
  };
  setStoredRecords(records);

  return true;
}

/**
 * 신기록 여부 확인
 */
export function isNewRecord(
  difficulty: DifficultyType,
  time: number,
  operation: OperationType = Operation.MULTIPLICATION
): boolean {
  const existing = getBestRecord(difficulty, operation);

  if (!existing) return true;

  return time < existing.time;
}

/**
 * 모든 기록 삭제
 */
export function clearAllRecords(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ============================================
// Supabase 연동 함수 (온라인/랭킹용)
// ============================================

/**
 * 게임 기록을 Supabase에 저장
 */
export async function saveGameRecordToServer(
  record: Omit<GameRecord, 'id'>
): Promise<GameRecord | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase not configured, skipping server save');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('game_records')
      .insert({
        odl_id: record.odl_id || 'anonymous',
        difficulty: record.difficulty,
        operation: record.operation,
        time: record.time,
        played_at: record.played_at,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to save record to server:', error);
      return null;
    }

    return data as GameRecord;
  } catch (err) {
    console.error('Error saving record to server:', err);
    return null;
  }
}

/**
 * 특정 모드의 랭킹 조회
 */
export async function getRankings(
  difficulty: DifficultyType,
  operation: OperationType,
  limit: number = 10
): Promise<RankingItem[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase not configured, returning empty rankings');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('game_records')
      .select('odl_id, time, played_at')
      .eq('difficulty', difficulty)
      .eq('operation', operation)
      .order('time', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch rankings:', error);
      return [];
    }

    // 랭킹 번호 부여
    return (data || []).map((item, index) => ({
      rank: index + 1,
      odl_id: item.odl_id,
      time: item.time,
      played_at: item.played_at,
    }));
  } catch (err) {
    console.error('Error fetching rankings:', err);
    return [];
  }
}

/**
 * 내 랭킹 조회
 */
export async function getMyRank(
  odlId: string,
  difficulty: DifficultyType,
  operation: OperationType
): Promise<number | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !odlId) {
    return null;
  }

  try {
    // 내 최고 기록 조회
    const { data: myRecord, error: myError } = await supabase
      .from('game_records')
      .select('time')
      .eq('odl_id', odlId)
      .eq('difficulty', difficulty)
      .eq('operation', operation)
      .order('time', { ascending: true })
      .limit(1)
      .single();

    if (myError || !myRecord) {
      return null;
    }

    // 나보다 빠른 기록 수 조회
    const { count, error: countError } = await supabase
      .from('game_records')
      .select('*', { count: 'exact', head: true })
      .eq('difficulty', difficulty)
      .eq('operation', operation)
      .lt('time', myRecord.time);

    if (countError) {
      return null;
    }

    return (count || 0) + 1;
  } catch (err) {
    console.error('Error getting my rank:', err);
    return null;
  }
}

/**
 * 통합 기록 저장 (로컬 + 서버)
 */
export async function saveRecord(
  difficulty: DifficultyType,
  time: number,
  operation: OperationType = Operation.MULTIPLICATION,
  odlId?: string
): Promise<{ isNewLocalRecord: boolean; serverRecord: GameRecord | null }> {
  // 1. 로컬 저장
  const isNewLocalRecord = saveBestRecord(difficulty, time, operation);

  // 2. 서버 저장 (Supabase가 설정된 경우)
  let serverRecord: GameRecord | null = null;
  if (isSupabaseConfigured()) {
    serverRecord = await saveGameRecordToServer({
      odl_id: odlId,
      difficulty,
      operation,
      time,
      played_at: new Date().toISOString(),
    });
  }

  return { isNewLocalRecord, serverRecord };
}

/**
 * Supabase 연결 상태 확인
 */
export function isOnlineMode(): boolean {
  return isSupabaseConfigured();
}
