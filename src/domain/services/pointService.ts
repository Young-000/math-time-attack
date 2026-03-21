/**
 * 내부 포인트("별") 서비스
 * localStorage 기반 — 항상 동작 (유효한 userKey 불필요)
 * Supabase DB에도 선택적 동기화 (유효한 userKey가 있을 때만)
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

// --- localStorage 키 ---

const BALANCE_KEY = 'math-attack-star-balance';
const HISTORY_KEY = 'math-attack-star-history';
const MAX_HISTORY = 100;

// --- localStorage 기반 (PRIMARY — 항상 동작) ---

function getLocalBalance(): PointBalance {
  try {
    const stored = localStorage.getItem(BALANCE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as PointBalance;
      return {
        balance: data.balance ?? 0,
        totalEarned: data.totalEarned ?? 0,
        totalSpent: data.totalSpent ?? 0,
      };
    }
  } catch { /* fallback */ }
  return { balance: 0, totalEarned: 0, totalSpent: 0 };
}

function setLocalBalance(data: PointBalance): void {
  try {
    localStorage.setItem(BALANCE_KEY, JSON.stringify(data));
  } catch { /* storage full */ }
}

function addLocalHistory(entry: Omit<PointTransaction, 'id'>): void {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    const history: PointTransaction[] = stored ? JSON.parse(stored) : [];
    history.unshift({
      ...entry,
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    });
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch { /* ignore */ }
}

function getLocalHistory(limit: number = 20): PointTransaction[] {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      const history = JSON.parse(stored) as PointTransaction[];
      return history.slice(0, limit);
    }
  } catch { /* fallback */ }
  return [];
}

// --- DB 동기화 (선택적 — 유효한 userKey가 있을 때만) ---

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedQueryBuilder = any;

function queryUserPoints(): UntypedQueryBuilder | null {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  return (supabase as unknown as { from: (table: string) => UntypedQueryBuilder })
    .from('user_points');
}

function queryPointTransactions(): UntypedQueryBuilder | null {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  return (supabase as unknown as { from: (table: string) => UntypedQueryBuilder })
    .from('point_transactions');
}

function isValidUserKey(key: string | null): key is string {
  return !!key && !key.startsWith('local-') && !key.startsWith('temp-');
}

async function syncToDb(
  userKey: string,
  balance: PointBalance,
  amount: number,
  type: TransactionType,
  description?: string,
  referenceId?: string,
): Promise<void> {
  if (!isValidUserKey(userKey)) return;

  try {
    const upsertQuery = queryUserPoints();
    if (upsertQuery) {
      await upsertQuery.upsert({
        user_key: userKey,
        balance: balance.balance,
        total_earned: balance.totalEarned,
        total_spent: balance.totalSpent,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_key' });
    }

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
  } catch {
    // DB 동기화 실패 무시 — localStorage가 primary
  }
}

// --- Public API ---

export async function getPointBalance(userKey: string): Promise<PointBalance> {
  // 항상 localStorage에서 반환
  const local = getLocalBalance();

  // 유효한 userKey면 DB에서도 읽어서 더 큰 값 사용 (초기 동기화)
  if (isValidUserKey(userKey)) {
    try {
      const query = queryUserPoints();
      if (query) {
        const { data } = await query
          .select('balance, total_earned, total_spent')
          .eq('user_key', userKey)
          .maybeSingle() as { data: UserPointsRow | null; error: unknown };

        if (data && data.balance > local.balance) {
          const dbBalance: PointBalance = {
            balance: data.balance,
            totalEarned: data.total_earned,
            totalSpent: data.total_spent,
          };
          setLocalBalance(dbBalance);
          return dbBalance;
        }
      }
    } catch {
      // DB 읽기 실패 — localStorage fallback
    }
  }

  return local;
}

export async function earnPoints(
  _userKey: string,
  amount: number,
  type: TransactionType,
  description?: string,
  referenceId?: string,
): Promise<number> {
  // localStorage에 항상 적립 (PRIMARY)
  const current = getLocalBalance();
  const updated: PointBalance = {
    balance: current.balance + amount,
    totalEarned: current.totalEarned + amount,
    totalSpent: current.totalSpent,
  };
  setLocalBalance(updated);
  addLocalHistory({
    amount,
    type,
    description: description ?? null,
    created_at: new Date().toISOString(),
  });

  // DB 동기화 (비동기, 실패해도 무시)
  syncToDb(_userKey, updated, amount, type, description, referenceId);

  return updated.balance;
}

export async function spendPoints(
  _userKey: string,
  amount: number,
  type: TransactionType,
  description?: string,
  referenceId?: string,
): Promise<number> {
  const current = getLocalBalance();
  if (current.balance < amount) {
    throw new Error('별이 부족합니다');
  }

  const updated: PointBalance = {
    balance: current.balance - amount,
    totalEarned: current.totalEarned,
    totalSpent: current.totalSpent + amount,
  };
  setLocalBalance(updated);
  addLocalHistory({
    amount: -amount,
    type,
    description: description ?? null,
    created_at: new Date().toISOString(),
  });

  // DB 동기화
  syncToDb(_userKey, updated, -amount, type, description, referenceId);

  return updated.balance;
}

export async function getPointHistory(
  _userKey: string,
  limit: number = 20,
): Promise<PointTransaction[]> {
  // localStorage에서 반환
  return getLocalHistory(limit);
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
