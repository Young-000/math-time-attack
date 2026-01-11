/**
 * Apps-in-Toss 랭킹 서비스 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getCurrentUserId,
  getCurrentUserInfo,
  isAppsInTossEnvironment,
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

describe('Ranking Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // window.ODL 초기화
    if (typeof global.window !== 'undefined') {
      delete (global.window as unknown as { ODL?: unknown }).ODL;
    }
  });

  afterEach(() => {
    // 원래 상태로 복원
    if (typeof global.window !== 'undefined') {
      delete (global.window as unknown as { ODL?: unknown }).ODL;
    }
  });

  describe('isAppsInTossEnvironment', () => {
    it('should return false when window.ODL is not defined', () => {
      expect(isAppsInTossEnvironment()).toBe(false);
    });

    it('should return true when window.ODL is defined', () => {
      (global.window as unknown as { ODL: object }).ODL = {
        getUserId: vi.fn(),
        getUserInfo: vi.fn(),
      };

      expect(isAppsInTossEnvironment()).toBe(true);
    });
  });

  describe('getCurrentUserId', () => {
    it('should return null when not in Apps-in-Toss environment', async () => {
      const result = await getCurrentUserId();
      expect(result).toBeNull();
    });

    it('should return user ID from ODL API', async () => {
      (global.window as unknown as { ODL: object }).ODL = {
        getUserId: vi.fn(() => Promise.resolve('test-user-id')),
        getUserInfo: vi.fn(),
      };

      const result = await getCurrentUserId();
      expect(result).toBe('test-user-id');
    });

    it('should return null and log warning when ODL throws error', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      (global.window as unknown as { ODL: object }).ODL = {
        getUserId: vi.fn(() => Promise.reject(new Error('ODL Error'))),
        getUserInfo: vi.fn(),
      };

      const result = await getCurrentUserId();

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to get user ID from ODL:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
    });
  });

  describe('getCurrentUserInfo', () => {
    it('should return null when not in Apps-in-Toss environment', async () => {
      const result = await getCurrentUserInfo();
      expect(result).toBeNull();
    });

    it('should return user info from ODL API', async () => {
      const mockUserInfo = { id: 'test-user-id', nickname: 'TestUser' };

      (global.window as unknown as { ODL: object }).ODL = {
        getUserId: vi.fn(),
        getUserInfo: vi.fn(() => Promise.resolve(mockUserInfo)),
      };

      const result = await getCurrentUserInfo();
      expect(result).toEqual(mockUserInfo);
    });

    it('should return null and log warning when ODL throws error', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      (global.window as unknown as { ODL: object }).ODL = {
        getUserId: vi.fn(),
        getUserInfo: vi.fn(() => Promise.reject(new Error('ODL Error'))),
      };

      const result = await getCurrentUserInfo();

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Failed to get user info from ODL:',
        expect.any(Error)
      );

      consoleWarnSpy.mockRestore();
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
    it('should return null when user is not logged in', async () => {
      const result = await fetchMyRank('easy', 'multiplication');
      expect(result).toBeNull();
    });

    it('should fetch my rank when user is logged in', async () => {
      (global.window as unknown as { ODL: object }).ODL = {
        getUserId: vi.fn(() => Promise.resolve('test-user-id')),
        getUserInfo: vi.fn(),
      };

      const result = await fetchMyRank('easy', 'multiplication');

      expect(result).toBe(3);
    });
  });

  describe('fetchRankingContext', () => {
    it('should fetch complete ranking context', async () => {
      (global.window as unknown as { ODL: object }).ODL = {
        getUserId: vi.fn(() => Promise.resolve('test-user-id')),
        getUserInfo: vi.fn(),
      };

      const context = await fetchRankingContext('easy', 'multiplication');

      expect(context.rankings).toHaveLength(2);
      expect(context.myRank).toBe(3);
      expect(context.isLoading).toBe(false);
      expect(context.error).toBeNull();
      expect(context.gameMode).toBe('easy_multiplication');
    });

    it('should return null myRank when not logged in', async () => {
      const context = await fetchRankingContext('easy', 'multiplication');

      expect(context.rankings).toHaveLength(2);
      expect(context.myRank).toBeNull();
      expect(context.error).toBeNull();
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
      (global.window as unknown as { ODL: object }).ODL = {
        getUserId: vi.fn(),
        getUserInfo: vi.fn(),
      };

      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await notifyRankingUpdate(5, 'medium', 'addition');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        'New ranking: 5 for medium/addition'
      );

      consoleLogSpy.mockRestore();
    });
  });
});
