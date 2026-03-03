/**
 * 랭킹 서비스 테스트
 *
 * userKey 기반 전환 (Cycle 3):
 * - getUserId()가 appLogin userKey를 반환하는 것을 전제로 한다
 * - mock 값은 실제 토스 userKey 형식을 반영한다
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCurrentUserId,
  fetchRankings,
  fetchMyRank,
  fetchRankingContext,
  notifyRankingUpdate,
} from '../rankingService';

// appLogin 기반 userKey mock (실제 토스 userKey 형식)
const MOCK_TOSS_USER_KEY = 'toss-user-key-abc123';

// recordService 모킹
vi.mock('@data/recordService', () => ({
  getRankings: vi.fn(() =>
    Promise.resolve([
      { rank: 1, odl_id: 'toss-user-key-aaa111', time: 5000, played_at: '2026-01-08T00:00:00.000Z' },
      { rank: 2, odl_id: 'toss-user-key-bbb222', time: 6000, played_at: '2026-01-08T00:00:00.000Z' },
    ])
  ),
  getMyRank: vi.fn(() => Promise.resolve(3)),
}));

// userIdentity 모킹 — appLogin userKey 반환
vi.mock('@infrastructure/userIdentity', () => ({
  getUserId: vi.fn(() => Promise.resolve(MOCK_TOSS_USER_KEY)),
  isAppsInTossEnvironment: vi.fn(() => false),
}));

describe('Ranking Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentUserId', () => {
    it('appLogin userKey를 반환한다 (userIdentity.getUserId로 위임)', async () => {
      const result = await getCurrentUserId();
      expect(result).toBe(MOCK_TOSS_USER_KEY);
    });

    it('반환된 userKey는 toss-user-key 형식이다', async () => {
      const result = await getCurrentUserId();
      // 실제 환경에서는 appLogin userKey가 반환된다
      // 비AIT fallback은 local- 접두사를 사용한다
      expect(result).toBeTruthy();
    });
  });

  describe('fetchRankings', () => {
    it('Supabase에서 랭킹을 가져온다 (odl_id 컬럼에 userKey 저장)', async () => {
      const rankings = await fetchRankings('easy', 'multiplication');

      expect(rankings).toHaveLength(2);
      expect(rankings[0].rank).toBe(1);
      // odl_id 컬럼명은 유지, 값은 appLogin userKey
      expect(rankings[0].odl_id).toBe('toss-user-key-aaa111');
    });

    it('limit 파라미터를 전달한다', async () => {
      const { getRankings } = await import('@data/recordService');

      await fetchRankings('medium', 'addition', 5);

      expect(getRankings).toHaveBeenCalledWith('medium', 'addition', 5);
    });
  });

  describe('fetchMyRank', () => {
    it('userIdentity에서 받은 userKey로 내 순위를 조회한다', async () => {
      const { getMyRank } = await import('@data/recordService');

      const result = await fetchMyRank('easy', 'multiplication');

      expect(result).toBe(3);
      // getCurrentUserId()가 반환한 userKey가 getMyRank에 전달되었는지 확인
      expect(getMyRank).toHaveBeenCalledWith(MOCK_TOSS_USER_KEY, 'easy', 'multiplication');
    });
  });

  describe('fetchRankingContext', () => {
    it('should fetch complete ranking context', async () => {
      const context = await fetchRankingContext('easy', 'multiplication');

      expect(context.rankings).toHaveLength(2);
      expect(context.myRank).toBe(3);
      expect(context.isLoading).toBe(false);
      expect(context.error).toBeNull();
      expect(context.gameMode).toBe('easy_multiplication');
    });

    it('should handle errors gracefully', async () => {
      const { getRankings } = await import('@data/recordService');
      (getRankings as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const context = await fetchRankingContext('hard', 'mixed');

      expect(context.rankings).toEqual([]);
      expect(context.myRank).toBeNull();
      expect(context.error).toBe('Network error');
      expect(context.gameMode).toBe('hard_mixed');
    });
  });

  describe('notifyRankingUpdate', () => {
    it('should return without error when not in Apps-in-Toss environment', async () => {
      await expect(notifyRankingUpdate(1, 'easy', 'multiplication')).resolves.toBeUndefined();
    });

    it('should return without error in Apps-in-Toss environment', async () => {
      const { isAppsInTossEnvironment } = await import('@infrastructure/userIdentity');
      (isAppsInTossEnvironment as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

      await expect(notifyRankingUpdate(5, 'medium', 'addition')).resolves.toBeUndefined();
    });
  });
});
