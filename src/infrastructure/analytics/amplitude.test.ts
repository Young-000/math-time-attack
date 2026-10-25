// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AmplitudeModule from './amplitude';

const sdk = vi.hoisted(() => ({
  init: vi.fn(() => ({ promise: Promise.resolve() })),
  track: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('@amplitude/analytics-browser', () => sdk);

const TEST_KEY = 'test-key';

type InitOptions = {
  autocapture: Record<string, unknown> & { pageViews: { trackOn: () => boolean } };
};

async function loadModule(): Promise<typeof AmplitudeModule> {
  vi.resetModules();
  return import('./amplitude');
}

function setWebdriver(value: boolean): void {
  Object.defineProperty(navigator, 'webdriver', { value, configurable: true });
}

function setUrl(url: string): void {
  window.history.replaceState(null, '', url);
}

describe('amplitude', () => {
  beforeEach(() => {
    Object.values(sdk).forEach((mock) => mock.mockClear());
    setWebdriver(false);
    setUrl('/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('키가 없으면 초기화도 전송도 하지 않는다', async () => {
    vi.stubEnv('VITE_AMPLITUDE_API_KEY', '');
    const { initAmplitude, trackAmplitude } = await loadModule();

    initAmplitude();
    trackAmplitude('game_started', { game_id: 'a' });
    await Promise.resolve();

    expect(sdk.init).not.toHaveBeenCalled();
    expect(sdk.track).not.toHaveBeenCalled();
  });

  it('키가 있으면 페이지뷰·세션·어트리뷰션만 켜고 한 번만 초기화한다', async () => {
    vi.stubEnv('VITE_AMPLITUDE_API_KEY', TEST_KEY);
    const { initAmplitude } = await loadModule();

    initAmplitude();
    initAmplitude();
    await vi.waitFor(() => expect(sdk.init).toHaveBeenCalledTimes(1));

    const [apiKey, , options] = sdk.init.mock.calls[0] as unknown as [string, unknown, InitOptions];
    expect(apiKey).toBe(TEST_KEY);
    expect(options.autocapture).toMatchObject({
      pageViews: { trackHistoryChanges: 'all' },
      sessions: true,
      attribution: true,
      pageUrlEnrichment: false,
      elementInteractions: false,
      performanceTracking: false,
    });
  });

  it('URL 정리 플러그인을 init 전에 등록하고, init 뒤에 맨 뒤로 다시 등록한다', async () => {
    vi.stubEnv('VITE_AMPLITUDE_API_KEY', TEST_KEY);
    const { initAmplitude } = await loadModule();

    initAmplitude();
    await vi.waitFor(() => expect(sdk.remove).toHaveBeenCalledWith('url-scrub'));

    const names = sdk.add.mock.calls.map(([plugin]: unknown[]) => (plugin as { name: string }).name);
    expect(names).toEqual(['url-scrub', 'url-scrub-last']);
    expect(sdk.add.mock.invocationCallOrder[0]).toBeLessThan(sdk.init.mock.invocationCallOrder[0]);
    expect(sdk.add.mock.invocationCallOrder[1]).toBeGreaterThan(sdk.init.mock.invocationCallOrder[0]);
  });

  it('init 뒤에 인증 콜백 주소로 이동하면 그 페이지뷰는 건너뛴다', async () => {
    vi.stubEnv('VITE_AMPLITUDE_API_KEY', TEST_KEY);
    const { initAmplitude } = await loadModule();

    initAmplitude();
    await vi.waitFor(() => expect(sdk.init).toHaveBeenCalledTimes(1));
    const [, , options] = sdk.init.mock.calls[0] as unknown as [string, unknown, InitOptions];
    const { trackOn } = options.autocapture.pageViews;

    expect(trackOn()).toBe(true);
    setUrl('/auth/callback?code=x');
    expect(trackOn()).toBe(false);
  });

  it('인증 콜백 URL이 정리될 때까지 SDK를 올리지 않는다', async () => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_AMPLITUDE_API_KEY', TEST_KEY);
    setUrl('/auth/callback?code=x#access_token=y');
    const { initAmplitude } = await loadModule();

    initAmplitude();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(sdk.init).not.toHaveBeenCalled();

    setUrl('/next');
    await vi.advanceTimersByTimeAsync(500);
    expect(sdk.init).toHaveBeenCalledTimes(1);
  });

  it('URL이 끝내 정리되지 않으면 초기화하지 않는다', async () => {
    vi.useFakeTimers();
    vi.stubEnv('VITE_AMPLITUDE_API_KEY', TEST_KEY);
    setUrl('/auth/callback?code=x');
    const { initAmplitude } = await loadModule();

    initAmplitude();
    await vi.advanceTimersByTimeAsync(60_000);

    expect(sdk.init).not.toHaveBeenCalled();
  });

  it('자동화 브라우저(webdriver)에서는 초기화하지 않는다', async () => {
    vi.stubEnv('VITE_AMPLITUDE_API_KEY', TEST_KEY);
    setWebdriver(true);
    const { initAmplitude } = await loadModule();

    initAmplitude();
    await Promise.resolve();

    expect(sdk.init).not.toHaveBeenCalled();
  });

  it('초기화 뒤에는 이벤트를 속성과 함께 전달한다', async () => {
    vi.stubEnv('VITE_AMPLITUDE_API_KEY', TEST_KEY);
    const { initAmplitude, trackAmplitude } = await loadModule();

    initAmplitude();
    trackAmplitude('game_started', { game_id: 'timer' });

    await vi.waitFor(() =>
      expect(sdk.track).toHaveBeenCalledWith('game_started', { game_id: 'timer' }),
    );
  });
});
