/**
 * 웰컴 프로모션 훅
 * 첫 게임 완료 시 토스 포인트 자동 지급.
 * 중복 방지는 promotionService에서 처리 (localStorage + 서버).
 */

import { useCallback, useRef, useState } from 'react';
import { claimPromotion, type PromotionResult } from '@domain/services/promotionService';
import { WELCOME_PROMO_CODE, WELCOME_PROMO_AMOUNT } from '@constants/promotion';

const AUTO_DISMISS_MS = 5_000;

type UsePromotionReturn = {
  promotionResult: PromotionResult | null;
  showPromotionToast: boolean;
  showPromotionError: boolean;
  promotionErrorMessage: string;
  tryClaimWelcome: (userKey: string) => Promise<PromotionResult>;
};

export function usePromotion(): UsePromotionReturn {
  const [promotionResult, setPromotionResult] = useState<PromotionResult | null>(null);
  const [showPromotionToast, setShowPromotionToast] = useState(false);
  const [showPromotionError, setShowPromotionError] = useState(false);
  const [promotionErrorMessage, setPromotionErrorMessage] = useState('');
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const tryClaimWelcome = useCallback(async (userKey: string): Promise<PromotionResult> => {
    const result = await claimPromotion(WELCOME_PROMO_CODE, WELCOME_PROMO_AMOUNT, userKey);
    setPromotionResult(result);

    if (result.success) {
      setShowPromotionToast(true);

      // 자동 닫기
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setShowPromotionToast(false);
      }, AUTO_DISMISS_MS);
    } else if (!result.error.includes('이미 지급된')) {
      // 이미 지급된 프로모션은 에러 표시하지 않음
      setPromotionErrorMessage(result.error);
      setShowPromotionError(true);

      clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => {
        setShowPromotionError(false);
      }, AUTO_DISMISS_MS);
    }

    return result;
  }, []);

  return {
    promotionResult,
    showPromotionToast,
    showPromotionError,
    promotionErrorMessage,
    tryClaimWelcome,
  };
}
