/**
 * Apps-in-Toss 랭킹 서비스 테스트
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCurrentUserId,
  fetchRankings,
  fetchMyRank,
  fetchRankingContext,
  notifyRankingUpdate,
} from '../rankingService';

// recordService 모킹
vi.mock('@data/recordService', () => ({
  getRankings: vi.fn(() =>
    Promise.resolve([
      { rank: 1, odl_id: 'user1', time: 5000, played_at: '2026-01-08T00:00:00.000Z' },
      { rank: 2, odl_id: 'user2', time: 6000, played_at: '2026-01-08T00:00:00.000Z' },
    ])
  ),
  getMyRank: vi.fn(() => Promise.resolve(3)),
}));

// userIdentity 모킹
vi.mock('@infrastructure/userIdentity', () => ({
  getUserId: vi.fn(() => Promise.resolve('mock-local-user-id')),
  isAppsInTossEnvironment: vi.fn(() => false),
}));

describe('Ranking Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentUserId', () => {
    it('should delegate to userIdentity.getUserId', async () => {
      const result = await getCurrentUserId();
      expect(result).toBe('mock-local-user-id');
    });
  });

  describe('fetchRankings', () => {
    it('should fetch rankings from Supabase', async () => {
      const rankings = await fetchRankings('easy', 'multiplication');

      expect(rankings).toHaveLength(2);
      expect(rankings[0].rank).toBe(1);
      expect(rankings[0].odl_id).toBe('user1');
    });

    it('should pass limit parameter', async () => {
      const { getRankings } = await import('@data/recordService');

      await fetchRankings('medium', 'addition', 5);

      expect(getRankings).toHaveBeenCalledWith('medium', 'addition', 5);
    });
  });

  describe('fetchMyRank', () => {
    it('should return rank using userId from userIdentity', async () => {
      const result = await fetchMyRank('easy', 'multiplication');
      expect(result).toBe(3);
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
    it('should not log when not in Apps-in-Toss environment', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notifyRankingUpdate(1, 'easy', 'multiplication');

      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });

    it('should log ranking update in Apps-in-Toss environment', async () => {
      const { isAppsInTossEnvironment } = await import('@infrastructure/userIdentity');
      (isAppsInTossEnvironment as unknown as ReturnType<typeof vi.fn>).mockReturnValueOnce(true);

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notifyRankingUpdate(5, 'medium', 'addition');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'New ranking: 5 for medium/addition'
      );

      consoleLogSpy.mockRestore();
    });
  });
});
