/**
 * Game Center SDK 훅
 * - 리더보드 점수 제출
 * - 리더보드 열기
 * - 프로필 조회
 */

import { useState, useCallback } from 'react';
import {
  submitGameCenterLeaderBoardScore,
  openGameCenterLeaderboard,
  getGameCenterGameProfile,
} from '@apps-in-toss/web-framework';

interface UseGameCenterReturn {
  isSupported: boolean;
  isSubmitting: boolean;
  submitScore: (score: number) => Promise<boolean>;
  openLeaderboard: () => Promise<void>;
}

export function useGameCenter(): UseGameCenterReturn {
  const [isSupported] = useState(() => {
    try {
      // Game Center SDK는 함수 존재 여부로 지원 확인
      return typeof submitGameCenterLeaderBoardScore === 'function';
    } catch {
      return false;
    }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitScore = useCallback(async (score: number): Promise<boolean> => {
    if (!isSupported) return false;

    setIsSubmitting(true);
    try {
      const result = await submitGameCenterLeaderBoardScore({ score: String(score) });
      return result?.statusCode === 'SUCCESS';
    } catch (err) {
      console.error('Game Center submit error:', err);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [isSupported]);

  const openLeaderboard = useCallback(async (): Promise<void> => {
    if (!isSupported) return;
    try {
      await openGameCenterLeaderboard();
    } catch (err) {
      console.error('Game Center leaderboard error:', err);
    }
  }, [isSupported]);

  return { isSupported, isSubmitting, submitScore, openLeaderboard };
}

/**
 * Game Center 프로필 조회
 */
export async function getGameCenterProfile(): Promise<{ nickname: string; profileImageUri: string } | null> {
  try {
    if (typeof getGameCenterGameProfile !== 'function') return null;
    const result = await getGameCenterGameProfile();
    if (result?.statusCode === 'SUCCESS') {
      return { nickname: result.nickname, profileImageUri: result.profileImageUri };
    }
    return null;
  } catch {
    return null;
  }
}
