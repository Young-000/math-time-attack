/**
 * 내부 포인트("별") 상태 관리 훅
 * localStorage 기반 — userKey 없이도 항상 동작
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
  grantStreakBonus,
  getStreakBonusAmount,
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
  onStreakBonus: (streakDays: number) => Promise<number | null>;
};

export function usePoints(): UsePointsReturn {
  const [pointBalance, setPointBalance] = useState<PointBalance>({
    balance: 0, totalEarned: 0, totalSpent: 0,
  });
  const [history, setHistory] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userKey = getCachedUserId() ?? '';

  const refresh = useCallback(async () => {
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
    const newBalance = await grantGameCompleteBonus(userKey);
    setPointBalance((prev) => ({
      ...prev,
      balance: newBalance,
      totalEarned: prev.totalEarned + GAME_COMPLETE_STARS,
    }));
    return newBalance;
  }, [userKey]);

  const onRoundComplete = useCallback(async (): Promise<number> => {
    const newBalance = await grantRoundBonus(userKey);
    setPointBalance((prev) => ({
      ...prev,
      balance: newBalance,
      totalEarned: prev.totalEarned + ROUND_BONUS_STARS,
    }));
    return newBalance;
  }, [userKey]);

  const onRewardedAd = useCallback(async (): Promise<number> => {
    const newBalance = await grantRewardedAdBonus(userKey);
    setPointBalance((prev) => ({
      ...prev,
      balance: newBalance,
      totalEarned: prev.totalEarned + REWARDED_AD_STARS,
    }));
    return newBalance;
  }, [userKey]);

  const onMissionReward = useCallback(async (amount: number, title: string): Promise<number> => {
    const newBalance = await grantMissionReward(userKey, amount, title);
    setPointBalance((prev) => ({
      ...prev,
      balance: newBalance,
      totalEarned: prev.totalEarned + amount,
    }));
    return newBalance;
  }, [userKey]);

  const checkDailyLogin = useCallback(async (): Promise<number | null> => {
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

  const onStreakBonus = useCallback(async (streakDays: number): Promise<number | null> => {
    const result = await grantStreakBonus(userKey, streakDays);
    if (result !== null) {
      const amount = getStreakBonusAmount(streakDays);
      setPointBalance((prev) => ({
        ...prev,
        balance: result,
        totalEarned: prev.totalEarned + amount,
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
    onStreakBonus,
  };
}
