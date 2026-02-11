/**
 * 보상형 광고 Hook
 * Apps-in-Toss GoogleAdMob API 사용
 *
 * 공식 패턴: 버튼 클릭 → load → loaded 이벤트 → cleanup → 즉시 show
 * @see https://developers-apps-in-toss.toss.im/bedrock/reference/framework/광고/loadAppsInTossAdMob.md
 * @see https://developers-apps-in-toss.toss.im/bedrock/reference/framework/광고/showAppsInTossAdMob.md
 */

import { useCallback, useRef, useState } from 'react';
import { GoogleAdMob } from '@apps-in-toss/web-framework';

// 광고 그룹 ID - 앱인토스 콘솔에서 발급
const AD_GROUP_ID = 'ait.v2.live.c3e1be11131c45f6';

interface RewardedAdCallbacks {
  onRewarded: () => void;
  onDismiss?: () => void;
  onError?: (error: Error) => void;
}

interface UseRewardedAdReturn {
  isAdSupported: boolean;
  isAdLoading: boolean;
  loadAndShowAd: (callbacks: RewardedAdCallbacks) => void;
}

export function useRewardedAd(): UseRewardedAdReturn {
  const [isAdSupported] = useState(() => {
    const loadSupported = GoogleAdMob.loadAppsInTossAdMob.isSupported?.() === true;
    const showSupported = GoogleAdMob.showAppsInTossAdMob.isSupported?.() === true;
    return loadSupported && showSupported;
  });
  const [isAdLoading, setIsAdLoading] = useState(false);

  const rewardCallbackRef = useRef<(() => void) | undefined>();
  const dismissCallbackRef = useRef<(() => void) | undefined>();
  const errorCallbackRef = useRef<((error: Error) => void) | undefined>();
  const hasReceivedRewardRef = useRef(false);

  // 공식 패턴: load → loaded → cleanup → 즉시 show (한 플로우)
  const loadAndShowAd = useCallback(({ onRewarded, onDismiss, onError }: RewardedAdCallbacks) => {
    if (!isAdSupported) {
      onError?.(new Error('광고가 지원되지 않는 환경입니다.'));
      return;
    }

    if (isAdLoading) {
      return;
    }

    rewardCallbackRef.current = onRewarded;
    dismissCallbackRef.current = onDismiss;
    errorCallbackRef.current = onError;
    hasReceivedRewardRef.current = false;

    setIsAdLoading(true);

    try {
      const cleanup = GoogleAdMob.loadAppsInTossAdMob({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (event) => {
          switch (event.type) {
            case 'loaded':
              // 로드 완료 → cleanup → 즉시 show (공식 패턴)
              cleanup();

              try {
                GoogleAdMob.showAppsInTossAdMob({
                  options: { adGroupId: AD_GROUP_ID },
                  onEvent: (showEvent) => {
                    switch (showEvent.type) {
                      case 'requested':
                        // 광고 보여주기 요청 완료
                        break;
                      case 'show':
                        break;
                      case 'impression':
                        break;
                      case 'clicked':
                        break;
                      case 'userEarnedReward':
                        // 보상 획득
                        hasReceivedRewardRef.current = true;
                        rewardCallbackRef.current?.();
                        break;
                      case 'dismissed':
                        // 광고 닫힘
                        setIsAdLoading(false);
                        dismissCallbackRef.current?.();
                        break;
                      case 'failedToShow':
                        setIsAdLoading(false);
                        errorCallbackRef.current?.(new Error('광고 표시에 실패했습니다.'));
                        break;
                    }
                  },
                  onError: (showError) => {
                    console.error('[AdMob] show 오류:', showError);
                    setIsAdLoading(false);
                    errorCallbackRef.current?.(
                      showError instanceof Error ? showError : new Error(String(showError))
                    );
                  },
                });
              } catch (showErr) {
                console.error('[AdMob] show 호출 오류:', showErr);
                setIsAdLoading(false);
                errorCallbackRef.current?.(
                  showErr instanceof Error ? showErr : new Error('광고 표시 실패')
                );
              }
              break;
          }
        },
        onError: (loadError) => {
          console.error('[AdMob] load 오류:', loadError);
          setIsAdLoading(false);
          errorCallbackRef.current?.(
            loadError instanceof Error ? loadError : new Error(String(loadError))
          );
        },
      });
    } catch (error) {
      console.error('[AdMob] load 호출 오류:', error);
      setIsAdLoading(false);
      onError?.(error instanceof Error ? error : new Error('광고 로드 실패'));
    }
  }, [isAdSupported, isAdLoading]);

  return {
    isAdSupported,
    isAdLoading,
    loadAndShowAd,
  };
}
