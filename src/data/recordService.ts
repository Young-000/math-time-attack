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

/**
 * 이번 주 월요일 00:00 (로컬 시간) 반환
 */
function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // 일요일(0)이면 6일 전, 그 외는 day-1일 전
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
  return monday;
}

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
 * 게임 기록을 Supabase에 저장 (public 스키마 RPC wrapper 사용)
 */
export async function saveGameRecordToServer(
  record: Omit<GameRecord, 'id'>,
  nickname?: string
): Promise<GameRecord | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase not configured, skipping server save');
    return null;
  }

  try {
    // public 스키마의 wrapper RPC 함수 사용 (PostgREST 스키마 노출 문제 해결)
    const { data, error } = await supabase
      .schema('public')
      .rpc('insert_game_record', {
        p_odl_id: record.odl_id || 'anonymous',
        p_difficulty: record.difficulty,
        p_operation: record.operation,
        p_time: record.time,
        p_played_at: record.played_at,
        p_nickname: nickname || null,
      });

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
  odlId?: string,
  nickname?: string
): Promise<{ isNewLocalRecord: boolean; serverRecord: GameRecord | null }> {
  // 1. 로컬 저장
  const isNewLocalRecord = saveBestRecord(difficulty, time, operation);

  // 닉네임이 없으면 로컬에서 가져오기
  const finalNickname = nickname || getLocalNickname() || undefined;

  // 2. 서버 저장 (Supabase가 설정된 경우)
  let serverRecord: GameRecord | null = null;
  if (isSupabaseConfigured()) {
    serverRecord = await saveGameRecordToServer({
      odl_id: odlId,
      difficulty,
      operation,
      time,
      played_at: new Date().toISOString(),
    }, finalNickname);
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
const NICKNAME_MAX_LENGTH = 20;

/**
 * 닉네임 sanitize (XSS 방지)
 */
function sanitizeNickname(nickname: string): string {
  return nickname
    .replace(/[<>'"&]/g, '')  // HTML 특수문자 제거
    .trim()
    .slice(0, NICKNAME_MAX_LENGTH);
}

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
    const sanitized = sanitizeNickname(nickname);
    if (!sanitized) return;
    localStorage.setItem(NICKNAME_STORAGE_KEY, sanitized);
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

  const sanitized = sanitizeNickname(nickname);
  if (!sanitized) return false;

  try {
    const { error } = await supabase
      .schema('math_attack')
      .from('user_profiles')
      .upsert({
        odl_id: odlId,
        nickname: sanitized,
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
 * 전체 참가자 수 조회 (RPC 함수 사용으로 최적화)
 */
export async function getTotalPlayers(
  difficulty: DifficultyType,
  operation: OperationType = Operation.MULTIPLICATION
): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return 0;
  }

  try {
    // RPC 함수를 사용하여 서버에서 집계 (public 스키마 wrapper 사용)
    const { data, error } = await supabase
      .schema('public')
      .rpc('get_total_unique_players', {
        p_difficulty: difficulty,
        p_operation: operation,
      });

    if (error || data === null) {
      console.error('Failed to get total players:', error);
      return 0;
    }

    return data as number;
  } catch (err) {
    console.error('Error getting total players:', err);
    return 0;
  }
}

/**
 * 내 순위와 퍼센타일 조회 (RPC 함수 사용으로 최적화)
 * 서버에서 집계하여 데이터 전송량 대폭 감소
 */
export async function getMyRankInfo(
  odlId: string,
  difficulty: DifficultyType,
  operation: OperationType = Operation.MULTIPLICATION
): Promise<{ rank: number | null; percentile: number | null; totalPlayers: number }> {
  const supabase = getSupabaseClient();
  if (!supabase || !odlId) {
    return { rank: null, percentile: null, totalPlayers: 0 };
  }

  try {
    // RPC 함수를 사용하여 서버에서 순위 계산 (public 스키마 wrapper 사용)
    const { data, error } = await supabase
      .schema('public')
      .rpc('get_my_rank_info', {
        p_odl_id: odlId,
        p_difficulty: difficulty,
        p_operation: operation,
      });

    if (error) {
      console.error('Failed to get rank info:', error);
      return { rank: null, percentile: null, totalPlayers: 0 };
    }

    // RPC는 배열을 반환하므로 첫 번째 요소 사용
    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      return { rank: null, percentile: null, totalPlayers: 0 };
    }

    return {
      rank: result.my_rank,
      percentile: result.my_percentile,
      totalPlayers: result.total_players ?? 0,
    };
  } catch (err) {
    console.error('Error getting rank info:', err);
    return { rank: null, percentile: null, totalPlayers: 0 };
  }
}

/**
 * 전체 랭킹 조회 (닉네임 포함, RPC 함수 사용으로 최적화)
 * 서버에서 사용자별 최고 기록만 추출하여 반환
 */
export async function getTopRankings(
  difficulty: DifficultyType,
  operation: OperationType = Operation.MULTIPLICATION,
  limit: number = 100,
  period: 'all' | 'weekly' = 'all'
): Promise<RankingItem[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase not configured, returning empty rankings');
    return [];
  }

  try {
    const params: Record<string, unknown> = {
      p_difficulty: difficulty,
      p_operation: operation,
      p_limit: limit,
    };

    if (period === 'weekly') {
      params.p_since = getWeekStart().toISOString();
    }

    const { data, error } = await supabase
      .schema('public')
      .rpc('get_top_rankings', params);

    if (error) {
      console.error('Failed to fetch top rankings:', error);
      return [];
    }

    // RPC 결과를 RankingItem 형식으로 변환
    return (data || []).map((item: {
      rank: number;
      odl_id: string;
      nickname: string | null;
      best_time: number;
      played_at: string;
    }) => ({
      rank: item.rank,
      odl_id: item.odl_id,
      nickname: item.nickname || undefined,
      time: item.best_time,
      played_at: item.played_at,
    }));
  } catch (err) {
    console.error('Error fetching top rankings:', err);
    return [];
  }
}

// ============================================
// 타임어택 랭킹 함수
// ============================================

/**
 * 타임어택 기록 타입
 */
export interface TimeAttackRankingItem {
  rank: number;
  odl_id: string;
  nickname?: string;
  score: number;
  played_at?: string;
}

/**
 * 타임어택 기록을 Supabase에 저장
 */
export async function saveTimeAttackRecordToServer(
  odlId: string,
  difficulty: DifficultyType,
  score: number,
  wrongCount: number,
  operation: OperationType = Operation.MULTIPLICATION
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase not configured, skipping server save');
    return false;
  }

  try {
    const { error } = await supabase
      .schema('public')
      .rpc('insert_time_attack_record', {
        p_odl_id: odlId || 'anonymous',
        p_difficulty: difficulty,
        p_operation: operation,
        p_score: score,
        p_wrong_count: wrongCount,
        p_played_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Failed to save time attack record:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error saving time attack record:', err);
    return false;
  }
}

/**
 * 타임어택 랭킹 조회 (닉네임 포함)
 */
export async function getTimeAttackRankings(
  difficulty: DifficultyType,
  operation: OperationType = Operation.MULTIPLICATION,
  limit: number = 100,
  period: 'all' | 'weekly' = 'all'
): Promise<TimeAttackRankingItem[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    console.warn('Supabase not configured, returning empty rankings');
    return [];
  }

  try {
    const params: Record<string, unknown> = {
      p_difficulty: difficulty,
      p_operation: operation,
      p_limit: limit,
    };

    if (period === 'weekly') {
      params.p_since = getWeekStart().toISOString();
    }

    const { data, error } = await supabase
      .schema('public')
      .rpc('get_time_attack_rankings', params);

    if (error) {
      console.error('Failed to fetch time attack rankings:', error);
      return [];
    }

    return (data || []).map((item: {
      rank: number;
      odl_id: string;
      nickname: string | null;
      best_score: number;
      played_at: string;
    }) => ({
      rank: item.rank,
      odl_id: item.odl_id,
      nickname: item.nickname || undefined,
      score: item.best_score,
      played_at: item.played_at,
    }));
  } catch (err) {
    console.error('Error fetching time attack rankings:', err);
    return [];
  }
}

/**
 * 내 타임어택 순위 정보 조회
 */
export async function getTimeAttackRankInfo(
  odlId: string,
  difficulty: DifficultyType,
  operation: OperationType = Operation.MULTIPLICATION
): Promise<{ rank: number | null; bestScore: number | null; percentile: number | null; totalPlayers: number }> {
  const supabase = getSupabaseClient();
  if (!supabase || !odlId) {
    return { rank: null, bestScore: null, percentile: null, totalPlayers: 0 };
  }

  try {
    const { data, error } = await supabase
      .schema('public')
      .rpc('get_time_attack_rank_info', {
        p_odl_id: odlId,
        p_difficulty: difficulty,
        p_operation: operation,
      });

    if (error) {
      console.error('Failed to get time attack rank info:', error);
      return { rank: null, bestScore: null, percentile: null, totalPlayers: 0 };
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      return { rank: null, bestScore: null, percentile: null, totalPlayers: 0 };
    }

    return {
      rank: result.my_rank,
      bestScore: result.my_best_score,
      percentile: result.my_percentile,
      totalPlayers: result.total_players ?? 0,
    };
  } catch (err) {
    console.error('Error getting time attack rank info:', err);
    return { rank: null, bestScore: null, percentile: null, totalPlayers: 0 };
  }
}
