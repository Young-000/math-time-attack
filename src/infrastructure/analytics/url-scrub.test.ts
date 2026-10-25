// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { createUrlScrubPlugin, hasAuthCredentialsInUrl, scrubUrl } from './url-scrub';

const CALLBACK_URL = '/auth/callback?code=x#access_token=y&refresh_token=z&utm_source=a';
const ORIGIN = 'https://app.test';

async function sendThroughPlugin(
  properties: Record<string, unknown>,
  userProperties: Record<string, unknown> = {},
): Promise<string> {
  const plugin = createUrlScrubPlugin();
  const sent = await plugin.execute({
    event_type: '[Amplitude] Page Viewed',
    event_properties: properties,
    user_properties: userProperties,
  });
  return JSON.stringify(sent);
}

describe('scrubUrl', () => {
  it('해시를 통째로 지운다', () => {
    expect(scrubUrl(`${ORIGIN}/a#access_token=y`)).toBe(`${ORIGIN}/a`);
  });

  it('민감한 쿼리 파라미터만 지우고 utm_*, fbclid, gclid는 남긴다', () => {
    const raw = `${ORIGIN}/a?code=1&state=2&utm_source=s&utm_campaign=c&fbclid=f&gclid=g&email=a%40b.c`;
    expect(scrubUrl(raw)).toBe(`${ORIGIN}/a?utm_source=s&utm_campaign=c&fbclid=f&gclid=g`);
  });

  it('상대 경로도 처리하고, URL이 아닌 값은 건드리지 않는다', () => {
    expect(scrubUrl('/auth/callback?token=1&utm_source=a#x')).toBe('/auth/callback?utm_source=a');
    expect(scrubUrl('$direct')).toBe('$direct');
  });
});

describe('createUrlScrubPlugin', () => {
  it('콜백 URL을 보내도 토큰이 이벤트에 남지 않는다', async () => {
    const sent = await sendThroughPlugin(
      {
        '[Amplitude] Page Location': `${ORIGIN}${CALLBACK_URL}`,
        '[Amplitude] Page URL': `${ORIGIN}/auth/callback`,
        '[Amplitude] Page Path': CALLBACK_URL,
      },
      { $setOnce: { initial_referrer: `${ORIGIN}${CALLBACK_URL}` } },
    );

    expect(sent).not.toMatch(/access_token|refresh_token|code=x|=y|=z/);
  });

  it('쿼리의 utm_source는 남긴다', async () => {
    const sent = await sendThroughPlugin(
      { '[Amplitude] Page Location': `${ORIGIN}/auth/callback?code=x&utm_source=a#access_token=y` },
      { $set: { referrer: `${ORIGIN}/cb?utm_source=a&token=t#refresh_token=z` } },
    );

    expect(sent).toContain('utm_source=a');
    expect(sent).not.toMatch(/code=x|token|=y|=z/);
  });

  it('URL이 아닌 속성(game_id 등)은 그대로 둔다', async () => {
    const sent = await sendThroughPlugin({ game_id: 'timer', score: 3 });
    expect(JSON.parse(sent).event_properties).toEqual({ game_id: 'timer', score: 3 });
  });
});

describe('hasAuthCredentialsInUrl', () => {
  it('쿼리의 code·해시의 access_token을 인증 콜백으로 본다', () => {
    expect(hasAuthCredentialsInUrl({ search: '?code=x', hash: '' })).toBe(true);
    expect(hasAuthCredentialsInUrl({ search: '', hash: '#access_token=y&refresh_token=z' })).toBe(true);
  });

  it('일반 페이지와 utm 쿼리는 콜백이 아니다', () => {
    expect(hasAuthCredentialsInUrl({ search: '?utm_source=a', hash: '' })).toBe(false);
    expect(hasAuthCredentialsInUrl({ search: '', hash: '' })).toBe(false);
  });
});
