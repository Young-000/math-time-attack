/**
 * 타임어택 결과 페이지
 */

import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DIFFICULTY_CONFIG, Operation, type DifficultyType, type OperationType } from '@domain/entities';
import { getTimeAttackBestScore } from '@presentation/hooks/useTimeAttack';
import { checkIn, getStreakMilestoneMessage } from '@domain/services/streakService';
import {
  saveTimeAttackRecordToServer,
  getTimeAttackRankInfo,
  isOnlineMode,
} from '@data/recordService';
import { getCurrentUserId } from '@infrastructure/rankingService';

interface LocationState {
  difficulty: DifficultyType;
  correctCount: number;
  wrongCount: number;
  operation?: OperationType;
}

export function TimeAttackResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const [isNewRecord, setIsNewRecord] = useState(false);
  const [streakMilestone, setStreakMilestone] = useState<{ emoji: string; message: string } | null>(null);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [isLoadingRank, setIsLoadingRank] = useState(false);
  const hasProcessedRef = useRef(false);

  const online = isOnlineMode();

  useEffect(() => {
    if (!state) {
      navigate('/');
      return;
    }

    // StrictMode 중복 실행 방지
    if (hasProcessedRef.current) {
      return;
    }
    hasProcessedRef.current = true;

    const { difficulty, correctCount, wrongCount, operation = Operation.MULTIPLICATION } = state;

    // 신기록 확인
    const bestScore = getTimeAttackBestScore(difficulty, operation);
    if (bestScore === null || correctCount > bestScore) {
      setIsNewRecord(true);
    }

    // 연속 출석 체크
    const newStreak = checkIn();
    const milestone = getStreakMilestoneMessage(newStreak);
    if (milestone) {
      setStreakMilestone(milestone);
    }

    // 서버에 기록 저장 및 순위 조회
    const saveAndFetchRank = async () => {
      if (!online) return;

      setIsLoadingRank(true);
      try {
        const userId = await getCurrentUserId();
        if (!userId) return;

        // 서버에 기록 저장
        await saveTimeAttackRecordToServer(
          userId,
          difficulty,
          correctCount,
          wrongCount,
          operation
        );

        // 순위 조회
        const rankInfo = await getTimeAttackRankInfo(userId, difficulty, operation);
        setMyRank(rankInfo.rank);
        setTotalPlayers(rankInfo.totalPlayers);
      } catch (err) {
        console.error('Failed to save/fetch rank:', err);
      } finally {
        setIsLoadingRank(false);
      }
    };

    saveAndFetchRank();
  }, [state, navigate, online]);

  if (!state) {
    return null;
  }

  const { difficulty, correctCount, wrongCount, operation = Operation.MULTIPLICATION } = state;
  const config = DIFFICULTY_CONFIG[difficulty];
  const bestScore = getTimeAttackBestScore(difficulty, operation);
  const totalAttempts = correctCount + wrongCount;
  const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

  const handleRetry = () => {
    navigate(`/time-attack/${difficulty}`);
  };

  const handleHome = () => {
    navigate('/');
  };

  // 점수 평가 메시지
  const getScoreMessage = () => {
    if (correctCount >= 50) return { emoji: '🏆', text: '전설적인 기록!' };
    if (correctCount >= 40) return { emoji: '🔥', text: '엄청나요!' };
    if (correctCount >= 30) return { emoji: '⭐', text: '훌륭해요!' };
    if (correctCount >= 20) return { emoji: '👍', text: '잘했어요!' };
    if (correctCount >= 10) return { emoji: '💪', text: '좋은 시작!' };
    return { emoji: '🎯', text: '더 도전해보세요!' };
  };

  const scoreMessage = getScoreMessage();

  return (
    <div className="page result-page time-attack-result-page">
      <main className="result-content">
        {isNewRecord && (
          <div className="new-record-banner">
            <span className="new-record-icon">🎉</span>
            <span className="new-record-text">신기록!</span>
          </div>
        )}

        {streakMilestone && (
          <div className="streak-milestone-banner">
            <span className="streak-milestone-icon">{streakMilestone.emoji}</span>
            <span className="streak-milestone-text">{streakMilestone.message}</span>
          </div>
        )}

        <div className="result-card time-attack-result-card">
          <div className="time-attack-badge-result">⚡ 타임어택</div>
          <h2 className="result-difficulty">{config.label}</h2>

          <div className="result-score">
            <span className="score-emoji">{scoreMessage.emoji}</span>
            <div className="score-main">
              <span className="score-value">{correctCount}</span>
              <span className="score-label">문제 정답</span>
            </div>
            <span className="score-message">{scoreMessage.text}</span>
          </div>

          <div className="result-stats">
            <div className="stat-item">
              <span className="stat-label">정답률</span>
              <span className="stat-value">{accuracy}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">오답</span>
              <span className="stat-value">{wrongCount}개</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">총 시도</span>
              <span className="stat-value">{totalAttempts}개</span>
            </div>
          </div>

          {bestScore !== null && bestScore !== correctCount && (
            <div className="best-record">
              <span className="best-label">최고 기록</span>
              <span className="best-value">{bestScore}문제</span>
            </div>
          )}

          {online && (
            <div className="current-rank">
              <span className="rank-label">타임어택 랭킹</span>
              <span className="rank-value">
                {isLoadingRank ? (
                  <span className="rank-loading">...</span>
                ) : myRank ? (
                  <>
                    <span className="rank-number">🏅 {myRank}위</span>
                    {totalPlayers > 0 && (
                      <span className="rank-total">/ {totalPlayers}명 중</span>
                    )}
                  </>
                ) : (
                  <span className="rank-none">순위 집계 중</span>
                )}
              </span>
            </div>
          )}
        </div>

        <div className="result-actions">
          <button className="action-btn primary" onClick={handleRetry}>
            다시 도전하기
          </button>
          <button className="action-btn tertiary" onClick={handleHome}>
            🏠 홈으로
          </button>
        </div>
      </main>
    </div>
  );
}
