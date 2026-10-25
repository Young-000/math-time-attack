import type * as AmplitudeSdk from '@amplitude/analytics-browser';

import { createUrlScrubPlugin, hasAuthCredentialsInUrl } from './url-scrub';

type AmplitudeSdkModule = typeof AmplitudeSdk;

export type EventProperties = Record<string, string | number | boolean>;

/*
  봇·자동화 브라우저는 계측하지 않는다 (METRICS.md 2026-08-11 규정).
  명시적 토큰만 잡는다 — 사람을 봇으로 오판하면 그 사용자의 행동이 사라진다.
*/
const BOT_TOKENS = [
  'bot',
  'crawler',
  'spider',
  'headlesschrome',
  'phantomjs',
  'puppeteer',
  'playwright',
  'lighthouse',
];

const EARLY_SCRUB_PLUGIN = 'url-scrub';
const LAST_SCRUB_PLUGIN = 'url-scrub-last';
const URL_CHECK_INTERVAL_MS = 250;
const URL_WAIT_TIMEOUT_MS = 30_000;

let sdkPromise: Promise<AmplitudeSdkModule | null> | null = null;

function isAutomatedBrowser(): boolean {
  if (navigator.webdriver) return true;
  const userAgent = navigator.userAgent.toLowerCase();
  return !userAgent || BOT_TOKENS.some((token) => userAgent.includes(token));
}

/*
  인증 콜백 URL(`?code=`, `#access_token=`)이 남아 있는 동안에는 SDK를 올리지 않는다.
  앱(Supabase 등)이 토큰을 읽고 주소를 정리한 뒤에 시작한다. 여기서 주소를 직접 지우면
  앱이 읽기 전에 토큰이 사라져 로그인이 깨질 수 있다. 끝내 정리되지 않으면 계측하지 않는다.
*/
function waitForCleanUrl(): Promise<boolean> {
  if (!hasAuthCredentialsInUrl()) return Promise.resolve(true);

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const isClean = !hasAuthCredentialsInUrl();
      const isExpired = Date.now() - startedAt >= URL_WAIT_TIMEOUT_MS;
      if (!isClean && !isExpired) return;
      window.clearInterval(timer);
      resolve(isClean);
    }, URL_CHECK_INTERVAL_MS);
  });
}

async function startSdk(apiKey: string): Promise<AmplitudeSdkModule> {
  const sdk = await import('@amplitude/analytics-browser');
  // init 전에 add 하면 SDK가 큐에 쌓았다가 기본 플러그인보다 먼저 등록한다 → 첫 페이지뷰도 정리된다.
  sdk.add(createUrlScrubPlugin(EARLY_SCRUB_PLUGIN));
  await sdk.init(apiKey, undefined, {
    autocapture: {
      pageViews: { trackHistoryChanges: 'all', trackOn: () => !hasAuthCredentialsInUrl() },
      sessions: true,
      attribution: true,
      // 기본값이 true 인 항목은 전부 명시적으로 끈다 (pageUrlEnrichment 는 원본 URL을 다시 붙인다).
      pageUrlEnrichment: false,
      formInteractions: false,
      fileDownloads: false,
      elementInteractions: false,
      frustrationInteractions: false,
      networkTracking: false,
      webVitals: false,
      performanceTracking: false,
    },
  }).promise;
  // 기본 플러그인이 모두 등록된 뒤에 다시 추가해 enrichment 중 가장 마지막에 실행되게 한다.
  sdk.add(createUrlScrubPlugin(LAST_SCRUB_PLUGIN));
  sdk.remove(EARLY_SCRUB_PLUGIN);
  return sdk;
}

async function loadSdk(apiKey: string): Promise<AmplitudeSdkModule | null> {
  try {
    if (!(await waitForCleanUrl())) return null;
    return await startSdk(apiKey);
  } catch (error) {
    console.warn('[amplitude] init failed', error);
    return null;
  }
}

/**
 * Amplitude를 한 번만 초기화한다. 키가 없거나 봇이면 아무 일도 하지 않는다.
 * SDK는 동적 import라서 키가 없는 환경에서는 번들에 실리지 않는다.
 */
export function initAmplitude(): void {
  if (sdkPromise) return;
  const apiKey = import.meta.env.VITE_AMPLITUDE_API_KEY as string | undefined;
  if (!apiKey || isAutomatedBrowser()) return;
  sdkPromise = loadSdk(apiKey);
}

/** 이벤트 이름 = 행동, 대상은 property. 초기화되지 않았으면 무시한다. */
export function trackAmplitude(eventName: string, properties?: EventProperties): void {
  if (!sdkPromise) return;
  void sdkPromise.then((sdk) => sdk?.track(eventName, properties));
}
