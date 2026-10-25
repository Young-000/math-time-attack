// @vitest-environment jsdom
/*
  실제 Amplitude SDK 플러그인 파이프라인을 돌리고 전송 계층(fetch)만 가짜로 바꾼다.
  SDK가 서버로 보내는 본문 전체에 토큰·해시·민감 쿼리가 남지 않는지 확인한다.
*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as AmplitudeModule from './amplitude';

const FORBIDDEN = [/code=/, /access_token/, /refresh_token/, /#/, /email=/];

let sentBodies: string[] = [];

const OK_BODY = { code: 200, events_ingested: 1, payload_size_bytes: 1, server_upload_time: 1 };

function fakeFetch(_url: unknown, init?: { body?: unknown }): Promise<unknown> {
  if (typeof init?.body === 'string') sentBodies.push(init.body);
  return Promise.resolve({
    ok: true,
    status: 200,
    json: async () => OK_BODY,
    text: async () => JSON.stringify(OK_BODY),
  });
}

function setUrl(url: string): void {
  window.history.replaceState(null, '', url);
}

async function startAndFlush(
  afterStart: (api: typeof AmplitudeModule) => void,
): Promise<string> {
  vi.resetModules();
  const api = await import('./amplitude');
  const sdk = await import('@amplitude/analytics-browser');
  api.initAmplitude();
  await vi.waitFor(() => expect(sentBodies.length).toBeGreaterThan(0), { timeout: 8_000 });
  afterStart(api);
  await sdk.flush().promise;
  return sentBodies.join('\n');
}

describe('amplitude pipeline (real SDK, fake transport)', () => {
  beforeEach(() => {
    sentBodies = [];
    vi.stubGlobal('fetch', fakeFetch);
    vi.stubEnv('VITE_AMPLITUDE_API_KEY', 'pipeline-test-key');
    Object.defineProperty(navigator, 'webdriver', { value: false, configurable: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    setUrl('/');
  });

  it('/auth/callback 에서 시작해 /next 로 이동해도 전송 본문에 토큰이 없다', async () => {
    setUrl('/auth/callback?code=x#access_token=y&refresh_token=z');
    vi.resetModules();
    const api = await import('./amplitude');
    const sdk = await import('@amplitude/analytics-browser');

    api.initAmplitude();
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(sentBodies).toEqual([]); // 콜백 URL이 남아 있는 동안은 아무것도 보내지 않는다

    setUrl('/next');
    api.trackAmplitude('game_started', { game_id: 'timer' });
    await vi.waitFor(() => expect(sentBodies.length).toBeGreaterThan(0), { timeout: 8_000 });
    await sdk.flush().promise;

    const sent = sentBodies.join('\n');
    expect(sent).toContain('game_started');
    expect(sent).toContain('/next');
    FORBIDDEN.forEach((pattern) => expect(sent).not.toMatch(pattern));
  }, 20_000);

  it('인증 파라미터가 아닌 민감 쿼리·해시도 페이지뷰에서 제거하고 utm은 남긴다', async () => {
    setUrl('/promo?email=a%40b.c&utm_source=news&key=k#section');

    const sent = await startAndFlush((api) => api.trackAmplitude('share_clicked', { channel: 'link' }));

    expect(sent).toContain('utm_source');
    FORBIDDEN.forEach((pattern) => expect(sent).not.toMatch(pattern));
    expect(sent).not.toMatch(/[?&]key=k/);
  }, 20_000);
});
