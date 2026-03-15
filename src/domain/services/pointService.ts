/**
 * 내부 포인트("별") 서비스
 * Supabase DB 기반 포인트 잔액/내역 관리
 *
 * NOTE: user_points, point_transactions 테이블은 database.types.ts에
 * 아직 추가되지 않았으므로, 타입 단언(as unknown as ...)을 사용한다.
 * 마이그레이션 적용 후 `supabase gen types`로 타입 재생성하면 제거 가능.
 */

import { getSupabaseClient } from '@infrastructure/supabase';
import { GAME_COMPLETE_STARS, ROUND_BONUS_STARS, REWARDED_AD_STARS, DAILY_LOGIN_STARS } from '@constants/points';

// --- 타입 ---

export type TransactionType =
  | 'game_complete'
  | 'round_bonus'
  | 'rewarded_ad'
  | 'mission'
  | 'daily_login'
  | 'exchange'
  | 'admin';

export type PointTransaction = {
  id: string;
  amount: number;
  type: TransactionType;
  description: string | null;
  created_at: string;
};

export type PointBalance = {
  balance: number;
  totalEarned: number;
  totalSpent: number;
};

// DB 행 타입 (database.types.ts 미반영 전 임시)
type UserPointsRow = {
  id: string;
  user_key: string;
  balance: number;
  total_earned: number;
  total_spent: number;
  created_at: string;
  updated_at: string;
};

type PointTransactionRow = {
  id: string;
  user_key: string;
  amount: number;
  type: string;
  description: string | null;
  reference_id: string | null;
  created_at: string;
};

// --- 헬퍼: 타입 미등록 테이블 쿼리 ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedQueryBuilder = any;

function queryUserPoints(): UntypedQueryBuilder | null {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  // 타입 미등록 테이블 접근을 위해 unknown 경유 캐스팅
  return (supabase as unknown as { from: (table: string) => UntypedQueryBuilder })
    .from('user_points');
}

function queryPointTransactions(): UntypedQueryBuilder | null {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  return (supabase as unknown as { from: (table: string) => UntypedQueryBuilder })
    .from('point_transactions');
}

// --- 잔액 조회 ---

export async function getPointBalance(userKey: string): Promise<PointBalance> {
  const query = queryUserPoints();
  if (!query) return { balance: 0, totalEarned: 0, totalSpent: 0 };

  const { data, error } = await query
    .select('balance, total_earned, total_spent')
    .eq('user_key', userKey)
    .maybeSingle() as { data: UserPointsRow | null; error: { message: string } | null };

  if (error) throw new Error(`포인트 조회 실패: ${error.message}`);

  return {
    balance: data?.balance ?? 0,
    totalEarned: data?.total_earned ?? 0,
    totalSpent: data?.total_spent ?? 0,
  };
}

// --- 포인트 적립 ---

export async function earnPoints(
  userKey: string,
  amount: number,
  type: TransactionType,
  description?: string,
  referenceId?: string,
): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase) return 0;

  // 현재 잔액 조회
  const currentBalance = await getPointBalance(userKey);
  const newBalance = currentBalance.balance + amount;
  const newTotalEarned = currentBalance.totalEarned + amount;

  // user_points upsert
  const upsertQuery = queryUserPoints();
  if (!upsertQuery) return 0;

  const { error: upsertError } = await upsertQuery
    .upsert({
      user_key: userKey,
      balance: newBalance,
      total_earned: newTotalEarned,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_key' }) as { error: { message: string } | null };

  if (upsertError) throw new Error(`포인트 적립 실패: ${upsertError.message}`);

  // 거래 내역 기록
  const txQuery = queryPointTransactions();
  if (txQuery) {
    await txQuery.insert({
      user_key: userKey,
      amount,
      type,
      description: description ?? null,
      reference_id: referenceId ?? null,
    });
  }

  return newBalance;
}

// --- 포인트 차감 ---

export async function spendPoints(
  userKey: string,
  amount: number,
  type: TransactionType,
  description?: string,
  referenceId?: string,
): Promise<number> {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('DB 연결 실패');

  // 현재 잔액 조회
  const currentBalance = await getPointBalance(userKey);
  if (currentBalance.balance < amount) {
    throw new Error('별이 부족합니다');
  }

  const newBalance = currentBalance.balance - amount;
  const newTotalSpent = currentBalance.totalSpent + amount;

  // user_points upsert
  const upsertQuery = queryUserPoints();
  if (!upsertQuery) throw new Error('DB 연결 실패');

  const { error } = await upsertQuery
    .upsert({
      user_key: userKey,
      balance: newBalance,
      total_spent: newTotalSpent,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_key' }) as { error: { message: string } | null };

  if (error) throw new Error(`포인트 차감 실패: ${error.message}`);

  // 거래 내역 기록
  const txQuery = queryPointTransactions();
  if (txQuery) {
    await txQuery.insert({
      user_key: userKey,
      amount: -amount,
      type,
      description: description ?? null,
      reference_id: referenceId ?? null,
    });
  }

  return newBalance;
}

// --- 거래 내역 조회 ---

export async function getPointHistory(
  userKey: string,
  limit: number = 20,
): Promise<PointTransaction[]> {
  const query = queryPointTransactions();
  if (!query) return [];

  const { data, error } = await query
    .select('id, amount, type, description, created_at')
    .eq('user_key', userKey)
    .order('created_at', { ascending: false })
    .limit(limit) as { data: PointTransactionRow[] | null; error: { message: string } | null };

  if (error) throw new Error(`내역 조회 실패: ${error.message}`);
  return (data ?? []) as PointTransaction[];
}

// --- 게임 완료 보너스 ---

export async function grantGameCompleteBonus(userKey: string): Promise<number> {
  return earnPoints(userKey, GAME_COMPLETE_STARS, 'game_complete', '게임 완료 보너스');
}

// --- 라운드 완료 보너스 ---

export async function grantRoundBonus(userKey: string): Promise<number> {
  return earnPoints(userKey, ROUND_BONUS_STARS, 'round_bonus', '라운드 완료 보너스');
}

// --- 보상형 광고 보너스 ---

export async function grantRewardedAdBonus(userKey: string): Promise<number> {
  return earnPoints(userKey, REWARDED_AD_STARS, 'rewarded_ad', '보상형 광고 시청');
}

// --- 미션 보상 ---

export async function grantMissionReward(userKey: string, amount: number, missionTitle: string): Promise<number> {
  return earnPoints(userKey, amount, 'mission', `미션 완료: ${missionTitle}`);
}

// --- 일일 출석 보너스 ---

const DAILY_LOGIN_KEY = 'math-attack-daily-login';

export function hasDailyLoginToday(): boolean {
  try {
    const last = localStorage.getItem(DAILY_LOGIN_KEY);
    if (!last) return false;
    const today = new Date().toISOString().slice(0, 10);
    return last === today;
  } catch { return false; }
}

export async function grantDailyLoginBonus(userKey: string): Promise<number | null> {
  if (hasDailyLoginToday()) return null;

  const balance = await earnPoints(userKey, DAILY_LOGIN_STARS, 'daily_login', '일일 출석 보너스');
  try {
    localStorage.setItem(DAILY_LOGIN_KEY, new Date().toISOString().slice(0, 10));
  } catch { /* 무시 */ }
  return balance;
}
