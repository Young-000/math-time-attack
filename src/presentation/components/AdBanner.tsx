/**
 * AdBanner 컴포넌트
 * Google AdSense 배너 광고 플레이스홀더
 */

import { useEffect, useRef } from 'react';

interface AdBannerProps {
  slot?: string;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: object[];
  }
}

const ADSENSE_PUBLISHER_ID = import.meta.env.VITE_ADSENSE_PUBLISHER_ID || '';

/**
 * Google AdSense 배너 광고 컴포넌트
 * Publisher ID가 설정되지 않으면 렌더링하지 않음
 */
export function AdBanner({ slot, className = '' }: AdBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    // Publisher ID가 없으면 광고 로드하지 않음
    if (!ADSENSE_PUBLISHER_ID || !slot) {
      return;
    }

    // 이미 로드된 경우 스킵
    if (isLoaded.current) {
      return;
    }

    try {
      // AdSense 스크립트가 로드된 경우에만 실행
      if (window.adsbygoogle) {
        window.adsbygoogle.push({});
        isLoaded.current = true;
      }
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, [slot]);

  // Publisher ID가 없으면 렌더링하지 않음
  if (!ADSENSE_PUBLISHER_ID || !slot) {
    return null;
  }

  return (
    <div className={`ad-banner-container ${className}`}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_PUBLISHER_ID}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
