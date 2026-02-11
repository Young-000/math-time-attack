/**
 * 하트 시스템 통합 훅
 * - 하트 상태 관리 (주기적 업데이트)
 * - 광고 시청으로 풀충전
 * - 공유하기로 풀충전
 * - 광고 미리 로드
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getHeartInfo,
  consumeHeart,
  refillHearts,
  MAX_HEARTS,
  type HeartInfo,
} from '@domain/services/heartService';
import { useRewardedAd } from './useRewardedAd';
import { useContactsViral } from './useContactsViral';
import { share } from '@apps-in-toss/web-framework';

interface UseHeartSystemReturn {
  heartInfo: HeartInfo;
  showNoHeartsModal: boolean;
  showChargeSuccess: boolean;
  showAdError: boolean;
  isAdSupported: boolean;
  isAdLoaded: boolean;
  isAdLoading: boolean;
  setShowNoHeartsModal: (show: boolean) => void;
  handleWatchAdForHearts: (onSuccess?: () => void) => void;
  handleShareForHearts: (shareMessage: string, onSuccess?: () => void) => void;
  tryConsumeHeart: () => boolean;
  refreshHeartInfo: () => void;
}

export function useHeartSystem(): UseHeartSystemReturn {
  const [heartInfo, setHeartInfo] = useState<HeartInfo>(getHeartInfo());
  const [showNoHeartsModal, setShowNoHeartsModal] = useState(false);
  const [showChargeSuccess, setShowChargeSuccess] = useState(false);
  const [showAdError, setShowAdError] = useState(false);

  const { isAdSupported, isAdLoaded, isAdLoading, loadAd, showAd } = useRewardedAd();
  const { isConfigured: isContactsViralConfigured, openContactsViral } = useContactsViral();

  // 하트 정보 주기적 업데이트
  useEffect(() => {
    const interval = setInterval(() => {
      setHeartInfo(getHeartInfo());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // 광고 미리 로드
  useEffect(() => {
    if (isAdSupported && !isAdLoaded && !isAdLoading) {
      loadAd();
    }
  }, [isAdSupported, isAdLoaded, isAdLoading, loadAd]);

  const refreshHeartInfo = useCallback(() => {
    setHeartInfo(getHeartInfo());
  }, []);

  const showChargeSuccessToast = useCallback(() => {
    setShowChargeSuccess(true);
    setTimeout(() => setShowChargeSuccess(false), 2000);
  }, []);

  const showAdErrorToast = useCallback(() => {
    setShowAdError(true);
    setTimeout(() => setShowAdError(false), 2500);
  }, []);

  // 광고 시청으로 하트 풀충전
  const handleWatchAdForHearts = useCallback((onSuccess?: () => void) => {
    showAd({
      onRewarded: () => {
        refillHearts();
        setHeartInfo(getHeartInfo());
        setShowNoHeartsModal(false);
        showChargeSuccessToast();
        onSuccess?.();
        loadAd();
      },
      onDismiss: () => {},
      onError: (error) => {
        console.error('Ad error:', error);
        showAdErrorToast();
        // 에러 후 다시 로드 시도
        loadAd();
      },
    });
  }, [showAd, loadAd, showChargeSuccessToast, showAdErrorToast]);

  // 공유하기로 하트 풀충전
  const handleShareForHearts = useCallback((shareMessage: string, onSuccess?: () => void) => {
    const onShareSuccess = () => {
      refillHearts();
      setHeartInfo(getHeartInfo());
      setShowNoHeartsModal(false);
      showChargeSuccessToast();
      onSuccess?.();
    };

    if (isContactsViralConfigured) {
      openContactsViral({
        onRewarded: () => {
          onShareSuccess();
        },
        onClose: () => {},
        onError: (error) => {
          console.error('ContactsViral error:', error);
        },
      });
    } else {
      share({ message: shareMessage })
        .then(() => {
          onShareSuccess();
        })
        .catch((error) => {
          console.log('Share cancelled or failed:', error);
        });
    }
  }, [isContactsViralConfigured, openContactsViral, showChargeSuccessToast]);

  // 하트 1개 소모 시도
  const tryConsumeHeart = useCallback((): boolean => {
    const currentHearts = getHeartInfo();
    if (currentHearts.count <= 0) {
      setShowNoHeartsModal(true);
      return false;
    }

    const used = consumeHeart();
    if (!used) {
      setShowNoHeartsModal(true);
      return false;
    }

    setHeartInfo(getHeartInfo());
    return true;
  }, []);

  return {
    heartInfo,
    showNoHeartsModal,
    showChargeSuccess,
    showAdError,
    isAdSupported,
    isAdLoaded,
    isAdLoading,
    setShowNoHeartsModal,
    handleWatchAdForHearts,
    handleShareForHearts,
    tryConsumeHeart,
    refreshHeartInfo,
  };
}

export { MAX_HEARTS };
