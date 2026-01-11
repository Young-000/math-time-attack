/**
 * 결과 페이지
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DIFFICULTY_CONFIG, type DifficultyType } from '@domain/entities';
import { saveBestRecord, isNewRecord, getBestRecord, getMyRank } from '@data/recordService';
import { getCurrentUserId } from '@infrastructure/rankingService';
import { formatTime } from '@lib/utils';

interface LocationState {
  difficulty: DifficultyType;
  elapsedTime: number;
}

export function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const [isNew, setIsNew] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [isLoadingRank, setIsLoadingRank] = useState(false);

  useEffect(() => {
    if (!state) {
      navigate('/');
      return;
    }

    const { difficulty, elapsedTime } = state;

    // Check and save record
    if (isNewRecord(difficulty, elapsedTime)) {
      saveBestRecord(difficulty, elapsedTime);
      setIsNew(true);
    }

    // Fetch current rank
    const fetchRank = async () => {
      setIsLoadingRank(true);
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          const rank = await getMyRank(userId, difficulty, 'multiplication');
          setMyRank(rank);
        }
      } catch (err) {
        console.error('Failed to fetch rank:', err);
      } finally {
        setIsLoadingRank(false);
      }
    };
    fetchRank();
  }, [state, navigate]);

  if (!state) {
    return null;
  }

  const { difficulty, elapsedTime } = state;
  const config = DIFFICULTY_CONFIG[difficulty];
  const bestRecord = getBestRecord(difficulty);

  const handleRetry = () => {
    navigate(`/game/${difficulty}`);
  };

  const handleHome = () => {
    navigate('/');
  };

  const handleRanking = () => {
    navigate(`/ranking/${difficulty}`);
  };

  return (
    <div className="page result-page">
      <main className="result-content">
        {isNew && (
          <div className="new-record-banner">
            <span className="new-record-icon">🎉</span>
            <span className="new-record-text">신기록!</span>
          </div>
        )}

        <div className="result-card">
          <h2 className="result-difficulty">{config.label}</h2>
          <div className="result-time">
            <span className="time-label">소요 시간</span>
            <span className="time-value">{formatTime(elapsedTime)}</span>
          </div>

          {bestRecord && !isNew && (
            <div className="best-record">
              <span className="best-label">최고 기록</span>
              <span className="best-value">{formatTime(bestRecord.time)}</span>
            </div>
          )}

          <div className="current-rank">
            <span className="rank-label">현재 순위</span>
            {isLoadingRank ? (
              <span className="rank-value loading">로딩 중...</span>
            ) : myRank ? (
              <span className="rank-value">{myRank}위</span>
            ) : (
              <span className="rank-value none">순위 없음</span>
            )}
          </div>
        </div>

        <div className="result-actions">
          <button className="action-btn primary" onClick={handleRetry}>
            다시 하기
          </button>
          <button className="action-btn secondary" onClick={handleRanking}>
            랭킹 보기
          </button>
          <button className="action-btn tertiary" onClick={handleHome}>
            난이도 선택
          </button>
        </div>
      </main>
    </div>
  );
}
