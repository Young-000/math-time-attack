/*
  Amplitude로 보내는 URL에서 인증 정보를 걷어낸다.
  OAuth 콜백은 `#access_token=…`, `?code=…` 형태로 토큰을 URL에 싣는다.
  페이지뷰 자동 수집이 이 URL을 제3자(Amplitude)에게 보내므로 전송 직전에 항상 지운다.
*/

import type { Types } from '@amplitude/analytics-browser';

const SCRUB_BASE = 'https://scrub.invalid';

/** 값을 지울 쿼리 파라미터. utm_*, fbclid, gclid 는 유지한다. */
const SENSITIVE_PARAMS: ReadonlySet<string> = new Set([
  'access_token',
  'refresh_token',
  'id_token',
  'token',
  'code',
  'state',
  'token_hash',
  'type',
  'error_description',
  'apikey',
  'key',
  'email',
  'phone',
]);

/** 이 파라미터가 현재 URL에 있으면 인증 콜백으로 보고 페이지뷰 수집을 건너뛴다. */
const AUTH_CALLBACK_PARAMS: ReadonlySet<string> = new Set([
  'access_token',
  'refresh_token',
  'id_token',
  'token',
  'code',
  'token_hash',
  'error_description',
]);

const URL_KEY_PATTERN = /(url|location|path|referrer|href)/i;

type AnyRecord = Record<string, unknown>;

export type ScrubbableEvent = {
  event_properties?: object;
  user_properties?: object;
};

function isUrlLike(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('/');
}

/** 해시를 통째로 지우고 민감한 쿼리 파라미터를 제거한다. URL이 아닌 값은 그대로 둔다. */
export function scrubUrl(raw: string): string {
  if (!isUrlLike(raw)) return raw;

  let url: URL;
  try {
    url = new URL(raw, SCRUB_BASE);
  } catch {
    return raw.split('#')[0].split('?')[0];
  }

  url.hash = '';
  for (const name of [...url.searchParams.keys()]) {
    if (SENSITIVE_PARAMS.has(name.toLowerCase())) url.searchParams.delete(name);
  }
  return /^https?:\/\//i.test(raw) ? url.toString() : `${url.pathname}${url.search}`;
}

function scrubValue(key: string, value: unknown): unknown {
  if (typeof value === 'string') return URL_KEY_PATTERN.test(key) ? scrubUrl(value) : value;
  if (Array.isArray(value)) return value.map((item) => scrubValue(key, item));
  if (value && typeof value === 'object') return scrubRecord(value as AnyRecord);
  return value;
}

function scrubRecord(record: AnyRecord): AnyRecord {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, scrubValue(key, value)]),
  );
}

export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  return {
    ...event,
    ...(event.event_properties && { event_properties: scrubRecord(event.event_properties as AnyRecord) }),
    ...(event.user_properties && { user_properties: scrubRecord(event.user_properties as AnyRecord) }),
  };
}

/** Amplitude enrichment 플러그인. 모든 이벤트의 URL·경로·referrer 속성을 정리한다. */
export function createUrlScrubPlugin(
  name = 'url-scrub',
): Types.EnrichmentPlugin & Required<Pick<Types.EnrichmentPlugin, 'execute'>> {
  return {
    name,
    type: 'enrichment',
    setup: async () => undefined,
    execute: async (event) => scrubEvent(event),
  };
}

function hasAuthParam(params: URLSearchParams): boolean {
  return [...params.keys()].some((name) => AUTH_CALLBACK_PARAMS.has(name.toLowerCase()));
}

/** 현재 주소가 토큰·코드를 들고 있는 인증 콜백인지 (쿼리와 해시 모두 검사). */
export function hasAuthCredentialsInUrl(
  location: { search: string; hash: string } = window.location,
): boolean {
  const hashParams = new URLSearchParams(location.hash.replace(/^#\/?/, ''));
  return hasAuthParam(new URLSearchParams(location.search)) || hasAuthParam(hashParams);
}
