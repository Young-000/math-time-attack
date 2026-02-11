/**
 * 보상형 광고 Hook
 * Apps-in-Toss GoogleAdMob API 사용
 * @see https://developers-apps-in-toss.toss.im/bedrock/reference/framework/광고/loadAppsInTossAdMob.md
 * @see https://developers-apps-in-toss.toss.im/bedrock/reference/framework/광고/showAppsInTossAdMob.md
 */

import { useCallback, useEffect, useRef, useState } from 'react';
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
  isAdLoaded: boolean;
  isAdLoading: boolean;
  loadAd: () => void;
  showAd: (callbacks: RewardedAdCallbacks) => void;
}

export function useRewardedAd(): UseRewardedAdReturn {
  const [isAdSupported] = useState(() => {
    const loadSupported = GoogleAdMob.loadAppsInTossAdMob.isSupported?.() === true;
    const showSupported = GoogleAdMob.showAppsInTossAdMob.isSupported?.() === true;
    return loadSupported && showSupported;
  });
  const [isAdLoaded, setIsAdLoaded] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);

  const cleanupRef = useRef<(() => void) | undefined>();
  const rewardCallbackRef = useRef<(() => void) | undefined>();
  const dismissCallbackRef = useRef<(() => void) | undefined>();
  const errorCallbackRef = useRef<((error: Error) => void) | undefined>();
  const hasReceivedRewardRef = useRef(false);
  const loadRetryCountRef = useRef(0);

  const MAX_LOAD_RETRIES = 3;

  // 광고 로드 (레퍼런스 패턴 준수)
  const loadAd = useCallback(() => {
    // 지원 여부 명시적 체크
    if (GoogleAdMob.loadAppsInTossAdMob.isSupported?.() !== true) {
      console.warn('광고가 지원되지 않는 환경입니다.');
      return;
    }

    if (isAdLoading || isAdLoaded) {
      return;
    }

    // 연속 실패 시 재시도 제한
    if (loadRetryCountRef.current >= MAX_LOAD_RETRIES) {
      console.warn(`광고 로드 ${MAX_LOAD_RETRIES}회 실패, 재시도 중단`);
      return;
    }

    setIsAdLoading(true);

    try {
      const cleanup = GoogleAdMob.loadAppsInTossAdMob({
        options: { adGroupId: AD_GROUP_ID },
        onEvent: (event) => {
          switch (event.type) {
            case 'loaded':
              console.log('광고 로드 성공');
              setIsAdLoaded(true);
              setIsAdLoading(false);
              loadRetryCountRef.current = 0; // 성공 시 카운터 리셋
              // 로드 완료 후 cleanup 호출 (레퍼런스 패턴)
              cleanup();
              break;
          }
        },
        onError: (error) => {
          console.error('광고 로드 실패:', error);
          loadRetryCountRef.current += 1;
          setIsAdLoading(false);
          setIsAdLoaded(false);
          // 에러 시에도 cleanup 호출 (레퍼런스 패턴)
          cleanup?.();
        },
      });

      cleanupRef.current = cleanup;
    } catch (error) {
      console.error('광고 로드 중 오류:', error);
      loadRetryCountRef.current += 1;
      setIsAdLoading(false);
    }
  }, [isAdLoading, isAdLoaded]);

  // 광고 표시 (레퍼런스 패턴 준수)
  const showAd = useCallback(({ onRewarded, onDismiss, onError }: RewardedAdCallbacks) => {
    rewardCallbackRef.current = onRewarded;
    dismissCallbackRef.current = onDismiss;
    errorCallbackRef.current = onError;
    hasReceivedRewardRef.current = false;

    // 지원 여부 명시적 체크 (레퍼런스 패턴)
    if (GoogleAdMob.showAppsInTossAdMob.isSupported?.() !== true) {
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
            case 'show':
              console.log('[AdMob] 광고 컨텐츠 보여짐');
              break;
            case 'requested':
              console.log('[AdMob] 광고 보여주기 요청 완료');
              // 문서 패턴: requested에서 로드 상태 리셋
              setIsAdLoaded(false);
              break;
            case 'impression':
              console.log('[AdMob] 광고 노출');
              break;
            case 'clicked':
              console.log('[AdMob] 광고 클릭');
              break;
            case 'userEarnedReward':
              // 사용자가 광고 시청 완료 - 보상 지급 (보상형 광고)
              console.log('[AdMob] 광고 보상 획득:', event.data.unitType, event.data.unitAmount);
              hasReceivedRewardRef.current = true;
              // 콜백 즉시 호출
              if (rewardCallbackRef.current) {
                console.log('[AdMob] 보상 콜백 호출');
                rewardCallbackRef.current();
              } else {
                console.warn('[AdMob] 보상 콜백이 없음!');
              }
              break;
            case 'dismissed':
              // 광고 닫힘
              console.log('[AdMob] 광고 닫힘, 보상 받음:', hasReceivedRewardRef.current);
              dismissCallbackRef.current?.();
              // 다음 광고를 위해 상태 리셋 + 재로드 허용
              loadRetryCountRef.current = 0;
              setIsAdLoaded(false);
              break;
            case 'failedToShow':
              // 광고 표시 실패
              console.log('[AdMob] 광고 보여주기 실패');
              errorCallbackRef.current?.(new Error('광고 표시에 실패했습니다.'));
              setIsAdLoaded(false);
              break;
          }
        },
        onError: (error) => {
          console.error('[AdMob] 광고 표시 오류:', error);
          errorCallbackRef.current?.(error instanceof Error ? error : new Error(String(error)));
          setIsAdLoaded(false);
        },
      });
    } catch (error) {
      console.error('[AdMob] 광고 표시 중 오류:', error);
      onError?.(error instanceof Error ? error : new Error('광고 표시 실패'));
    }
  }, [isAdLoaded]);

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
