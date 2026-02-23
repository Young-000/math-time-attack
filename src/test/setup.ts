import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock @apps-in-toss/web-framework globally
// jsdom 환경에서 bridge-core 네이티브 핸들러가 없어 isSupported 호출 시 에러 발생
vi.mock('@apps-in-toss/web-framework', () => ({
  // v1 API (레거시 호환)
  GoogleAdMob: {
    loadAppsInTossAdMob: Object.assign(vi.fn(() => vi.fn()), {
      isSupported: vi.fn(() => false),
    }),
    showAppsInTossAdMob: Object.assign(vi.fn(() => vi.fn()), {
      isSupported: vi.fn(() => false),
    }),
  },
  // v2 Full Screen Ad API
  loadFullScreenAd: Object.assign(vi.fn(() => vi.fn()), {
    isSupported: vi.fn(() => false),
  }),
  showFullScreenAd: Object.assign(vi.fn(() => vi.fn()), {
    isSupported: vi.fn(() => false),
  }),
  // Game Center SDK
  submitGameCenterLeaderBoardScore: Object.assign(
    vi.fn(() => Promise.resolve({ statusCode: 'SUCCESS' })),
    { isSupported: vi.fn(() => false) },
  ),
  openGameCenterLeaderboard: Object.assign(
    vi.fn(() => Promise.resolve()),
    { isSupported: vi.fn(() => false) },
  ),
  getGameCenterGameProfile: Object.assign(
    vi.fn(() => Promise.resolve({ statusCode: 'PROFILE_NOT_FOUND' })),
    { isSupported: vi.fn(() => false) },
  ),
  // 게임 로그인 (getUserKeyForGame) -- 레거시, promotionService가 아직 참조
  getUserKeyForGame: Object.assign(
    vi.fn(() => Promise.resolve(undefined)),
    { isSupported: vi.fn(() => false) },
  ),
  // appLogin (비게임 인증 -- getUserKeyForGame 대체)
  appLogin: Object.assign(
    vi.fn(() => Promise.resolve(undefined)),
    { isSupported: vi.fn(() => false) },
  ),
  // 프로모션 리워드 (grantPromotionRewardForGame)
  grantPromotionRewardForGame: Object.assign(
    vi.fn(() => Promise.resolve(undefined)),
    { isSupported: vi.fn(() => false) },
  ),
  // 기타
  share: vi.fn(() => Promise.resolve()),
  contactsViral: vi.fn(() => vi.fn()),
  getOperationalEnvironment: vi.fn(() => 'sandbox'),
}));

// Mock localStorage for tests
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => Object.keys(store)[index] || null,
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
