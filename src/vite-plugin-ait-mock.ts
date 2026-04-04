/**
 * vite-plugin-ait-mock.ts
 *
 * Vite plugin that mocks @apps-in-toss/web-framework, @toss/tds-mobile-ait,
 * and @toss/tds-mobile in development mode.
 * Allows AIT apps to run in a regular browser for local testing
 * without the Toss WebView environment.
 *
 * Usage in vite.config.ts:
 *   import { aitMock } from './src/vite-plugin-ait-mock';
 *   export default defineConfig({ plugins: [aitMock(), react()] });
 *
 * The plugin only activates in dev mode (apply: 'serve'),
 * so production builds are completely unaffected.
 */

import type { Plugin } from 'vite';

export function aitMock(): Plugin {
  return {
    name: 'vite-plugin-ait-mock',
    enforce: 'pre',
    apply: 'serve',

    resolveId(id) {
      if (id === '@apps-in-toss/web-framework') return '\0ait-mock';
      if (id === '@toss/tds-mobile-ait') return '\0tds-mobile-ait-mock';
      if (id === '@toss/tds-mobile') return '\0tds-mobile-mock';
      return null;
    },

    load(id) {
      if (id === '\0ait-mock') return AIT_MOCK_CODE;
      if (id === '\0tds-mobile-ait-mock') return TDS_MOBILE_AIT_MOCK_CODE;
      if (id === '\0tds-mobile-mock') return TDS_MOBILE_MOCK_CODE;
      return null;
    },
  };
}

// ---------------------------------------------------------------------------
// Mock implementation (inlined as a string so Vite can serve it as a module)
// ---------------------------------------------------------------------------

const AIT_MOCK_CODE = `
// =============================================================================
// @apps-in-toss/web-framework MOCK  (dev-only, injected by vite-plugin-ait-mock)
// =============================================================================

// --- Mock indicator banner ---------------------------------------------------
if (typeof document !== 'undefined') {
  const _aitBanner = document.createElement('div');
  _aitBanner.style.cssText =
    'position:fixed;top:0;left:0;right:0;height:24px;background:#ff6b35;' +
    'color:white;text-align:center;font-size:12px;line-height:24px;' +
    'z-index:99999;font-family:sans-serif;pointer-events:none;';
  _aitBanner.textContent = 'AIT SDK Mock Mode (Dev Only)';
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => document.body.prepend(_aitBanner));
  } else {
    document.body.prepend(_aitBanner);
  }
  // Push page content down so banner does not overlap
  document.documentElement.style.setProperty('--ait-mock-banner-height', '24px');
}

// --- Helpers -----------------------------------------------------------------

function _delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function _noop() {}

function _addIsSupported(fn) {
  fn.isSupported = () => true;
  return fn;
}

// --- Auth --------------------------------------------------------------------

export const appLogin = _addIsSupported(async function appLogin() {
  console.log('[AIT Mock] appLogin called');
  await _delay(500);
  return { authorizationCode: 'mock-auth-code', referrer: 'DEFAULT' };
});

export const closeView = _addIsSupported(function closeView() {
  console.log('[AIT Mock] closeView called');
});

// --- Event System ----------------------------------------------------------------

export const graniteEvent = {
  addEventListener: function addEventListener(eventName, handler) {
    console.log('[AIT Mock] graniteEvent.addEventListener:', eventName);
    // Return unsubscribe function
    return function unsubscribe() {
      console.log('[AIT Mock] graniteEvent unsubscribe:', eventName);
    };
  },
};

// --- Full Screen Ad (v2) -----------------------------------------------------

export const loadFullScreenAd = _addIsSupported(function loadFullScreenAd({ options, onEvent, onError }) {
  console.log('[AIT Mock] loadFullScreenAd called', options);
  const timer = setTimeout(() => {
    if (onEvent) onEvent({ type: 'loaded' });
  }, 300);
  // Return cleanup function
  return function cleanup() {
    clearTimeout(timer);
  };
});

export const showFullScreenAd = _addIsSupported(function showFullScreenAd({ options, onEvent, onError }) {
  console.log('[AIT Mock] showFullScreenAd called', options);
  setTimeout(() => {
    if (onEvent) onEvent({ type: 'userEarnedReward' });
  }, 1000);
  setTimeout(() => {
    if (onEvent) onEvent({ type: 'dismissed' });
  }, 1500);
  return _noop;
});

// --- Legacy Ad API (v1 GoogleAdMob) ------------------------------------------

export const loadAppsInTossAdMob = _addIsSupported(function loadAppsInTossAdMob({ options, onEvent, onError }) {
  console.log('[AIT Mock] loadAppsInTossAdMob called', options);
  const timer = setTimeout(() => {
    if (onEvent) onEvent({ type: 'loaded' });
  }, 300);
  return function cleanup() {
    clearTimeout(timer);
  };
});

export const showAppsInTossAdMob = _addIsSupported(function showAppsInTossAdMob({ options, onEvent, onError }) {
  console.log('[AIT Mock] showAppsInTossAdMob called', options);
  setTimeout(() => {
    if (onEvent) onEvent({ type: 'userEarnedReward' });
  }, 1000);
  setTimeout(() => {
    if (onEvent) onEvent({ type: 'dismissed' });
  }, 1500);
  return _noop;
});

// GoogleAdMob namespace (v1 legacy)
export const GoogleAdMob = {
  loadAppsInTossAdMob: _addIsSupported(function (opts) { return loadAppsInTossAdMob(opts); }),
  showAppsInTossAdMob: _addIsSupported(function (opts) { return showAppsInTossAdMob(opts); }),
};

// --- TossAds (Banner) --------------------------------------------------------

export const TossAds = {
  initialize: _addIsSupported(function initialize() {
    console.log('[AIT Mock] TossAds.initialize called');
  }),
  attach: _addIsSupported(function attach(element, options) {
    console.log('[AIT Mock] TossAds.attach called', options);
    // Create a placeholder banner element
    if (element && typeof document !== 'undefined') {
      const placeholder = document.createElement('div');
      placeholder.style.cssText =
        'width:100%;height:50px;background:#f0f0f0;display:flex;align-items:center;' +
        'justify-content:center;font-size:11px;color:#999;font-family:sans-serif;' +
        'border:1px dashed #ccc;';
      placeholder.textContent = '[Mock Banner Ad]';
      element.appendChild(placeholder);
    }
    return { id: 'mock-banner-id' };
  }),
  attachBanner: _addIsSupported(function attachBanner(element, options) {
    console.log('[AIT Mock] TossAds.attachBanner called', options);
    if (element && typeof document !== 'undefined') {
      const placeholder = document.createElement('div');
      placeholder.style.cssText =
        'width:100%;height:50px;background:#f0f0f0;display:flex;align-items:center;' +
        'justify-content:center;font-size:11px;color:#999;font-family:sans-serif;' +
        'border:1px dashed #ccc;';
      placeholder.textContent = '[Mock Banner Ad]';
      element.appendChild(placeholder);
    }
    return { id: 'mock-banner-id' };
  }),
  destroy: _addIsSupported(function destroy(id) {
    console.log('[AIT Mock] TossAds.destroy called', id);
  }),
  destroyAll: _addIsSupported(function destroyAll() {
    console.log('[AIT Mock] TossAds.destroyAll called');
  }),
};

// --- Share -------------------------------------------------------------------

export const share = _addIsSupported(async function share(params) {
  console.log('[AIT Mock] share called:', params);
  await _delay(300);
  return { success: true };
});

export const getTossShareLink = _addIsSupported(async function getTossShareLink(url) {
  console.log('[AIT Mock] getTossShareLink called:', url);
  await _delay(200);
  return 'https://mock.toss.im/intoss/share?url=' + encodeURIComponent(url || '');
});

// --- Game / Environment ------------------------------------------------------

export const getOperationalEnvironment = _addIsSupported(function getOperationalEnvironment() {
  return 'sandbox';
});

export const getUserKeyForGame = _addIsSupported(async function getUserKeyForGame() {
  console.log('[AIT Mock] getUserKeyForGame called');
  await _delay(200);
  return { userKey: 'mock-game-user-123' };
});

export const grantPromotionRewardForGame = _addIsSupported(async function grantPromotionRewardForGame(params) {
  console.log('[AIT Mock] grantPromotionRewardForGame called:', params);
  await _delay(300);
  return { success: true };
});

export const grantPromotionReward = _addIsSupported(async function grantPromotionReward(params) {
  console.log('[AIT Mock] grantPromotionReward called:', params);
  await _delay(300);
  return { success: true };
});

export const submitGameCenterLeaderBoardScore = _addIsSupported(async function submitGameCenterLeaderBoardScore(params) {
  console.log('[AIT Mock] submitGameCenterLeaderBoardScore called:', params);
  await _delay(100);
});

// --- Viral -------------------------------------------------------------------

export const contactsViral = _addIsSupported(function contactsViral(params) {
  console.log('[AIT Mock] contactsViral called:', params);
  return _noop;
});

// --- Default export (some imports may use default) ---------------------------

export default {
  appLogin,
  closeView,
  graniteEvent,
  loadFullScreenAd,
  showFullScreenAd,
  loadAppsInTossAdMob,
  showAppsInTossAdMob,
  GoogleAdMob,
  TossAds,
  share,
  getTossShareLink,
  getOperationalEnvironment,
  getUserKeyForGame,
  grantPromotionRewardForGame,
  grantPromotionReward,
  submitGameCenterLeaderBoardScore,
  contactsViral,
};
`;

// ---------------------------------------------------------------------------
// @toss/tds-mobile-ait mock — TDSMobileAITProvider passthrough
// ---------------------------------------------------------------------------

const TDS_MOBILE_AIT_MOCK_CODE = `
import React from 'react';

// TDSMobileAITProvider - passthrough wrapper
export function TDSMobileAITProvider({ children }) {
  return React.createElement(React.Fragment, null, children);
}

// Default export for compatibility
export default { TDSMobileAITProvider };
`;

// ---------------------------------------------------------------------------
// @toss/tds-mobile mock — common TDS UI components
// ---------------------------------------------------------------------------

const TDS_MOBILE_MOCK_CODE = `
import React from 'react';

// --- Loader ---
export function Loader({ size = 24, color = '#333' }) {
  return React.createElement('div', {
    style: {
      width: size, height: size, border: '2px solid #eee',
      borderTopColor: color, borderRadius: '50%',
      animation: 'spin 0.8s linear infinite', display: 'inline-block',
    },
    'aria-label': 'Loading',
  });
}

// --- Badge ---
export function Badge({ children, variant = 'default', ...props }) {
  return React.createElement('span', {
    style: {
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: '12px', fontSize: '12px', fontWeight: 600,
      backgroundColor: variant === 'primary' ? '#3182f6' : '#f2f3f4',
      color: variant === 'primary' ? '#fff' : '#333',
    },
    ...props,
  }, children);
}

// --- Button ---
export function Button({ children, onClick, disabled, variant = 'primary', size = 'medium', ...props }) {
  const sizeStyles = {
    small: { padding: '6px 12px', fontSize: '13px' },
    medium: { padding: '10px 20px', fontSize: '15px' },
    large: { padding: '14px 28px', fontSize: '17px' },
  };
  return React.createElement('button', {
    onClick, disabled,
    style: {
      ...(sizeStyles[size] || sizeStyles.medium),
      backgroundColor: disabled ? '#ccc' : (variant === 'primary' ? '#3182f6' : '#f2f3f4'),
      color: variant === 'primary' ? '#fff' : '#333',
      border: 'none', borderRadius: '8px', fontWeight: 600, cursor: disabled ? 'not-allowed' : 'pointer',
      width: '100%',
    },
    ...props,
  }, children);
}

// --- FixedBottomCTA ---
export function FixedBottomCTA({ children, onClick, disabled, ...props }) {
  return React.createElement('div', {
    style: {
      position: 'fixed', bottom: 0, left: 0, right: 0,
      padding: '12px 16px', paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
      backgroundColor: '#fff', borderTop: '1px solid #eee',
    },
  }, React.createElement('button', {
    onClick, disabled,
    style: {
      width: '100%', padding: '14px', backgroundColor: disabled ? '#ccc' : '#3182f6',
      color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: 700,
      cursor: disabled ? 'not-allowed' : 'pointer',
    },
    ...props,
  }, children));
}

// --- BottomSheet ---
export function BottomSheet({ isOpen, onClose, children, title }) {
  if (!isOpen) return null;
  return React.createElement('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 10000,
      backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex',
      alignItems: 'flex-end', justifyContent: 'center',
    },
    onClick: (e) => { if (e.target === e.currentTarget) onClose?.(); },
  }, React.createElement('div', {
    style: {
      width: '100%', maxWidth: '480px', backgroundColor: '#fff',
      borderRadius: '16px 16px 0 0', padding: '20px', maxHeight: '80vh', overflowY: 'auto',
    },
  }, [
    title && React.createElement('h3', { key: 'title', style: { margin: '0 0 16px', fontSize: '18px', fontWeight: 700 } }, title),
    React.createElement('div', { key: 'content' }, children),
  ]));
}

// --- ConfirmDialog ---
export function ConfirmDialog({ isOpen, onConfirm, onCancel, title, description, confirmText = '확인', cancelText = '취소' }) {
  if (!isOpen) return null;
  return React.createElement('div', {
    style: {
      position: 'fixed', inset: 0, zIndex: 10000,
      backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    },
  }, React.createElement('div', {
    style: {
      backgroundColor: '#fff', borderRadius: '16px', padding: '24px',
      width: '280px', textAlign: 'center',
    },
  }, [
    title && React.createElement('h3', { key: 't', style: { margin: '0 0 8px', fontSize: '17px', fontWeight: 700 } }, title),
    description && React.createElement('p', { key: 'd', style: { margin: '0 0 20px', fontSize: '14px', color: '#666' } }, description),
    React.createElement('div', { key: 'btns', style: { display: 'flex', gap: '8px' } }, [
      React.createElement('button', { key: 'c', onClick: onCancel, style: { flex: 1, padding: '12px', border: '1px solid #ddd', borderRadius: '8px', background: '#fff', fontSize: '15px', cursor: 'pointer' } }, cancelText),
      React.createElement('button', { key: 'ok', onClick: onConfirm, style: { flex: 1, padding: '12px', border: 'none', borderRadius: '8px', background: '#3182f6', color: '#fff', fontSize: '15px', fontWeight: 600, cursor: 'pointer' } }, confirmText),
    ]),
  ]));
}

// --- SegmentedControl ---
export function SegmentedControl({ items, selectedIndex = 0, onChange }) {
  return React.createElement('div', {
    style: { display: 'flex', backgroundColor: '#f2f3f4', borderRadius: '8px', padding: '2px' },
  }, (items || []).map((item, i) =>
    React.createElement('button', {
      key: i, onClick: () => onChange?.(i),
      style: {
        flex: 1, padding: '8px 12px', border: 'none', borderRadius: '6px',
        backgroundColor: i === selectedIndex ? '#fff' : 'transparent',
        fontWeight: i === selectedIndex ? 600 : 400, fontSize: '14px',
        cursor: 'pointer', boxShadow: i === selectedIndex ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
      },
    }, typeof item === 'string' ? item : item?.label || '')
  ));
}

// --- Toast ---
export function Toast({ message, isOpen, onClose, duration = 3000 }) {
  React.useEffect(() => {
    if (isOpen && onClose) {
      const t = setTimeout(onClose, duration);
      return () => clearTimeout(t);
    }
  }, [isOpen, onClose, duration]);
  if (!isOpen) return null;
  return React.createElement('div', {
    style: {
      position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
      backgroundColor: '#333', color: '#fff', padding: '12px 20px',
      borderRadius: '8px', fontSize: '14px', zIndex: 10001,
    },
  }, message);
}

// --- useToast hook ---
export function useToast() {
  const [state, setState] = React.useState({ isOpen: false, message: '' });
  return {
    isOpen: state.isOpen,
    message: state.message,
    toast: (msg) => setState({ isOpen: true, message: msg }),
    close: () => setState({ isOpen: false, message: '' }),
  };
}

// --- CSS keyframes injection ---
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

// --- Default export ---
export default {
  Loader, Badge, Button, FixedBottomCTA, BottomSheet,
  ConfirmDialog, SegmentedControl, Toast, useToast,
};
`;
