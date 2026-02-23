/**
 * userIdentity.ts 테스트
 *
 * appLogin() -> Edge Function -> userKey 플로우를 검증한다.
 * 시나리오: appLogin 성공, appLogin 실패, Edge Function 실패,
 *          캐시 히트, 캐시 만료, 비AIT 환경
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// vi.hoisted를 사용하여 mock 함수를 hoisted 스코프에서 생성
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
  getCachedUserId,
  isAppsInTossEnvironment,
  resetUserIdentityCache,
} from '../userIdentity';

// fetch mock
const originalFetch = globalThis.fetch;
const mockFetch = vi.fn();

describe('userIdentity', () => {
  beforeEach(() => {
    // 모든 테스트 전 상태 초기화
    resetUserIdentityCache();
    localStorage.clear();
    vi.clearAllMocks();
    mockAppLoginIsSupported.mockReturnValue(false);
    mockAppLogin.mockResolvedValue(undefined);

    // fetch mock 설치
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('isAppsInTossEnvironment', () => {
    it('appLogin.isSupported()가 true를 반환하면 AIT 환경이다', () => {
      mockAppLoginIsSupported.mockReturnValue(true);
      expect(isAppsInTossEnvironment()).toBe(true);
    });

    it('appLogin.isSupported()가 false를 반환하면 비AIT 환경이다', () => {
      mockAppLoginIsSupported.mockReturnValue(false);
      expect(isAppsInTossEnvironment()).toBe(false);
    });

    it('appLogin.isSupported가 예외를 던지면 false를 반환한다', () => {
      mockAppLoginIsSupported.mockImplementation(() => {
        throw new Error('SDK not available');
      });
      expect(isAppsInTossEnvironment()).toBe(false);
    });
  });

  describe('비AIT 환경 (웹 브라우저)', () => {
    beforeEach(() => {
      mockAppLoginIsSupported.mockReturnValue(false);
    });

    it('appLogin을 호출하지 않고 localStorage fallback ID를 반환한다', async () => {
      const userId = await initializeUserIdentity();

      expect(userId).toMatch(/^local-/);
      expect(mockAppLogin).not.toHaveBeenCalled();
    });

    it('fallback ID는 localStorage에 저장되어 재사용된다', async () => {
      const first = await initializeUserIdentity();
      resetUserIdentityCache();
      const second = await initializeUserIdentity();

      expect(first).toBe(second);
    });
  });

  describe('AIT 환경 - appLogin 성공', () => {
    const MOCK_AUTH_CODE = 'test-auth-code-123';
    const MOCK_USER_KEY = 'toss-user-key-abc';
    const MOCK_EXPIRES_AT = '2026-02-24T14:00:00.000Z';

    beforeEach(() => {
      mockAppLoginIsSupported.mockReturnValue(true);
      mockAppLogin.mockResolvedValue({
        authorizationCode: MOCK_AUTH_CODE,
        referrer: 'home',
      });

      // Edge Function 성공 응답 mock
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          userKey: MOCK_USER_KEY,
          expiresAt: MOCK_EXPIRES_AT,
        }),
      });
    });

    it('appLogin -> Edge Function -> userKey 플로우가 정상 동작한다', async () => {
      const userId = await initializeUserIdentity();

      expect(userId).toBe(MOCK_USER_KEY);
      expect(mockAppLogin).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('Edge Function에 authorizationCode를 POST로 전송한다', async () => {
      await initializeUserIdentity();

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('/functions/v1/auth');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body);
      expect(body.authorizationCode).toBe(MOCK_AUTH_CODE);
    });

    it('Edge Function 요청에 Authorization 헤더를 포함한다', async () => {
      await initializeUserIdentity();

      const [, options] = mockFetch.mock.calls[0];
      expect(options.headers['Content-Type']).toBe('application/json');
      expect(options.headers['Authorization']).toMatch(/^Bearer /);
    });

    it('userKey를 캐시하여 다음 호출에서 재사용한다', async () => {
      const first = await initializeUserIdentity();
      const second = await getUserId();

      expect(first).toBe(MOCK_USER_KEY);
      expect(second).toBe(MOCK_USER_KEY);
      // appLogin은 1번만 호출
      expect(mockAppLogin).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('getCachedUserId는 초기화 후 캐시된 값을 반환한다', async () => {
      expect(getCachedUserId()).toBeNull();

      await initializeUserIdentity();

      expect(getCachedUserId()).toBe(MOCK_USER_KEY);
    });
  });

  describe('AIT 환경 - 캐시 동작', () => {
    const MOCK_USER_KEY = 'cached-user-key';

    beforeEach(() => {
      mockAppLoginIsSupported.mockReturnValue(true);
    });

    it('localStorage에 캐시된 userKey가 유효하면 appLogin을 건너뛴다', async () => {
      // 캐시 설정 (유효한 TTL)
      localStorage.setItem('math-attack-user-key', MOCK_USER_KEY);
      localStorage.setItem('math-attack-user-key-expiry', String(Date.now() + 60 * 60 * 1000));

      const userId = await initializeUserIdentity();

      expect(userId).toBe(MOCK_USER_KEY);
      expect(mockAppLogin).not.toHaveBeenCalled();
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('localStorage 캐시가 만료되면 appLogin 플로우를 재실행한다', async () => {
      // 만료된 캐시 설정
      localStorage.setItem('math-attack-user-key', 'expired-key');
      localStorage.setItem('math-attack-user-key-expiry', String(Date.now() - 1000));

      const NEW_USER_KEY = 'new-user-key';
      mockAppLogin.mockResolvedValue({
        authorizationCode: 'new-code',
        referrer: 'home',
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          userKey: NEW_USER_KEY,
          expiresAt: '2026-02-24T15:00:00.000Z',
        }),
      });

      const userId = await initializeUserIdentity();

      expect(userId).toBe(NEW_USER_KEY);
      expect(mockAppLogin).toHaveBeenCalledTimes(1);
    });

    it('resetUserIdentityCache는 메모리 캐시와 localStorage 캐시를 모두 제거한다', async () => {
      localStorage.setItem('math-attack-user-key', MOCK_USER_KEY);
      localStorage.setItem('math-attack-user-key-expiry', String(Date.now() + 60 * 60 * 1000));

      await initializeUserIdentity();
      expect(getCachedUserId()).toBe(MOCK_USER_KEY);

      resetUserIdentityCache();

      expect(getCachedUserId()).toBeNull();
      expect(localStorage.getItem('math-attack-user-key')).toBeNull();
      expect(localStorage.getItem('math-attack-user-key-expiry')).toBeNull();
    });
  });

  describe('AIT 환경 - appLogin 실패', () => {
    beforeEach(() => {
      mockAppLoginIsSupported.mockReturnValue(true);
    });

    it('appLogin이 undefined를 반환하면 fallback ID를 반환한다', async () => {
      mockAppLogin.mockResolvedValue(undefined);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const userId = await initializeUserIdentity();

      expect(userId).toMatch(/^local-/);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('appLogin이 예외를 던지면 fallback ID를 반환한다', async () => {
      mockAppLogin.mockRejectedValue(new Error('SDK internal error'));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const userId = await initializeUserIdentity();

      expect(userId).toMatch(/^local-/);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('AIT 환경 - Edge Function 실패', () => {
    beforeEach(() => {
      mockAppLoginIsSupported.mockReturnValue(true);
      mockAppLogin.mockResolvedValue({
        authorizationCode: 'valid-code',
        referrer: 'home',
      });
    });

    it('Edge Function이 500 에러를 반환하면 fallback ID를 반환한다', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          error: 'TOSS_SERVER_ERROR',
          message: 'Internal server error',
        }),
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const userId = await initializeUserIdentity();

      expect(userId).toMatch(/^local-/);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('Edge Function 네트워크 에러 시 fallback ID를 반환한다', async () => {
      mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const userId = await initializeUserIdentity();

      expect(userId).toMatch(/^local-/);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });

    it('Edge Function이 400 INVALID_AUTH_CODE를 반환하면 fallback ID를 반환한다', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: 'INVALID_AUTH_CODE',
          message: 'authorizationCode가 만료되었거나 이미 사용되었습니다',
        }),
      });

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const userId = await initializeUserIdentity();

      expect(userId).toMatch(/^local-/);

      warnSpy.mockRestore();
    });

    it('Edge Function 타임아웃(AbortError) 시 fallback ID를 반환한다', async () => {
      const abortError = new DOMException('The operation was aborted.', 'AbortError');
      mockFetch.mockRejectedValue(abortError);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const userId = await initializeUserIdentity();

      expect(userId).toMatch(/^local-/);
      expect(warnSpy).toHaveBeenCalled();

      warnSpy.mockRestore();
    });
  });

  describe('getUserId', () => {
    it('캐시된 값이 있으면 즉시 반환한다', async () => {
      mockAppLoginIsSupported.mockReturnValue(true);
      mockAppLogin.mockResolvedValue({
        authorizationCode: 'code',
        referrer: 'home',
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          userKey: 'user-key-1',
          expiresAt: '2026-02-24T14:00:00.000Z',
        }),
      });

      await initializeUserIdentity();

      vi.clearAllMocks();

      const userId = await getUserId();

      expect(userId).toBe('user-key-1');
      expect(mockAppLogin).not.toHaveBeenCalled();
    });

    it('캐시가 없으면 initializeUserIdentity를 호출한다', async () => {
      mockAppLoginIsSupported.mockReturnValue(false);

      const userId = await getUserId();

      expect(userId).toMatch(/^local-/);
    });
  });
});
