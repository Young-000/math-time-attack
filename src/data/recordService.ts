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
      .schema('math_attack')
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
      .schema('math_attack')
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
      .schema('math_attack')
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
      .schema('math_attack')
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

// ============================================
// 닉네임 관리 함수
// ============================================

const NICKNAME_STORAGE_KEY = 'math-time-attack-nickname';

/**
 * 랜덤 닉네임 생성
 */
export function generateRandomNickname(): string {
  const adjectives = ['빠른', '똑똑한', '용감한', '즐거운', '신나는', '멋진', '귀여운', '강한'];
  const nouns = ['계산왕', '수학자', '천재', '플레이어', '도전자', '마스터', '고수', '달인'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const num = Math.floor(Math.random() * 10000);
  return `${adj}${noun}${num}`;
}

/**
 * 로컬에서 닉네임 조회
 */
export function getLocalNickname(): string | null {
  try {
    return localStorage.getItem(NICKNAME_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * 로컬에 닉네임 저장
 */
export function saveLocalNickname(nickname: string): void {
  try {
    localStorage.setItem(NICKNAME_STORAGE_KEY, nickname);
  } catch {
    console.warn('Failed to save nickname to localStorage');
  }
}

/**
 * Supabase에서 닉네임 조회
 */
export async function getServerNickname(odlId: string): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase || !odlId) return null;

  try {
    const { data, error } = await supabase
      .schema('math_attack')
      .from('user_profiles')
      .select('nickname')
      .eq('odl_id', odlId)
      .single();

    if (error || !data) return null;
    return data.nickname;
  } catch {
    return null;
  }
}

/**
 * Supabase에 닉네임 저장/업데이트
 */
export async function saveServerNickname(odlId: string, nickname: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase || !odlId) return false;

  try {
    const { error } = await supabase
      .schema('math_attack')
      .from('user_profiles')
      .upsert({
        odl_id: odlId,
        nickname,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'odl_id',
      });

    if (error) {
      console.error('Failed to save nickname to server:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error saving nickname:', err);
    return false;
  }
}

/**
 * 닉네임 조회 (로컬 → 서버 → 생성)
 */
export async function getNickname(odlId?: string): Promise<string> {
  // 1. 로컬에서 조회
  const localNickname = getLocalNickname();
  if (localNickname) return localNickname;

  // 2. 서버에서 조회
  if (odlId) {
    const serverNickname = await getServerNickname(odlId);
    if (serverNickname) {
      saveLocalNickname(serverNickname);
      return serverNickname;
    }
  }

  // 3. 랜덤 생성
  const newNickname = generateRandomNickname();
  saveLocalNickname(newNickname);
  if (odlId) {
    await saveServerNickname(odlId, newNickname);
  }
  return newNickname;
}

/**
 * 닉네임 변경
 */
export async function updateNickname(nickname: string, odlId?: string): Promise<boolean> {
  // 로컬 저장
  saveLocalNickname(nickname);

  // 서버 저장
  if (odlId && isSupabaseConfigured()) {
    return await saveServerNickname(odlId, nickname);
  }
  return true;
}

/**
 * 전체 랭킹 조회 (닉네임 포함)
 */
export async function getTopRankings(
  difficulty: DifficultyType,
  operation: OperationType = Operation.MULTIPLICATION,
  limit: number = 100
): Promise<RankingItem[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase not configured, returning empty rankings');
    return [];
  }

  try {
    const { data, error } = await supabase
      .schema('math_attack')
      .from('game_records')
      .select('odl_id, time, played_at, nickname')
      .eq('difficulty', difficulty)
      .eq('operation', operation)
      .order('time', { ascending: true })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch top rankings:', error);
      return [];
    }

    // 랭킹 번호 부여 및 중복 제거 (사용자별 최고 기록만)
    const bestByUser = new Map<string, typeof data[0]>();
    for (const item of data || []) {
      const existing = bestByUser.get(item.odl_id);
      if (!existing || item.time < existing.time) {
        bestByUser.set(item.odl_id, item);
      }
    }

    return Array.from(bestByUser.values())
      .sort((a, b) => a.time - b.time)
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        odl_id: item.odl_id,
        nickname: item.nickname || undefined,
        time: item.time,
        played_at: item.played_at,
      }));
  } catch (err) {
    console.error('Error fetching top rankings:', err);
    return [];
  }
}
