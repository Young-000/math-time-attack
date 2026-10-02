/**
 * 통합 테스트: 인증 장애 시 게임 지속성
 *
 * Edge Function 500 에러, 네트워크 에러, appLogin 실패가 나도
 * 게임 기록은 로컬에 저장되어 정상 플레이가 가능해야 한다.
 * 인증 실패는 local- 대체 ID로 숨기지 않고 에러로 드러낸다 (local-/temp- userKey 금지 정책).
 *
 * 테스트 범위:
 * - Edge Function 500 → 인증 에러 + userKey 미캐시 → 로컬 기록 저장 정상
 * - 네트워크 에러 → 인증 에러 → 다음 호출에서 인증 재시도
 * - Supabase 미설정 환경 → 로컬 전용 모드로 동작
 * - appLogin 실패 → 인증 에러 → 로컬 기록 저장 정상
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockAppLogin } = vi.hoisted(() => ({
  mockAppLogin: vi.fn(),
}));

vi.mock('@apps-in-toss/web-framework', () => ({
  appLogin: mockAppLogin,
}));

import {
  initializeUserIdentity,
  getUserId,
  getCachedUserId,
  resetUserIdentityCache,
} from '@infrastructure/userIdentity';
import {
  saveRecord,
  getBestRecord,
  isOnlineMode,
} from '@data/recordService';

const originalFetch = globalThis.fetch;
const mockFetch = vi.fn();

function mockAuthSuccess(userKey: string): void {
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ userKey, expiresAt: '2026-02-24T14:00:00.000Z' }),
  });
}

function mockServerError(error: string): void {
  mockFetch.mockResolvedValue({
    ok: false,
    status: 500,
    json: () => Promise.resolve({ error, message: 'Database connection failed' }),
  });
}

describe('통합: 인증 장애 시 게임 지속성', () => {
  beforeEach(() => {
    resetUserIdentityCache();
    localStorage.clear();
    mockFetch.mockReset();
    mockAppLogin.mockReset();
    mockAppLogin.mockResolvedValue({ authorizationCode: 'some-auth-code', referrer: 'home' });
    globalThis.fetch = mockFetch;
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('Edge Function 500 에러', () => {
    it('인증 에러를 던지고 userKey를 캐시하지 않는다', async () => {
      mockServerError('INTERNAL_SERVER_ERROR');

      await expect(initializeUserIdentity()).rejects.toThrow('INTERNAL_SERVER_ERROR');

      expect(getCachedUserId()).toBeNull();
    });

    it('인증 실패와 무관하게 게임 기록을 로컬에 저장할 수 있다', async () => {
      mockServerError('SERVER_ERROR');
      await expect(initializeUserIdentity()).rejects.toThrow();

      const result = await saveRecord('easy', 5000, 'multiplication');

      expect(result.isNewLocalRecord).toBe(true);
      expect(getBestRecord('easy', 'multiplication')?.time).toBe(5000);
    });

    it('재시작 후에는 대체 ID를 재사용하지 않고 인증을 다시 시도한다', async () => {
      mockServerError('SERVER_ERROR');
      await expect(initializeUserIdentity()).rejects.toThrow();

      // 메모리 캐시 초기화 (앱 재시작 시뮬레이션) 후 서버 복구
      resetUserIdentityCache();
      mockAuthSuccess('recovered-user-key');

      const userId = await initializeUserIdentity();

      expect(userId).toBe('recovered-user-key');
      expect(mockAppLogin).toHaveBeenCalledTimes(2);
    });
  });

  describe('네트워크 에러 (fetch throw)', () => {
    it('인증 에러를 던져도 게임 기록은 로컬에 저장된다', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      await expect(initializeUserIdentity()).rejects.toThrow('Failed to fetch');

      const result = await saveRecord('medium', 7500, 'addition');
      expect(result.isNewLocalRecord).toBe(true);
      expect(getBestRecord('medium', 'addition')?.time).toBe(7500);
    });

    it('네트워크 에러 후 getUserId는 캐시 없이 인증을 다시 시도한다', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Network offline'));
      await expect(initializeUserIdentity()).rejects.toThrow('Network offline');

      mockAuthSuccess('user-key-after-retry');
      const userId = await getUserId();

      expect(userId).toBe('user-key-after-retry');
      expect(mockAppLogin).toHaveBeenCalledTimes(2);
    });
  });

  describe('로컬 기록 (인증 없이)', () => {
    it('게임 기록을 로컬에 정상 저장한다', async () => {
      const result = await saveRecord('hard', 12000, 'mixed');

      expect(result.isNewLocalRecord).toBe(true);
      expect(getBestRecord('hard', 'mixed')?.time).toBe(12000);
    });

    it('더 좋은 기록이 기존 기록을 덮어쓴다', async () => {
      await saveRecord('easy', 8000, 'multiplication');
      expect(getBestRecord('easy', 'multiplication')?.time).toBe(8000);

      await saveRecord('easy', 6000, 'multiplication');
      expect(getBestRecord('easy', 'multiplication')?.time).toBe(6000);
    });

    it('더 나쁜 기록은 최고 기록을 갱신하지 않는다', async () => {
      await saveRecord('easy', 5000, 'multiplication');
      const slowResult = await saveRecord('easy', 9000, 'multiplication');

      expect(slowResult.isNewLocalRecord).toBe(false);
      expect(getBestRecord('easy', 'multiplication')?.time).toBe(5000);
    });
  });

  describe('Supabase 미설정 환경: 로컬 전용 모드', () => {
    it('Supabase 설정 여부를 boolean으로 알려준다', () => {
      expect(typeof isOnlineMode()).toBe('boolean');
    });

    it('Supabase 미설정 시 saveRecord는 로컬 저장만 수행하고 serverRecord는 null이다', async () => {
      const result = await saveRecord('easy', 4000, 'multiplication');

      expect(result.isNewLocalRecord).toBe(true);
      if (!isOnlineMode()) {
        expect(result.serverRecord).toBeNull();
      }
    });
  });

  describe('appLogin 실패 시나리오', () => {
    it('appLogin이 null을 반환하면 미지원 에러를 던진다', async () => {
      mockAppLogin.mockResolvedValue(null);

      await expect(initializeUserIdentity()).rejects.toThrow('appLogin 미지원 앱 버전');
      expect(getCachedUserId()).toBeNull();
    });

    it('appLogin SDK 예외는 그대로 전달된다', async () => {
      mockAppLogin.mockRejectedValue(new Error('Bridge not available'));

      await expect(initializeUserIdentity()).rejects.toThrow('Bridge not available');
      expect(getCachedUserId()).toBeNull();
    });

    it('appLogin 실패 후 게임 기록 로컬 저장이 정상 동작한다', async () => {
      mockAppLogin.mockRejectedValue(new Error('SDK error'));
      await expect(initializeUserIdentity()).rejects.toThrow('SDK error');

      const result = await saveRecord('medium', 6500, 'multiplication');

      expect(result.isNewLocalRecord).toBe(true);
      expect(getBestRecord('medium', 'multiplication')?.time).toBe(6500);
    });
  });
});
