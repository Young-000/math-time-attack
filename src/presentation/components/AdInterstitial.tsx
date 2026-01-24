/**
 * AdInterstitial 컴포넌트
 * 게임 종료 후 표시되는 전면 광고 플레이스홀더
 */

import { useState, useEffect, useCallback, useRef } from 'react';

interface AdInterstitialProps {
  onClose: () => void;
  skipDelay?: number; // 스킵 버튼 활성화까지 대기 시간 (초)
}

const ADSENSE_PUBLISHER_ID = import.meta.env.VITE_ADSENSE_PUBLISHER_ID || '';
const INTERSTITIAL_SLOT = import.meta.env.VITE_AD_INTERSTITIAL_SLOT || '';
const FREQUENCY_CAP_KEY = 'ad-interstitial-last-shown';
const FREQUENCY_CAP_GAMES = 3; // N게임당 1회 표시

declare global {
  interface Window {
    adsbygoogle?: object[];
  }
}

/**
 * 광고 표시 주기 확인 (빈도 제한)
 */
function shouldShowAd(): boolean {
  try {
    const lastShown = localStorage.getItem(FREQUENCY_CAP_KEY);
    if (!lastShown) return true;

    const data = JSON.parse(lastShown);
    const gamesPlayed = data.gamesPlayed || 0;

    return gamesPlayed >= FREQUENCY_CAP_GAMES;
  } catch {
    return true;
  }
}

/**
 * 광고 표시 기록 저장
 */
function recordAdShown(): void {
  try {
    localStorage.setItem(FREQUENCY_CAP_KEY, JSON.stringify({
      lastShown: Date.now(),
      gamesPlayed: 0,
    }));
  } catch {
    // 무시
  }
}

/**
 * 게임 플레이 카운트 증가
 */
export function incrementGameCount(): void {
  try {
    const lastShown = localStorage.getItem(FREQUENCY_CAP_KEY);
    if (!lastShown) {
      localStorage.setItem(FREQUENCY_CAP_KEY, JSON.stringify({
        lastShown: 0,
        gamesPlayed: 1,
      }));
      return;
    }

    const data = JSON.parse(lastShown);
    data.gamesPlayed = (data.gamesPlayed || 0) + 1;
    localStorage.setItem(FREQUENCY_CAP_KEY, JSON.stringify(data));
  } catch {
    // 무시
  }
}

/**
 * 전면 광고 컴포넌트
 */
export function AdInterstitial({ onClose, skipDelay = 5 }: AdInterstitialProps) {
  const [countdown, setCountdown] = useState(skipDelay);
  const [canSkip, setCanSkip] = useState(false);
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);

  // Publisher ID가 없거나 빈도 제한에 걸리면 바로 닫기
  useEffect(() => {
    if (!ADSENSE_PUBLISHER_ID || !INTERSTITIAL_SLOT || !shouldShowAd()) {
      onClose();
      return;
    }

    // 광고 표시 기록
    recordAdShown();
  }, [onClose]);

  // 카운트다운 타이머
  useEffect(() => {
    if (!ADSENSE_PUBLISHER_ID || !INTERSTITIAL_SLOT) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanSkip(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // AdSense 로드
  useEffect(() => {
    if (!ADSENSE_PUBLISHER_ID || !INTERSTITIAL_SLOT || isLoaded.current) {
      return;
    }

    try {
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
        isLoaded.current = true;
      }
    } catch (err) {
      console.error('AdSense interstitial error:', err);
    }
  }, []);

  const handleSkip = useCallback(() => {
    if (canSkip) {
      onClose();
    }
  }, [canSkip, onClose]);

  // Publisher ID가 없으면 렌더링하지 않음
  if (!ADSENSE_PUBLISHER_ID || !INTERSTITIAL_SLOT) {
    return null;
  }

  return (
    <div className="ad-interstitial-overlay" role="dialog" aria-modal="true">
      <div className="ad-interstitial-container">
        <div className="ad-interstitial-header">
          <span className="ad-interstitial-label">광고</span>
          <button
            className="ad-interstitial-skip"
            onClick={handleSkip}
            disabled={!canSkip}
            aria-label={canSkip ? '광고 건너뛰기' : `${countdown}초 후 건너뛰기`}
          >
            {canSkip ? '건너뛰기 ✕' : `${countdown}초 후 건너뛰기`}
          </button>
        </div>

        <div className="ad-interstitial-content">
          <ins
            ref={adRef}
            className="adsbygoogle"
            style={{ display: 'block', width: '300px', height: '250px' }}
            data-ad-client={ADSENSE_PUBLISHER_ID}
            data-ad-slot={INTERSTITIAL_SLOT}
            data-ad-format="rectangle"
          />
        </div>
      </div>
    </div>
  );
}
