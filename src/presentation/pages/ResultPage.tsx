/**
 * 결과 페이지
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DIFFICULTY_CONFIG, Operation, type DifficultyType, type OperationType } from '@domain/entities';
import { saveRecord, isNewRecord, getBestRecord, getMyRankInfo } from '@data/recordService';
import { getCurrentUserId } from '@infrastructure/rankingService';
import { formatTime } from '@lib/utils';
import { ShareButton, HeartDisplay, NoHeartsModal, AchievementModal, BannerAd, MissionCompletedToast } from '@presentation/components';
import { saveDailyChallengeCompletion } from '@domain/services/dailyChallengeService';
import { checkIn, getStreakMilestoneMessage } from '@domain/services/streakService';
import { useHeartSystem } from '@presentation/hooks/useHeartSystem';
import { useInterstitialAd, incrementGameCount } from '@presentation/hooks/useInterstitialAd';
import { checkAllAchievements, markAchieved } from '@domain/services/achievementService';
import { addHearts } from '@domain/services/heartService';
import { usePoints } from '@presentation/hooks/usePoints';
import { GAME_COMPLETE_STARS, ROUND_BONUS_STARS } from '@constants/points';
import type { AchievementDefinition } from '@domain/services/achievementDefinitions';
import {
  checkMissions,
  recordGameComplete,
  recordDailyChallengeCleared,
  recordRankUpdate,
  incrementDailyGameCount,
  markDailyChallengeComplete,
  type NewlyCompletedMission,
} from '@domain/services/missionService';

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
  const [newAchievements, setNewAchievements] = useState<AchievementDefinition[]>([]);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [showStarToast, setShowStarToast] = useState(false);
  const [starToastText, setStarToastText] = useState('');
  const [newMissions, setNewMissions] = useState<NewlyCompletedMission[]>([]);
  const [showMissionToast, setShowMissionToast] = useState(false);
  const hasProcessedRef = useRef(false);

  // 전면 광고
  const { showInterstitialIfNeeded } = useInterstitialAd();

  // 별 시스템
  const { onGameComplete, onRoundComplete, onMissionReward, onStreakBonus } = usePoints();

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
        const userId = await getCurrentUserId();
        if (!userId) return;

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

        // 게임 카운트 증가 (전면 광고 빈도 체크용)
        incrementGameCount();

        // 업적 체크
        const achieved = checkAllAchievements({
          gamesPlayed: 1,
          elapsedTime,
          difficulty,
          streakDays: newStreak,
        });
        if (achieved.length > 0) {
          achieved.forEach((a) => {
            markAchieved(a.key);
            if (a.heartReward > 0) {
              addHearts(a.heartReward);
            }
          });
          setNewAchievements(achieved);
          setShowAchievementModal(true);
        }

        // 게임 완료 별 지급 (+5별) + 라운드 보너스 (+3별)
        Promise.all([onGameComplete(), onRoundComplete()]).then(([gameBal]) => {
          if (gameBal > 0) {
            setStarToastText(`+${GAME_COMPLETE_STARS}별 (클리어) +${ROUND_BONUS_STARS}별 (라운드)`);
            setShowStarToast(true);
            setTimeout(() => setShowStarToast(false), 3000);
          }
        }).catch(() => {});

        // 미션 통계 업데이트 및 체크
        recordGameComplete(difficulty, elapsedTime, false, true);
        incrementDailyGameCount();
        if (isDaily) {
          recordDailyChallengeCleared();
          markDailyChallengeComplete();
        }

        // 랭킹 업데이트 (미션용)
        if (rankInfo.rank) {
          recordRankUpdate(rankInfo.rank);
        }

        // 트랙 미션 달성 체크 + 별 적립
        const completedMissions = checkMissions(newStreak, elapsedTime);

        if (completedMissions.length > 0) {
          setNewMissions(completedMissions);
          setShowMissionToast(true);
          for (const m of completedMissions) {
            onMissionReward(m.reward, m.title).catch(() => {});
          }
        }

        // 연속 출석 보너스 (일일 1회)
        onStreakBonus(newStreak).catch(() => {});
      } catch (err) {
        console.error('Failed to process result:', err);
      } finally {
        setIsLoadingRank(false);
      }
    };

    processResult();
  }, [state, navigate, onGameComplete, onRoundComplete, onStreakBonus]);

  // state에서 값 추출 (null일 수 있으므로 기본값 처리)
  const difficulty = state?.difficulty ?? 'easy';
  const elapsedTime = state?.elapsedTime ?? 0;
  const operation = state?.operation ?? Operation.MULTIPLICATION;

  // 다시하기 - 전면 광고 표시 후 하트 체크 → 게임 시작
  const handleRetry = useCallback(() => {
    showInterstitialIfNeeded(() => {
      const consumed = tryConsumeHeart();
      if (!consumed) return;
      navigate(`/game/${difficulty}`);
    });
  }, [navigate, difficulty, tryConsumeHeart, showInterstitialIfNeeded]);

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

          {/* 별 보상 표시 */}
          <div className="star-reward">
            <span className="rank-label">클리어 보상</span>
            <div className="rank-value">
              <span className="star-reward-text">
                ⭐ +{GAME_COMPLETE_STARS}별 (클리어) +{ROUND_BONUS_STARS}별 (라운드)
              </span>
            </div>
          </div>
        </div>

        {/* 하트 정보 표시 */}
        <div className="result-hearts-info">
          <HeartDisplay heartInfo={heartInfo} showCount showTimer />
        </div>

        {/* 배너 광고 */}
        <BannerAd className="banner-ad-result" />

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
          onWatchAd={() => handleWatchAdForHearts()}
          onShare={() => handleShareForHearts('구구단 실력을 테스트해보세요! 나와 대결해요!')}
          onClose={() => setShowNoHeartsModal(false)}
        />
      )}

      {/* 미션 달성 토스트 */}
      {showMissionToast && (
        <MissionCompletedToast
          missions={newMissions}
          onClose={() => setShowMissionToast(false)}
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

      {/* 별 획득 토스트 */}
      {showStarToast && (
        <div className="charge-success-toast">
          {starToastText}
        </div>
      )}

      {/* 업적 달성 모달 */}
      {showAchievementModal && (
        <AchievementModal
          achievements={newAchievements}
          onClose={() => setShowAchievementModal(false)}
        />
      )}
    </div>
  );
}
