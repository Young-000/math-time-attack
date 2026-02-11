import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock @apps-in-toss/web-framework globally
// jsdom 환경에서 bridge-core 네이티브 핸들러가 없어 isSupported 호출 시 에러 발생
vi.mock('@apps-in-toss/web-framework', () => ({
  GoogleAdMob: {
    loadAppsInTossAdMob: Object.assign(vi.fn(() => vi.fn()), {
      isSupported: vi.fn(() => false),
    }),
    showAppsInTossAdMob: Object.assign(vi.fn(() => vi.fn()), {
      isSupported: vi.fn(() => false),
    }),
  },
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
