/**
 * 공유 버튼 컴포넌트
 */

import { useState, useCallback } from 'react';
import { shareResult, type ShareOptions } from '@domain/services/shareService';
import { Toast } from './Toast';

interface ShareButtonProps {
  difficulty: ShareOptions['difficulty'];
  time: ShareOptions['time'];
  operation?: ShareOptions['operation'];
  rank?: ShareOptions['rank'];
  totalPlayers?: ShareOptions['totalPlayers'];
  className?: string;
}

export function ShareButton({
  difficulty,
  time,
  operation,
  rank,
  totalPlayers,
  className = '',
}: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  const handleShare = useCallback(async () => {
    if (isSharing) return;

    setIsSharing(true);
    try {
      const result = await shareResult({
        difficulty,
        time,
        operation,
        rank,
        totalPlayers,
      });

      if (result.success) {
        if (result.method === 'clipboard') {
          setToastMessage('링크가 복사되었습니다!');
          setShowToast(true);
        }
        // native 공유 성공 시는 OS에서 피드백 제공
      } else {
        if (result.method === 'native') {
          // 사용자가 공유 취소함 - 아무것도 안 함
        } else {
          setToastMessage('공유에 실패했습니다');
          setShowToast(true);
        }
      }
    } catch {
      setToastMessage('공유에 실패했습니다');
      setShowToast(true);
    } finally {
      setIsSharing(false);
    }
  }, [difficulty, time, operation, rank, totalPlayers, isSharing]);

  const handleCloseToast = useCallback(() => {
    setShowToast(false);
  }, []);

  return (
    <>
      <button
        className={`action-btn share ${className}`}
        onClick={handleShare}
        disabled={isSharing}
        aria-label="결과 공유하기"
      >
        {isSharing ? '공유 중...' : '📤 결과 공유하기'}
      </button>

      <Toast
        message={toastMessage}
        isVisible={showToast}
        onClose={handleCloseToast}
      />
    </>
  );
}
