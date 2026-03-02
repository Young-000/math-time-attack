/**
 * 프로모션 API 테스트 페이지 (임시)
 *
 * 토스 앱에서 /promo-test 경로로 접근하여:
 * 1. appLogin → userKey 정상 획득 확인
 * 2. 테스트 프로모션 코드로 API 호출
 * 3. 콘솔의 "프로모션 테스트하기" 완료
 *
 * 테스트 완료 후 이 페이지와 라우트를 제거할 것.
 */

import { useState, useEffect } from 'react';
import {
  getCachedUserId,
  isAppsInTossEnvironment,
  initializeUserIdentity,
  resetUserIdentityCache,
} from '@infrastructure/userIdentity';
import { claimPromotion, resetPromotionClaims } from '@domain/services/promotionService';

const TEST_PROMO_CODE = 'TEST_01KHRY05GMV8Q502AMZPFZX6J1';
const TEST_AMOUNT = 100;

type StepStatus = 'idle' | 'loading' | 'success' | 'error';

export default function PromoTestPage(): JSX.Element {
  const [isAit, setIsAit] = useState<boolean | null>(null);
  const [userKey, setUserKey] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<StepStatus>('idle');
  const [authError, setAuthError] = useState<string | null>(null);
  const [promoStatus, setPromoStatus] = useState<StepStatus>('idle');
  const [promoResult, setPromoResult] = useState<string | null>(null);

  useEffect(() => {
    setIsAit(isAppsInTossEnvironment());
    const cached = getCachedUserId();
    if (cached) {
      setUserKey(cached);
      setAuthStatus('success');
    }
  }, []);

  const handleAuth = async (): Promise<void> => {
    setAuthStatus('loading');
    setAuthError(null);
    try {
      // 기존 캐시 초기화 → 강제로 appLogin 재실행
      resetUserIdentityCache();
      const key = await initializeUserIdentity();
      setUserKey(key);
      setAuthStatus('success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setAuthError(msg);
      setAuthStatus('error');
    }
  };

  const handlePromoTest = async (): Promise<void> => {
    if (!userKey) return;
    setPromoStatus('loading');
    setPromoResult(null);

    const result = await claimPromotion(TEST_PROMO_CODE, TEST_AMOUNT, userKey);
    if (result.success) {
      setPromoStatus('success');
      setPromoResult(result.message);
    } else {
      setPromoStatus('error');
      setPromoResult(result.error);
    }
  };

  const handleReset = (): void => {
    resetPromotionClaims();
    setPromoStatus('idle');
    setPromoResult(null);
  };

  const handleDirectApiCall = async (): Promise<void> => {
    if (!userKey) return;
    setPromoStatus('loading');
    setPromoResult(null);

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/promotion`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          promotionCode: TEST_PROMO_CODE,
          amount: TEST_AMOUNT,
          userKey,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setPromoStatus('success');
        setPromoResult(`SUCCESS! key: ${data.key}`);
      } else {
        setPromoStatus('error');
        setPromoResult(`[${data.error}] ${data.message}`);
      }
    } catch (err) {
      setPromoStatus('error');
      setPromoResult(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', fontSize: 14 }}>
      <h2 style={{ marginBottom: 16 }}>Promotion API Test</h2>

      <Section title="1. Environment">
        <Row label="AIT" value={isAit === null ? '...' : isAit ? 'YES' : 'NO (web)'} />
        <Row label="Code" value={TEST_PROMO_CODE} />
        <Row label="Amount" value={`${TEST_AMOUNT} pt`} />
      </Section>

      <Section title="2. Auth (appLogin → userKey)">
        <Row label="Status" value={authStatus} />
        <Row label="userKey" value={userKey ?? '(none)'} />
        {authError && <Row label="Error" value={authError} />}
        <button
          onClick={handleAuth}
          disabled={authStatus === 'loading'}
          style={btnStyle}
        >
          {authStatus === 'loading' ? 'Loading...' : 'Run appLogin'}
        </button>
      </Section>

      <Section title="3. Promotion Test">
        <Row label="Status" value={promoStatus} />
        {promoResult && (
          <div style={{
            padding: 8,
            margin: '8px 0',
            background: promoStatus === 'success' ? '#d4edda' : '#f8d7da',
            borderRadius: 4,
            wordBreak: 'break-all',
          }}>
            {promoResult}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handlePromoTest}
            disabled={!userKey || promoStatus === 'loading'}
            style={btnStyle}
          >
            claimPromotion (서비스)
          </button>
          <button
            onClick={handleDirectApiCall}
            disabled={!userKey || promoStatus === 'loading'}
            style={{ ...btnStyle, background: '#007bff', color: '#fff' }}
          >
            Direct API Call
          </button>
          <button onClick={handleReset} style={{ ...btnStyle, background: '#6c757d', color: '#fff' }}>
            Reset Claims
          </button>
        </div>
      </Section>

      <Section title="Debug Info">
        <Row label="SUPABASE_URL" value={import.meta.env.VITE_SUPABASE_URL ?? 'NOT SET'} />
        <Row label="ANON_KEY" value={import.meta.env.VITE_SUPABASE_ANON_KEY ? `${String(import.meta.env.VITE_SUPABASE_ANON_KEY).substring(0, 20)}...` : 'NOT SET'} />
        <Row label="userKey full" value={userKey ?? '-'} />
        <Row label="isLocal" value={userKey?.startsWith('local-') || userKey?.startsWith('temp-') ? 'YES (fallback) - appLogin 실패!' : userKey ? 'NO (real userKey)' : '-'} />
      </Section>

      {userKey?.startsWith('local-') && (
        <div style={{ padding: 12, background: '#fff3cd', borderRadius: 8, margin: '0 0 16px', fontSize: 13 }}>
          <strong>appLogin이 실패하여 로컬 fallback ID를 사용 중입니다.</strong><br />
          &quot;Run appLogin&quot; 버튼을 눌러 캐시를 초기화하고 다시 시도하세요.<br />
          토스 앱 내에서만 appLogin이 동작합니다.
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <div style={{ marginBottom: 20, border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14 }}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
      <span style={{ fontWeight: 'bold', minWidth: 100 }}>{label}:</span>
      <span style={{ wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #ccc',
  borderRadius: 6,
  background: '#f8f9fa',
  cursor: 'pointer',
  fontSize: 13,
};
