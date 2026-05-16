import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { closeView } from '@apps-in-toss/web-framework';
import { initializeUserIdentity, getCachedUserId } from '@infrastructure/userIdentity';
import { hasConsented, saveConsent, LEGAL_URLS } from '@infrastructure/consent';

export function IntroPage(): JSX.Element {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [error, setError] = useState('');

  // 로그인 상태면 바로 /game으로 리다이렉트 (홈 버튼 재진입 대응)
  useEffect(() => {
    if (getCachedUserId() && hasConsented()) {
      navigate('/game', { replace: true });
    } else if (hasConsented()) {
      // 동의는 했지만 캐시 만료 — 체크박스 상태 복원
      setTermsChecked(true);
      setPrivacyChecked(true);
    }
  }, [navigate]);

  const bothChecked = termsChecked && privacyChecked;

  const handleStart = useCallback(async () => {
    if (!bothChecked) {
      setError('약관과 개인정보 처리방침에 동의해 주세요.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      saveConsent();
      await initializeUserIdentity();
      navigate('/game');
    } catch {
      console.warn('Login failed, closing app');
      closeView();
    } finally {
      setIsLoading(false);
    }
  }, [navigate, bothChecked]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '24px', background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
    }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>{'❎'}</div>
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
        구구단 챌린지
      </h1>
      <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '32px', textAlign: 'center', lineHeight: 1.5 }}>
        구구단 타임어택으로 두뇌를 훈련하세요!{'\n'}
        난이도별 도전과 랭킹 경쟁이 기다립니다.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '280px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'white', borderRadius: '12px' }}>
          <span style={{ fontSize: '24px' }}>{'🎮'}</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>난이도별 도전</p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>초급부터 고급까지</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'white', borderRadius: '12px' }}>
          <span style={{ fontSize: '24px' }}>{'⏱️'}</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>타임어택 모드</p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>시간 제한 속 최고 기록 도전</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'white', borderRadius: '12px' }}>
          <span style={{ fontSize: '24px' }}>{'🏆'}</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>랭킹 경쟁</p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>전국 유저와 순위 경쟁</p>
          </div>
        </div>
      </div>

      {/* 약관 동의 영역 */}
      <div style={{
        width: '100%', maxWidth: '280px', marginBottom: '16px', padding: '14px 16px',
        background: 'white', borderRadius: '12px',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#1e293b' }}>
          <input
            type="checkbox"
            checked={termsChecked}
            onChange={(e) => setTermsChecked(e.target.checked)}
            aria-label="이용약관 동의"
            style={{ width: '18px', height: '18px', accentColor: '#3182F6' }}
          />
          <span>
            <a
              href={LEGAL_URLS.terms}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#3182F6', textDecoration: 'underline' }}
            >
              이용약관
            </a>
            에 동의합니다 (필수)
          </span>
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#1e293b' }}>
          <input
            type="checkbox"
            checked={privacyChecked}
            onChange={(e) => setPrivacyChecked(e.target.checked)}
            aria-label="개인정보 처리방침 동의"
            style={{ width: '18px', height: '18px', accentColor: '#3182F6' }}
          />
          <span>
            <a
              href={LEGAL_URLS.privacy}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#3182F6', textDecoration: 'underline' }}
            >
              개인정보 처리방침
            </a>
            에 동의합니다 (필수)
          </span>
        </label>
      </div>

      <button
        type="button"
        onClick={handleStart}
        disabled={isLoading || !bothChecked}
        aria-label={isLoading ? '로그인 진행 중' : '토스로 시작하기'}
        style={{
          width: '100%', maxWidth: '280px', padding: '16px', borderRadius: '14px', border: 'none',
          background: isLoading || !bothChecked ? '#94a3b8' : '#3182F6',
          color: 'white', fontSize: '16px', fontWeight: 700,
          cursor: isLoading || !bothChecked ? 'default' : 'pointer',
        }}
      >
        {isLoading ? '로그인 중...' : '토스로 시작하기'}
      </button>
      {error && (
        <p style={{ fontSize: '13px', color: '#ef4444', marginTop: '12px', textAlign: 'center' }}>
          {error}
        </p>
      )}
      <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px', textAlign: 'center' }}>
        토스 계정으로 간편하게 시작할 수 있어요
      </p>
    </div>
  );
}
