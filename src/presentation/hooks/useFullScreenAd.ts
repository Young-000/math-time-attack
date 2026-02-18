/**
 * v2 전면/보상형 광고 통합 훅
 * loadFullScreenAd + showFullScreenAd (apps-in-toss v2 API)
 *
 * v1 GoogleAdMob.loadAppsInTossAdMob/showAppsInTossAdMob 대체
 * 동일한 adGroupId 재사용 가능
 */

import { useCallback, useRef, useState } from 'react';
import { loadFullScreenAd, showFullScreenAd } from '@apps-in-toss/web-framework';

const AD_GROUP_ID = 'ait.v2.live.c3e1be11131c45f6';

interface FullScreenAdCallbacks {
  onRewarded: () => void;
  onDismiss?: () => void;
  onError?: (error: Error) => void;
}

interface UseFullScreenAdReturn {
  isAdSupported: boolean;
  isAdLoading: boolean;
  loadAndShowAd: (callbacks: FullScreenAdCallbacks) => void;
}

export function useFullScreenAd(): UseFullScreenAdReturn {
  const [isAdSupported] = useState(() => {
    try {
      return loadFullScreenAd.isSupported?.() === true;
    } catch {
      return false;
    }
  });
  const [isAdLoading, setIsAdLoading] = useState(false);

  const rewardCallbackRef = useRef<(() => void) | undefined>();
  const dismissCallbackRef = useRef<(() => void) | undefined>();
  const errorCallbackRef = useRef<((error: Error) => void) | undefined>();

  const loadAndShowAd = useCallback(({ onRewarded, onDismiss, onError }: FullScreenAdCallbacks) => {
    if (!isAdSupported) {
      onError?.(new Error('광고가 지원되지 않는 환경입니다.'));
      return;
    }

    if (isAdLoading) return;

    rewardCallbackRef.current = onRewarded;
    dismissCallbackRef.current = onDismiss;
    errorCallbackRef.current = onError;
    setIsAdLoading(true);

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
                  switch (showEvent.type) {
                    case 'userEarnedReward':
                      rewardCallbackRef.current?.();
                      break;
                    case 'dismissed':
                      setIsAdLoading(false);
                      dismissCallbackRef.current?.();
                      break;
                    case 'failedToShow':
                      setIsAdLoading(false);
                      errorCallbackRef.current?.(new Error('광고 표시에 실패했습니다.'));
                      break;
                  }
                },
                onError: (err) => {
                  setIsAdLoading(false);
                  errorCallbackRef.current?.(err instanceof Error ? err : new Error(String(err)));
                },
              });
            } catch (showErr) {
              setIsAdLoading(false);
              errorCallbackRef.current?.(showErr instanceof Error ? showErr : new Error('광고 표시 실패'));
            }
          }
        },
        onError: (loadErr) => {
          setIsAdLoading(false);
          errorCallbackRef.current?.(loadErr instanceof Error ? loadErr : new Error(String(loadErr)));
        },
      });
    } catch (error) {
      setIsAdLoading(false);
      onError?.(error instanceof Error ? error : new Error('광고 로드 실패'));
    }
  }, [isAdSupported, isAdLoading]);

  return { isAdSupported, isAdLoading, loadAndShowAd };
}
