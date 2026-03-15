/**
 * 내부 포인트("별") 상태 관리 훅
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getPointBalance,
  getPointHistory,
  grantGameCompleteBonus,
  grantRoundBonus,
  grantRewardedAdBonus,
  grantMissionReward,
  grantDailyLoginBonus,
  type PointBalance,
  type PointTransaction,
} from '@domain/services/pointService';
import {
  GAME_COMPLETE_STARS,
  ROUND_BONUS_STARS,
  REWARDED_AD_STARS,
  DAILY_LOGIN_STARS,
} from '@constants/points';
import { getCachedUserId } from '@infrastructure/userIdentity';

type UsePointsReturn = {
  balance: number;
  totalEarned: number;
  isLoading: boolean;
  history: PointTransaction[];
  refresh: () => Promise<void>;
  onGameComplete: () => Promise<number>;
  onRoundComplete: () => Promise<number>;
  onRewardedAd: () => Promise<number>;
  onMissionReward: (amount: number, title: string) => Promise<number>;
  checkDailyLogin: () => Promise<number | null>;
};

function isValidUserKey(key: string | null): key is string {
  return !!key && !key.startsWith('local-') && !key.startsWith('temp-');
}

export function usePoints(): UsePointsReturn {
  const [pointBalance, setPointBalance] = useState<PointBalance>({
    balance: 0, totalEarned: 0, totalSpent: 0,
  });
  const [history, setHistory] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userKey = getCachedUserId();

  const refresh = useCallback(async () => {
    if (!isValidUserKey(userKey)) {
      setIsLoading(false);
      return;
    }
    try {
      const [bal, hist] = await Promise.all([
        getPointBalance(userKey),
        getPointHistory(userKey),
      ]);
      setPointBalance(bal);
      setHistory(hist);
    } catch {
      // 조회 실패 무시
    } finally {
      setIsLoading(false);
    }
  }, [userKey]);

  useEffect(() => { refresh(); }, [refresh]);

  const onGameComplete = useCallback(async (): Promise<number> => {
    if (!isValidUserKey(userKey)) return 0;
    const newBalance = await grantGameCompleteBonus(userKey);
    setPointBalance((prev) => ({
      ...prev,
      balance: newBalance,
      totalEarned: prev.totalEarned + GAME_COMPLETE_STARS,
    }));
    return newBalance;
  }, [userKey]);

  const onRoundComplete = useCallback(async (): Promise<number> => {
    if (!isValidUserKey(userKey)) return 0;
    const newBalance = await grantRoundBonus(userKey);
    setPointBalance((prev) => ({
      ...prev,
      balance: newBalance,
      totalEarned: prev.totalEarned + ROUND_BONUS_STARS,
    }));
    return newBalance;
  }, [userKey]);

  const onRewardedAd = useCallback(async (): Promise<number> => {
    if (!isValidUserKey(userKey)) return 0;
    const newBalance = await grantRewardedAdBonus(userKey);
    setPointBalance((prev) => ({
      ...prev,
      balance: newBalance,
      totalEarned: prev.totalEarned + REWARDED_AD_STARS,
    }));
    return newBalance;
  }, [userKey]);

  const onMissionReward = useCallback(async (amount: number, title: string): Promise<number> => {
    if (!isValidUserKey(userKey)) return 0;
    const newBalance = await grantMissionReward(userKey, amount, title);
    setPointBalance((prev) => ({
      ...prev,
      balance: newBalance,
      totalEarned: prev.totalEarned + amount,
    }));
    return newBalance;
  }, [userKey]);

  const checkDailyLogin = useCallback(async (): Promise<number | null> => {
    if (!isValidUserKey(userKey)) return null;
    const result = await grantDailyLoginBonus(userKey);
    if (result !== null) {
      setPointBalance((prev) => ({
        ...prev,
        balance: result,
        totalEarned: prev.totalEarned + DAILY_LOGIN_STARS,
      }));
    }
    return result;
  }, [userKey]);

  return {
    balance: pointBalance.balance,
    totalEarned: pointBalance.totalEarned,
    isLoading,
    history,
    refresh,
    onGameComplete,
    onRoundComplete,
    onRewardedAd,
    onMissionReward,
    checkDailyLogin,
  };
}
