/**
 * 결과 페이지
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DIFFICULTY_CONFIG, Operation, type DifficultyType, type OperationType } from '@domain/entities';
import { saveRecord, isNewRecord, getBestRecord, getMyRankInfo } from '@data/recordService';
import { getCurrentUserId } from '@infrastructure/rankingService';
import { formatTime } from '@lib/utils';
import { ShareButton, HeartDisplay, NoHeartsModal } from '@presentation/components';
import { saveDailyChallengeCompletion } from '@domain/services/dailyChallengeService';
import { checkIn, getStreakMilestoneMessage } from '@domain/services/streakService';
import { useHeartSystem } from '@presentation/hooks/useHeartSystem';

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
  const [streakMilestone, setStreakMilestone] = useState<{ emoji: string; message: string } | null>(null);
  const hasProcessedRef = useRef(false);

  // 하트 시스템 통합 훅
  const {
    heartInfo,
    showNoHeartsModal,
    showChargeSuccess,
    showAdError,
    isAdSupported,
    isAdLoading,
    setShowNoHeartsModal,
    handleWatchAdForHearts,
    handleShareForHearts,
    tryConsumeHeart,
  } = useHeartSystem();

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

        // 연속 출석 체크
        const newStreak = checkIn();
        const milestone = getStreakMilestoneMessage(newStreak);
        if (milestone) {
          setStreakMilestone(milestone);
        }
      } catch (err) {
        console.error('Failed to process result:', err);
      } finally {
        setIsLoadingRank(false);
      }
    };

    processResult();
  }, [state, navigate]);

  // state에서 값 추출 (null일 수 있으므로 기본값 처리)
  const difficulty = state?.difficulty ?? 'easy';
  const elapsedTime = state?.elapsedTime ?? 0;
  const operation = state?.operation ?? Operation.MULTIPLICATION;

  // 충전 후 게임 재시작
  const startGameAfterCharge = useCallback(() => {
    const consumed = tryConsumeHeart();
    if (consumed) {
      navigate(`/game/${difficulty}`);
    }
  }, [tryConsumeHeart, navigate, difficulty]);

  // 다시하기 - 하트 체크 후 게임 시작
  const handleRetry = useCallback(() => {
    const consumed = tryConsumeHeart();
    if (!consumed) return;
    navigate(`/game/${difficulty}`);
  }, [navigate, difficulty, tryConsumeHeart]);

  const handleHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleRanking = useCallback(() => {
    navigate(`/ranking/${difficulty}`);
  }, [navigate, difficulty]);

  if (!state) {
    return null;
  }

  const config = DIFFICULTY_CONFIG[difficulty];
  const bestRecord = getBestRecord(difficulty, operation);


  return (
    <div className="page result-page">
      <main className="result-content">
        {isNew && (
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
            <span className="rank-label">내 순위</span>
            {isLoadingRank ? (
              <span className="rank-value loading">로딩 중...</span>
            ) : myRank ? (
              <div className="rank-value">
                <span className="rank-number">{myRank}위</span>
                {totalPlayers > 0 && (
                  <span className="rank-total">전체 {totalPlayers}명 중</span>
                )}
              </div>
            ) : (
              <span className="rank-value none">첫 도전!</span>
            )}
          </div>
        </div>

        {/* 하트 정보 표시 */}
        <div className="result-hearts-info">
          <HeartDisplay heartInfo={heartInfo} showCount showTimer />
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

      {/* 하트 부족 모달 */}
      {showNoHeartsModal && (
        <NoHeartsModal
          heartInfo={heartInfo}
          isAdSupported={isAdSupported}
          isAdLoading={isAdLoading}
          onWatchAd={() => handleWatchAdForHearts(startGameAfterCharge)}
          onShare={() => handleShareForHearts('구구단 실력을 테스트해보세요! 나와 대결해요!', startGameAfterCharge)}
          onClose={() => setShowNoHeartsModal(false)}
        />
      )}

      {/* 충전 성공 토스트 */}
      {showChargeSuccess && (
        <div className="charge-success-toast">
          ✅ 하트가 충전되었어요!
        </div>
      )}

      {/* 광고 에러 토스트 */}
      {showAdError && (
        <div className="charge-error-toast">
          광고를 불러올 수 없어요. 잠시 후 다시 시도해주세요.
        </div>
      )}
    </div>
  );
}
