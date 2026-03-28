import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { initializeUserIdentity, getCachedUserId } from '@infrastructure/userIdentity';

export function IntroPage(): JSX.Element {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  // 로그인 상태면 바로 /game으로 리다이렉트 (홈 버튼 재진입 대응)
  useEffect(() => {
    if (getCachedUserId()) {
      navigate('/game', { replace: true });
    }
  }, [navigate]);

  const handleStart = useCallback(async () => {
    setIsLoading(true);
    try {
      await initializeUserIdentity();
    } catch {
      console.warn('Login failed, proceeding');
    }
    navigate('/game');
    setIsLoading(false);
  }, [navigate]);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '24px', background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
    }}>
      <div style={{ fontSize: '64px', marginBottom: '16px' }}>&#x2716;&#xFE0F;</div>
      <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
        구구단 챌린지
      </h1>
      <p style={{ fontSize: '16px', color: '#64748b', marginBottom: '32px', textAlign: 'center', lineHeight: 1.5 }}>
        구구단 타임어택으로 두뇌를 훈련하세요!{'\n'}
        난이도별 도전과 랭킹 경쟁이 기다립니다.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '280px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'white', borderRadius: '12px' }}>
          <span style={{ fontSize: '24px' }}>&#x1F3AE;</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>난이도별 도전</p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>초급부터 고급까지</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'white', borderRadius: '12px' }}>
          <span style={{ fontSize: '24px' }}>&#x23F1;&#xFE0F;</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>타임어택 모드</p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>시간 제한 속 최고 기록 도전</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: 'white', borderRadius: '12px' }}>
          <span style={{ fontSize: '24px' }}>&#x1F3C6;</span>
          <div>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>랭킹 경쟁</p>
            <p style={{ fontSize: '12px', color: '#94a3b8' }}>전국 유저와 순위 경쟁</p>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={handleStart}
        disabled={isLoading}
        style={{
          width: '100%', maxWidth: '280px', padding: '16px', borderRadius: '14px', border: 'none',
          background: '#3182F6', color: 'white', fontSize: '16px', fontWeight: 700, cursor: 'pointer',
        }}
      >
        {isLoading ? '로그인 중...' : '토스로 시작하기'}
      </button>
      <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '12px', textAlign: 'center' }}>
        토스 계정으로 간편하게 시작할 수 있어요
      </p>
    </div>
  );
}
