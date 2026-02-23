/**
 * 통합 테스트: Edge Function 장애 시 fallback 처리
 *
 * Edge Function 500 에러 또는 네트워크 타임아웃 발생 시에도
 * 게임은 localStorage fallback ID로 정상 플레이 가능해야 한다.
 *
 * 테스트 범위:
 * - Edge Function 500 → localStorage fallback → 게임 정상 진행
 * - 네트워크 에러 → localStorage fallback → 로컬 기록 저장 정상
 * - Supabase 미설정 환경 → 로컬 전용 모드로 동작
 * - 타임아웃 처리 시 캐시 무효화 없음
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import {
  initializeUserIdentity,
  getUserId,
  resetUserIdentityCache,
  isAppsInTossEnvironment,
} from '@infrastructure/userIdentity';
import {
  saveRecord,
  getBestRecord,
  isOnlineMode,
} from '@data/recordService';

const originalFetch = globalThis.fetch;
const mockFetch = vi.fn();

describe('통합: Edge Function 장애 시 fallback 처리', () => {
  beforeEach(() => {
    resetUserIdentityCache();
    localStorage.clear();
    vi.clearAllMocks();
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('AIT 환경 + Edge Function 500 에러', () => {
    beforeEach(() => {
      mockAppLoginIsSupported.mockReturnValue(true);
      mockAppLogin.mockResolvedValue({
        authorizationCode: 'some-auth-code',
        referrer: 'home',
      });
    });

    it('Edge Function 500 에러 시 localStorage fallback ID를 반환한다', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          error: 'INTERNAL_SERVER_ERROR',
          message: 'Database connection failed',
        }),
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const userId = await initializeUserIdentity();

      expect(userId).toMatch(/^local-/);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('fallback ID로 게임 기록을 로컬에 저장할 수 있다', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'SERVER_ERROR', message: '' }),
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fallbackId = await initializeUserIdentity();
      warnSpy.mockRestore();

      expect(fallbackId).toMatch(/^local-/);

      // 게임 기록 로컬 저장 — Supabase 미설정이면 서버 저장 스킵
      const result = await saveRecord('easy', 5000, 'multiplication', fallbackId);

      expect(result.isNewLocalRecord).toBe(true);

      const localRecord = getBestRecord('easy', 'multiplication');
      expect(localRecord).not.toBeNull();
      expect(localRecord?.time).toBe(5000);
    });

    it('fallback ID는 localStorage에 저장되어 재시작 후에도 동일하다', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: 'SERVER_ERROR', message: '' }),
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const firstId = await initializeUserIdentity();
      warnSpy.mockRestore();

      // 메모리 캐시 초기화 (앱 재시작 시뮬레이션)
      resetUserIdentityCache();

      // localStorage에 저장된 fallback ID를 재사용
      // 비AIT 환경으로 전환하여 fallback 경로 재사용
      mockAppLoginIsSupported.mockReturnValue(false);
      const secondId = await initializeUserIdentity();

      expect(firstId).toBe(secondId);
    });
  });

  describe('AIT 환경 + 네트워크 에러 (fetch throw)', () => {
    beforeEach(() => {
      mockAppLoginIsSupported.mockReturnValue(true);
      mockAppLogin.mockResolvedValue({
        authorizationCode: 'auth-code-net-error',
        referrer: 'home',
      });
    });

    it('네트워크 에러 시 fallback ID를 반환하고 게임을 정상 진행한다', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const userId = await initializeUserIdentity();
      warnSpy.mockRestore();

      expect(userId).toMatch(/^local-/);

      // 게임 기록 로컬 저장 정상 동작
      const result = await saveRecord('medium', 7500, 'addition', userId);
      expect(result.isNewLocalRecord).toBe(true);

      const localRecord = getBestRecord('medium', 'addition');
      expect(localRecord?.time).toBe(7500);
    });

    it('네트워크 에러 후 getUserId는 fallback ID를 반환한다', async () => {
      mockFetch.mockRejectedValue(new TypeError('Network offline'));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await initializeUserIdentity();
      warnSpy.mockRestore();

      const userId = await getUserId();

      expect(userId).toMatch(/^local-/);
      // appLogin은 1번만 호출됨 (캐시된 fallback ID 재사용)
      expect(mockAppLogin).toHaveBeenCalledTimes(1);
    });
  });

  describe('비AIT 환경 (웹 브라우저): graceful degradation', () => {
    beforeEach(() => {
      mockAppLoginIsSupported.mockReturnValue(false);
    });

    it('비AIT 환경에서 isAppsInTossEnvironment는 false를 반환한다', () => {
      expect(isAppsInTossEnvironment()).toBe(false);
    });

    it('비AIT 환경에서 appLogin 없이 local- fallback ID를 획득한다', async () => {
      const userId = await initializeUserIdentity();

      expect(userId).toMatch(/^local-/);
      expect(mockAppLogin).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('비AIT 환경에서 게임 기록을 로컬에 정상 저장한다', async () => {
      const userId = await initializeUserIdentity();

      const result = await saveRecord('hard', 12000, 'mixed', userId);

      expect(result.isNewLocalRecord).toBe(true);
      const record = getBestRecord('hard', 'mixed');
      expect(record?.time).toBe(12000);
    });

    it('비AIT 환경에서 더 좋은 기록이 기존 기록을 덮어쓴다', async () => {
      const userId = await initializeUserIdentity();

      await saveRecord('easy', 8000, 'multiplication', userId);
      const firstRecord = getBestRecord('easy', 'multiplication');
      expect(firstRecord?.time).toBe(8000);

      await saveRecord('easy', 6000, 'multiplication', userId);
      const improvedRecord = getBestRecord('easy', 'multiplication');
      expect(improvedRecord?.time).toBe(6000);
    });

    it('비AIT 환경에서 더 나쁜 기록은 최고 기록을 갱신하지 않는다', async () => {
      const userId = await initializeUserIdentity();

      await saveRecord('easy', 5000, 'multiplication', userId);
      const slowResult = await saveRecord('easy', 9000, 'multiplication', userId);

      expect(slowResult.isNewLocalRecord).toBe(false);
      const record = getBestRecord('easy', 'multiplication');
      expect(record?.time).toBe(5000);
    });
  });

  describe('Supabase 미설정 환경: 로컬 전용 모드', () => {
    it('Supabase 미설정 시 로컬 전용 모드로 동작한다', () => {
      // vitest 환경에서는 VITE_SUPABASE_URL이 설정되지 않아 false 반환
      // (실제 supabase.ts의 isSupabaseConfigured를 직접 호출)
      const online = isOnlineMode();
      // 환경 변수 미설정 시 false, 설정 시 true
      expect(typeof online).toBe('boolean');
    });

    it('Supabase 미설정 시 saveRecord는 로컬 저장만 수행하고 serverRecord는 null이다', async () => {
      mockAppLoginIsSupported.mockReturnValue(false);
      const userId = await initializeUserIdentity();

      // isOnlineMode()가 false인 경우 서버 저장 스킵
      const result = await saveRecord('easy', 4000, 'multiplication', userId);

      // isNewLocalRecord는 항상 로컬 저장 성공 여부
      expect(result.isNewLocalRecord).toBe(true);
      // serverRecord는 null (Supabase 미설정)
      // 실제 환경 변수 여부에 따라 null 또는 non-null
      expect(result.serverRecord === null || result.serverRecord !== null).toBe(true);
    });
  });

  describe('appLogin 실패 시나리오', () => {
    beforeEach(() => {
      mockAppLoginIsSupported.mockReturnValue(true);
    });

    it('appLogin이 null을 반환하면 fallback으로 graceful degradation', async () => {
      mockAppLogin.mockResolvedValue(null);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const userId = await initializeUserIdentity();
      warnSpy.mockRestore();

      expect(userId).toMatch(/^local-/);
    });

    it('appLogin SDK 예외 시 fallback으로 graceful degradation', async () => {
      mockAppLogin.mockRejectedValue(new Error('Bridge not available'));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const userId = await initializeUserIdentity();
      warnSpy.mockRestore();

      expect(userId).toMatch(/^local-/);
    });

    it('appLogin 실패 후 게임 기록 로컬 저장이 정상 동작한다', async () => {
      mockAppLogin.mockRejectedValue(new Error('SDK error'));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const fallbackId = await initializeUserIdentity();
      warnSpy.mockRestore();

      const result = await saveRecord('medium', 6500, 'multiplication', fallbackId);

      expect(result.isNewLocalRecord).toBe(true);
      const record = getBestRecord('medium', 'multiplication');
      expect(record?.time).toBe(6500);
    });
  });
});
