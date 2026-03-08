/**
 * 내부 포인트("별") 상태 관리 훅
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getPointBalance,
  getPointHistory,
  grantGameCompleteBonus,
  grantDailyLoginBonus,
  type PointBalance,
  type PointTransaction,
} from '@domain/services/pointService';
import { getCachedUserId } from '@infrastructure/userIdentity';

type UsePointsReturn = {
  balance: number;
  totalEarned: number;
  isLoading: boolean;
  history: PointTransaction[];
  refresh: () => Promise<void>;
  onGameComplete: () => Promise<number>;
  checkDailyLogin: () => Promise<number | null>;
};

export function usePoints(): UsePointsReturn {
  const [pointBalance, setPointBalance] = useState<PointBalance>({
    balance: 0, totalEarned: 0, totalSpent: 0,
  });
  const [history, setHistory] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const userKey = getCachedUserId();

  const refresh = useCallback(async () => {
    if (!userKey || userKey.startsWith('local-') || userKey.startsWith('temp-')) {
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
    if (!userKey || userKey.startsWith('local-') || userKey.startsWith('temp-')) return 0;
    const newBalance = await grantGameCompleteBonus(userKey);
    setPointBalance((prev) => ({
      ...prev,
      balance: newBalance,
      totalEarned: prev.totalEarned + 10,
    }));
    return newBalance;
  }, [userKey]);

  const checkDailyLogin = useCallback(async (): Promise<number | null> => {
    if (!userKey || userKey.startsWith('local-') || userKey.startsWith('temp-')) return null;
    const result = await grantDailyLoginBonus(userKey);
    if (result !== null) {
      setPointBalance((prev) => ({
        ...prev,
        balance: result,
        totalEarned: prev.totalEarned + 20,
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
    checkDailyLogin,
  };
}
