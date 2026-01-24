/**
 * 결과 페이지
 */

import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DIFFICULTY_CONFIG, Operation, type DifficultyType, type OperationType } from '@domain/entities';
import { saveRecord, isNewRecord, getBestRecord, getMyRankInfo } from '@data/recordService';
import { getCurrentUserId } from '@infrastructure/rankingService';
import { formatTime } from '@lib/utils';
import { ShareButton } from '@presentation/components';
import { saveDailyChallengeCompletion } from '@domain/services/dailyChallengeService';

interface LocationState {
  difficulty: DifficultyType;
  elapsedTime: number;
  operation?: OperationType;
  isDaily?: boolean;
}

export function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState | null;

  const [isNew, setIsNew] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [totalPlayers, setTotalPlayers] = useState<number>(0);
  const [isLoadingRank, setIsLoadingRank] = useState(false);
  const hasProcessedRef = useRef(false);

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

    const { difficulty, elapsedTime, operation = Operation.MULTIPLICATION, isDaily = false } = state;

    // Save record and fetch rank
    const processResult = async () => {
      setIsLoadingRank(true);
      try {
        // 개발 환경용 로컬 ID 생성/조회
        let userId = await getCurrentUserId();
        if (!userId) {
          userId = localStorage.getItem('dev_odl_id');
          if (!userId) {
            userId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            localStorage.setItem('dev_odl_id', userId);
          }
        }

        // 신기록 여부 확인
        const newRecord = isNewRecord(difficulty, elapsedTime, operation);
        if (newRecord) {
          setIsNew(true);
        }

        // 로컬 + 서버에 기록 저장
        await saveRecord(difficulty, elapsedTime, operation, userId);

        // 일일 챌린지 완료 기록 저장
        if (isDaily) {
          saveDailyChallengeCompletion(difficulty, elapsedTime);
        }

        // 랭킹 정보 조회
        const rankInfo = await getMyRankInfo(userId, difficulty, operation);
        setMyRank(rankInfo.rank);
        setTotalPlayers(rankInfo.totalPlayers);
      } catch (err) {
        console.error('Failed to process result:', err);
      } finally {
        setIsLoadingRank(false);
      }
    };

    processResult();
  }, [state, navigate]);

  if (!state) {
    return null;
  }

  const { difficulty, elapsedTime, operation = Operation.MULTIPLICATION } = state;
  const config = DIFFICULTY_CONFIG[difficulty];
  const bestRecord = getBestRecord(difficulty, operation);

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
              <span className="rank-value">{myRank}위 / {totalPlayers}명</span>
            ) : (
              <span className="rank-value none">순위 없음</span>
            )}
          </div>
        </div>

        <div className="result-actions">
          <ShareButton
            difficulty={difficulty}
            time={elapsedTime}
            operation={operation}
            rank={myRank}
            totalPlayers={totalPlayers}
          />
          <button className="action-btn primary" onClick={handleRetry}>
            다시 하기
          </button>
          <button className="action-btn secondary" onClick={handleRanking}>
            랭킹 보기
          </button>
          <button className="action-btn tertiary" onClick={handleHome}>
            🏠 홈으로
          </button>
        </div>
      </main>
    </div>
  );
}
