/**
 * 주간/월간 챌린지 서비스
 */

import { getSupabaseClient } from '@infrastructure/supabase';

export type ChallengeType = 'weekly' | 'monthly';

export type ChallengeInfo = {
  type: ChallengeType;
  periodKey: string;
  periodLabel: string;
  rewards: Record<number, number>;
  endsAt: Date;
};

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function getCurrentWeekKey(): string {
  const now = new Date();
  const week = getISOWeek(now);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function getCurrentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getWeekLabel(): string {
  const now = new Date();
  const month = now.getMonth() + 1;
  const week = Math.ceil(now.getDate() / 7);
  return `${month}월 ${week}주차`;
}

export function getMonthLabel(): string {
  const now = new Date();
  return `${now.getFullYear()}년 ${now.getMonth() + 1}월`;
}

export function getWeekEndDate(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  const end = new Date(now);
  end.setDate(now.getDate() + diff);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getMonthEndDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
}

// Legacy challenge rewards (kept for backward compatibility)
const WEEKLY_CHALLENGE_REWARDS = { 1: 100, 2: 50, 3: 30 } as const;
const MONTHLY_CHALLENGE_REWARDS = { 1: 1000, 2: 500, 3: 300 } as const;

export function getCurrentChallengeInfo(type: ChallengeType): ChallengeInfo {
  if (type === 'weekly') {
    return {
      type: 'weekly',
      periodKey: getCurrentWeekKey(),
      periodLabel: getWeekLabel(),
      rewards: { ...WEEKLY_CHALLENGE_REWARDS },
      endsAt: getWeekEndDate(),
    };
  }
  return {
    type: 'monthly',
    periodKey: getCurrentMonthKey(),
    periodLabel: getMonthLabel(),
    rewards: { ...MONTHLY_CHALLENGE_REWARDS },
    endsAt: getMonthEndDate(),
  };
}

export function getTimeRemaining(endsAt: Date): { days: number; hours: number; minutes: number } {
  const diff = Math.max(0, endsAt.getTime() - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { days, hours, minutes };
}

export async function hasReceivedReward(
  userKey: string,
  challengeType: ChallengeType,
  periodKey: string,
): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  const { data } = await supabase
    .from('challenge_rewards' as never)
    .select('id')
    .eq('user_key', userKey)
    .eq('challenge_type', challengeType)
    .eq('period_key', periodKey)
    .maybeSingle();

  return !!data;
}
