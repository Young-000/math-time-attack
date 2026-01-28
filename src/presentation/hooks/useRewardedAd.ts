/**
 * 보상형 광고 Hook
 * Apps-in-Toss GoogleAdMob API 사용
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import { GoogleAdMob } from '@apps-in-toss/web-bridge';

// 광고 그룹 ID - 앱인토스 콘솔에서 발급
const AD_GROUP_ID = 'ait.v2.live.c3e1be11131c45f6';

interface RewardedAdCallbacks {
  onRewarded: () => void;
  onDismiss?: () => void;
  onError?: (error: Error) => void;
}

interface UseRewardedAdReturn {
  isAdSupported: boolean;
  isAdLoaded: boolean;
  isAdLoading: boolean;
  loadAd: () => void;
  showAd: (callbacks: RewardedAdCallbacks) => void;
}

export function useRewardedAd(): UseRewardedAdReturn {
  const [isAdSupported, setIsAdSupported] = useState(true);
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);

  const cleanupRef = useRef<(() => void) | undefined>();
  const rewardCallbackRef = useRef<(() => void) | undefined>();
  const dismissCallbackRef = useRef<(() => void) | undefined>();
  const errorCallbackRef = useRef<((error: Error) => void) | undefined>();

  // 광고 지원 여부 확인
  useEffect(() => {
    const supported = GoogleAdMob.loadAppsInTossAdMob.isSupported?.() !== false;
    setIsAdSupported(supported);
  }, []);

  // 광고 로드
  const loadAd = useCallback(() => {
    if (!isAdSupported) {
      console.warn('광고가 지원되지 않는 환경입니다.');
      return;
    }

    if (isAdLoading || isAdLoaded) {
      return;
    }

    setIsAdLoading(true);

    try {
      const cleanup = GoogleAdMob.loadAppsInTossAdMob({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (event) => {
          if (event.type === 'loaded') {
            setIsAdLoaded(true);
            setIsAdLoading(false);
            // 로드 완료 후 cleanup 호출
            cleanupRef.current?.();
          }
        },
        onError: (error) => {
          console.error('광고 로드 실패:', error);
          setIsAdLoading(false);
          setIsAdLoaded(false);
        },
      });

      cleanupRef.current = cleanup;
    } catch (error) {
      console.error('광고 로드 중 오류:', error);
      setIsAdLoading(false);
    }
  }, [isAdSupported, isAdLoading, isAdLoaded]);

  // 광고 표시
  const showAd = useCallback(({ onRewarded, onDismiss, onError }: RewardedAdCallbacks) => {
    rewardCallbackRef.current = onRewarded;
    dismissCallbackRef.current = onDismiss;
    errorCallbackRef.current = onError;

    if (!isAdSupported) {
      console.warn('광고가 지원되지 않습니다.');
      onError?.(new Error('광고가 지원되지 않습니다.'));
      return;
    }

    if (!isAdLoaded) {
      console.warn('광고가 아직 로드되지 않았습니다.');
      onError?.(new Error('광고가 아직 로드되지 않았습니다.'));
      return;
    }

    try {
      GoogleAdMob.showAppsInTossAdMob({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (event) => {
          switch (event.type) {
            case 'userEarnedReward':
              // 사용자가 광고 시청 완료 - 보상 지급
              rewardCallbackRef.current?.();
              break;
            case 'dismissed':
              // 광고 닫힘
              dismissCallbackRef.current?.();
              // 다음 광고를 위해 상태 리셋
              setIsAdLoaded(false);
              break;
            case 'failedToShow':
              // 광고 표시 실패
              errorCallbackRef.current?.(new Error('광고 표시에 실패했습니다.'));
              setIsAdLoaded(false);
              break;
          }
        },
        onError: (error) => {
          console.error('광고 표시 오류:', error);
          errorCallbackRef.current?.(error);
          setIsAdLoaded(false);
        },
      });
    } catch (error) {
      console.error('광고 표시 중 오류:', error);
      onError?.(error instanceof Error ? error : new Error('광고 표시 실패'));
    }
  }, [isAdSupported, isAdLoaded]);

  // 컴포넌트 언마운트 시 cleanup
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  return {
    isAdSupported,
    isAdLoaded,
    isAdLoading,
    loadAd,
    showAd,
  };
}
