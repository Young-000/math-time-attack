/**
 * 명예의 전당 서비스
 * 역대 주간/월간 챌린지 우승자 조회
 */

import { getSupabaseClient } from '@infrastructure/supabase';

export type HallOfFameEntry = {
  id: string;
  user_key: string;
  nickname: string | null;
  challenge_type: 'weekly' | 'monthly';
  period_key: string;
  period_label: string;
  rank: number;
  score: number;
  difficulty: string;
  points_awarded: number;
  created_at: string;
};

export async function fetchHallOfFame(
  type: 'weekly' | 'monthly',
  limit: number = 36,
): Promise<HallOfFameEntry[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];

  const { data, error } = await (supabase
    .from('hall_of_fame' as never) as any)
    .select('*')
    .eq('challenge_type', type)
    .order('period_key', { ascending: false })
    .order('rank', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('명예의 전당 조회 실패:', error.message);
    return [];
  }

  return (data ?? []) as HallOfFameEntry[];
}
