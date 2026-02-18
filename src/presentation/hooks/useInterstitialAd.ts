/**
 * 전면 광고 훅 (v2 API)
 * - 3판마다 1회, 하루 최대 10회
 * - 결과 페이지에서 게임 종료 시 표시
 */

import { useCallback, useState } from 'react';
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';
import {
  shouldShowInterstitial,
  recordInterstitialShown,
  incrementGameCount,
} from '@domain/services/adFrequencyService';

const AD_GROUP_ID = 'ait.v2.live.c3e1be11131c45f6';

interface UseInterstitialAdReturn {
  isAdSupported: boolean;
  showInterstitialIfNeeded: (onComplete: () => void) => void;
}

export function useInterstitialAd(): UseInterstitialAdReturn {
  const [isAdSupported] = useState(() => {
    try {
      return loadFullScreenAd.isSupported?.() === true;
    } catch {
      return false;
    }
  });

  const showInterstitialIfNeeded = useCallback((onComplete: () => void) => {
    // 빈도 체크
    if (!isAdSupported || !shouldShowInterstitial()) {
      onComplete();
      return;
    }

    try {
      const cleanup = loadFullScreenAd({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (event) => {
          if (event.type === 'loaded') {
            cleanup();
            try {
              showFullScreenAd({
                options: { adGroupId: AD_GROUP_ID },
                onEvent: (showEvent) => {
                  if (showEvent.type === 'dismissed' || showEvent.type === 'failedToShow') {
                    recordInterstitialShown();
                    onComplete();
                  }
                },
                onError: () => {
                  onComplete();
                },
              });
            } catch {
              onComplete();
            }
          }
        },
        onError: () => {
          onComplete();
        },
      });
    } catch {
      onComplete();
    }
  }, [isAdSupported]);

  return { isAdSupported, showInterstitialIfNeeded };
}

// re-export for convenience
export { incrementGameCount };
