/**
 * 약관/개인정보 동의 상태 관리
 *
 * 콘솔 검토 요구사항: 비게임 + 토스 로그인 + 토스 포인트 화폐 시스템 →
 * 첫 진입 시 약관/개인정보 동의 필수. 동의 상태는 재진입 시 스킵.
 */

const CONSENT_KEY = 'math-time-attack-legal-consent-v1';

export type ConsentState = {
  termsAccepted: boolean;
  privacyAccepted: boolean;
  acceptedAt: string;
};

export function getConsent(): ConsentState | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    return raw ? (JSON.parse(raw) as ConsentState) : null;
  } catch {
    return null;
  }
}

export function hasConsented(): boolean {
  const state = getConsent();
  return !!state && state.termsAccepted && state.privacyAccepted;
}

export function saveConsent(): ConsentState {
  const state: ConsentState = {
    termsAccepted: true,
    privacyAccepted: true,
    acceptedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  } catch {
    // localStorage 저장 실패 — 동의 객체는 그대로 반환
  }
  return state;
}

export function clearConsent(): void {
  try {
    localStorage.removeItem(CONSENT_KEY);
  } catch {
    // localStorage 접근 실패
  }
}

/** 약관 / 개인정보 처리방침 공개 URL (Vercel 정적 호스팅) */
export const LEGAL_URLS = {
  terms: '/legal/terms.html',
  privacy: '/legal/privacy.html',
} as const;
