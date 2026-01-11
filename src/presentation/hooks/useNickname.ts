/**
 * useNickname Hook
 * 닉네임 관리 (조회, 변경)
 */

import { useState, useEffect, useCallback } from 'react';
import { getNickname, updateNickname } from '@data/recordService';
import { getCurrentUserId } from '@infrastructure/rankingService';

interface UseNicknameReturn {
  nickname: string;
  isLoading: boolean;
  error: string | null;
  updateUserNickname: (newNickname: string) => Promise<boolean>;
  refreshNickname: () => Promise<void>;
}

export function useNickname(): UseNicknameReturn {
  const [nickname, setNickname] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [odlId, setOdlId] = useState<string | null>(null);

  // 초기 로드
  useEffect(() => {
    const loadNickname = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const userId = await getCurrentUserId();
        setOdlId(userId);

        const loadedNickname = await getNickname(userId || undefined);
        setNickname(loadedNickname);
      } catch (err) {
        setError('닉네임을 불러오는데 실패했습니다.');
        console.error('Failed to load nickname:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadNickname();
  }, []);

  // 닉네임 변경
  const updateUserNickname = useCallback(async (newNickname: string): Promise<boolean> => {
    if (!newNickname.trim()) {
      setError('닉네임을 입력해주세요.');
      return false;
    }

    if (newNickname.length > 20) {
      setError('닉네임은 20자 이하로 입력해주세요.');
      return false;
    }

    setError(null);

    try {
      const success = await updateNickname(newNickname, odlId || undefined);
      if (success) {
        setNickname(newNickname);
        return true;
      }
      setError('닉네임 저장에 실패했습니다.');
      return false;
    } catch (err) {
      setError('닉네임 변경 중 오류가 발생했습니다.');
      console.error('Failed to update nickname:', err);
      return false;
    }
  }, [odlId]);

  // 닉네임 새로고침
  const refreshNickname = useCallback(async () => {
    setIsLoading(true);
    try {
      const loadedNickname = await getNickname(odlId || undefined);
      setNickname(loadedNickname);
    } catch (err) {
      console.error('Failed to refresh nickname:', err);
    } finally {
      setIsLoading(false);
    }
  }, [odlId]);

  return {
    nickname,
    isLoading,
    error,
    updateUserNickname,
    refreshNickname,
  };
}
