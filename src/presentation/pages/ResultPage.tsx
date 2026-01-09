/**
 * 결과 페이지
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DIFFICULTY_CONFIG, type DifficultyType } from '@domain/entities';
import { saveBestRecord, isNewRecord, getBestRecord } from '@data/recordService';
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
        </div>

        <div className="result-actions">
          <button className="action-btn primary" onClick={handleRetry}>
            다시 하기
          </button>
          <button className="action-btn secondary" onClick={handleHome}>
            난이도 선택
          </button>
        </div>
      </main>
    </div>
  );
}
