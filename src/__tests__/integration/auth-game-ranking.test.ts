/**
 * 통합 테스트: 인증 → 게임 → 랭킹 플로우
 *
 * appLogin → userKey 획득 → 게임 기록 저장 → 랭킹 조회 시 내 기록 포함 확인.
 * 사용자 식별자(userKey)가 인증부터 랭킹까지 일관되게 흐르는지 검증한다.
 *
 * 테스트 범위:
 * - userIdentity: appLogin → Edge Function → userKey 캐싱
 * - rankingService: userKey로 fetchMyRank 호출
 * - recordService: userKey로 게임 기록 저장 후 랭킹 반영
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.hoisted로 mock 함수 생성 (모듈 import보다 먼저 실행)
const { mockAppLogin, mockAppLoginIsSupported } = vi.hoisted(() => {
  const mockAppLoginIsSupported = vi.fn(() => false);
  const mockAppLogin = Object.assign(
    vi.fn(() => Promise.resolve(undefined as unknown)),
    { isSupported: mockAppLoginIsSupported },
  );
  return { mockAppLogin, mockAppLoginIsSupported };
});

vi.mock('@apps-in-toss/web-framework', () => ({
  appLogin: mockAppLogin,
}));

// Supabase 클라이언트 mock
const mockRpcFn = vi.fn();

// 기본 query chain builder — 각 테스트에서 mockResolvedValue로 덮어쓸 수 있음
function buildQueryChain(result: { data: unknown; error: null } | { data: null; error: unknown }): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  const asyncMethods = ['limit', 'single'];
  const chainMethods = ['select', 'eq', 'order', 'lt'];

  chainMethods.forEach((method) => {
    chain[method] = vi.fn(() => chain);
  });

  asyncMethods.forEach((method) => {
    chain[method] = vi.fn(() => Promise.resolve(result));
  });

  return chain;
}

const mockFromFn = vi.fn(() => buildQueryChain({ data: [], error: null }));
const mockSchemaFn = vi.fn(() => ({
  from: mockFromFn,
  rpc: mockRpcFn,
}));

vi.mock('@infrastructure/supabase', () => ({
  getSupabaseClient: vi.fn(() => ({
    schema: mockSchemaFn,
  })),
  isSupabaseConfigured: vi.fn(() => true),
}));

import {
  initializeUserIdentity,
  getUserId,
  resetUserIdentityCache,
} from '@infrastructure/userIdentity';
import {
  getCurrentUserId,
  fetchRankings,
  fetchMyRank,
  fetchRankingContext,
} from '@infrastructure/rankingService';
import { saveRecord, getBestRecord } from '@data/recordService';

const MOCK_AUTH_CODE = 'auth-code-integration-test';
const MOCK_USER_KEY = 'toss-user-key-integration-abc123';
const MOCK_EXPIRES_AT = '2026-03-01T12:00:00.000Z';

const originalFetch = globalThis.fetch;
const mockFetch = vi.fn();

describe('통합: 인증 → 게임 → 랭킹 플로우', () => {
  beforeEach(() => {
    resetUserIdentityCache();
    localStorage.clear();
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;

    // AIT 환경으로 설정
    mockAppLoginIsSupported.mockReturnValue(true);
    mockAppLogin.mockResolvedValue({
      authorizationCode: MOCK_AUTH_CODE,
      referrer: 'home',
    });

    // Edge Function auth 응답
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        userKey: MOCK_USER_KEY,
        expiresAt: MOCK_EXPIRES_AT,
      }),
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('Step 1: 인증 → userKey 획득', () => {
    it('appLogin 후 Edge Function을 통해 userKey를 획득한다', async () => {
      const userKey = await initializeUserIdentity();

      expect(userKey).toBe(MOCK_USER_KEY);
      expect(mockAppLogin).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url] = mockFetch.mock.calls[0] as [string];
      expect(url).toContain('/functions/v1/auth');
    });

    it('획득한 userKey는 이후 getUserId() 호출에서 캐시로 반환된다', async () => {
      await initializeUserIdentity();

      // 두 번째 호출은 appLogin 없이 캐시 반환
      const cachedKey = await getUserId();

      expect(cachedKey).toBe(MOCK_USER_KEY);
      expect(mockAppLogin).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Step 2: userKey → 랭킹 서비스 연동', () => {
    it('rankingService.getCurrentUserId가 인증된 userKey를 반환한다', async () => {
      // 인증 먼저 수행
      await initializeUserIdentity();

      const userId = await getCurrentUserId();

      expect(userId).toBe(MOCK_USER_KEY);
    });

    it('fetchMyRank는 인증된 userKey로 내 순위를 조회한다', async () => {
      await initializeUserIdentity();

      // getMyRank 두 번의 from 호출:
      // 1. .select('time').eq(...).eq(...).eq(...).order(...).limit(1).single() → my best time
      // 2. .select('*', {count}).eq(...).eq(...).lt(...) → 나보다 빠른 기록 count (.lt()가 terminal)
      let fromCallCount = 0;
      mockFromFn.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          const chain: Record<string, unknown> = {};
          chain['select'] = vi.fn(() => chain);
          chain['eq'] = vi.fn(() => chain);
          chain['order'] = vi.fn(() => chain);
          chain['limit'] = vi.fn(() => chain);
          chain['single'] = vi.fn(() => Promise.resolve({ data: { time: 5000 }, error: null }));
          return chain;
        }
        // count 쿼리: .select() → chain, .eq() → chain, .lt() → Promise
        const countChain: Record<string, unknown> = {};
        countChain['select'] = vi.fn(() => countChain);
        countChain['eq'] = vi.fn(() => countChain);
        countChain['lt'] = vi.fn(() => Promise.resolve({ count: 2, error: null }));
        return countChain;
      });

      const rank = await fetchMyRank('easy', 'multiplication');

      // 순위 = 나보다 빠른 2명 + 1 = 3
      expect(rank).toBe(3);
    });

    it('fetchRankingContext는 rankings와 myRank를 함께 반환한다', async () => {
      await initializeUserIdentity();

      // fetchRankingContext = fetchRankings(1번) + fetchMyRank(2번) → 총 from 3번 호출
      let fromCallCount = 0;
      mockFromFn.mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // fetchRankings: .select().eq().eq().order().limit() — limit()이 terminal
          const chain: Record<string, unknown> = {};
          chain['select'] = vi.fn(() => chain);
          chain['eq'] = vi.fn(() => chain);
          chain['order'] = vi.fn(() => chain);
          chain['limit'] = vi.fn(() => Promise.resolve({
            data: [
              { odl_id: MOCK_USER_KEY, time: 4500, played_at: '2026-02-24T00:00:00Z' },
              { odl_id: 'other-user-key', time: 6000, played_at: '2026-02-24T00:00:00Z' },
            ],
            error: null,
          }));
          return chain;
        }
        if (fromCallCount === 2) {
          // fetchMyRank: my best time — .single()이 terminal
          const chain: Record<string, unknown> = {};
          chain['select'] = vi.fn(() => chain);
          chain['eq'] = vi.fn(() => chain);
          chain['order'] = vi.fn(() => chain);
          chain['limit'] = vi.fn(() => chain);
          chain['single'] = vi.fn(() => Promise.resolve({ data: { time: 4500 }, error: null }));
          return chain;
        }
        // fetchMyRank: count — .lt()이 terminal
        const countChain: Record<string, unknown> = {};
        countChain['select'] = vi.fn(() => countChain);
        countChain['eq'] = vi.fn(() => countChain);
        countChain['lt'] = vi.fn(() => Promise.resolve({ count: 0, error: null }));
        return countChain;
      });

      const context = await fetchRankingContext('easy', 'multiplication');

      expect(context.isLoading).toBe(false);
      expect(context.error).toBeNull();
      expect(context.gameMode).toBe('easy_multiplication');
      expect(Array.isArray(context.rankings)).toBe(true);
      expect(context.rankings).toHaveLength(2);
      expect(context.myRank).toBe(1); // 0명보다 빠름 + 1
    });
  });

  describe('Step 3: 게임 기록 저장 → 랭킹 반영', () => {
    it('saveRecord는 로컬 기록을 저장하고 서버 저장을 시도한다', async () => {
      await initializeUserIdentity();

      // Supabase RPC 성공 mock
      mockRpcFn.mockResolvedValue({
        data: { id: 'record-uuid', odl_id: MOCK_USER_KEY, time: 4500 },
        error: null,
      });

      const result = await saveRecord('easy', 4500, 'multiplication', MOCK_USER_KEY);

      // 로컬 기록 저장 확인
      expect(result.isNewLocalRecord).toBe(true);

      // 로컬 스토리지에서 기록 확인
      const localRecord = getBestRecord('easy', 'multiplication');
      expect(localRecord).not.toBeNull();
      expect(localRecord?.time).toBe(4500);
    });

    it('동일 userKey로 저장된 기록이 rankingService를 통해 조회된다', async () => {
      await initializeUserIdentity();

      // 로컬 기록 저장
      await saveRecord('easy', 5000, 'multiplication', MOCK_USER_KEY);

      // fetchRankings mock — 저장한 userKey가 포함된 결과 반환
      // getRankings 체인: .select().eq().eq().order().limit()
      const rankingChain: Record<string, unknown> = {};
      rankingChain['select'] = vi.fn(() => rankingChain);
      rankingChain['eq'] = vi.fn(() => rankingChain);
      rankingChain['order'] = vi.fn(() => rankingChain);
      rankingChain['limit'] = vi.fn(() => Promise.resolve({
        data: [{ odl_id: MOCK_USER_KEY, time: 5000, played_at: '2026-02-24T00:00:00Z' }],
        error: null,
      }));
      mockFromFn.mockReturnValue(rankingChain);

      const rankings = await fetchRankings('easy', 'multiplication', 10);

      expect(rankings).toHaveLength(1);
      expect(rankings[0].odl_id).toBe(MOCK_USER_KEY);
      expect(rankings[0].time).toBe(5000);
    });
  });

  describe('사용자 식별자 일관성 검증', () => {
    it('인증 후 모든 레이어에서 동일한 userKey를 사용한다', async () => {
      // 1. 인증으로 userKey 획득
      const identityKey = await initializeUserIdentity();

      // 2. getUserId도 동일한 키 반환
      const getUserIdResult = await getUserId();

      // 3. rankingService도 동일한 키 반환
      const rankingUserId = await getCurrentUserId();

      expect(identityKey).toBe(MOCK_USER_KEY);
      expect(getUserIdResult).toBe(MOCK_USER_KEY);
      expect(rankingUserId).toBe(MOCK_USER_KEY);
    });

    it('비AIT 환경에서는 모든 레이어가 동일한 local- fallback ID를 사용한다', async () => {
      mockAppLoginIsSupported.mockReturnValue(false);
      resetUserIdentityCache();
      localStorage.clear();

      const identityKey = await initializeUserIdentity();
      const getUserIdResult = await getUserId();

      expect(identityKey).toMatch(/^local-/);
      expect(getUserIdResult).toBe(identityKey);
    });
  });
});
