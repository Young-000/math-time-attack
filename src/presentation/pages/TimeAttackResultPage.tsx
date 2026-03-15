/**
 * 타임어택 결과 페이지
 */

import { useEffect, useState, useRef, useCallback } from 'react';
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
import { useHeartSystem } from '@presentation/hooks/useHeartSystem';
import { HeartDisplay, NoHeartsModal, AchievementModal, BannerAd } from '@presentation/components';
import { useInterstitialAd, incrementGameCount } from '@presentation/hooks/useInterstitialAd';
import { usePromotion } from '@presentation/hooks/usePromotion';
import { WELCOME_PROMO_AMOUNT } from '@constants/promotion';
import { checkAllAchievements, markAchieved } from '@domain/services/achievementService';
import { addHearts } from '@domain/services/heartService';
import { usePoints } from '@presentation/hooks/usePoints';
import { GAME_COMPLETE_STARS } from '@constants/points';
import type { AchievementDefinition } from '@domain/services/achievementDefinitions';

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
  const [newAchievements, setNewAchievements] = useState<AchievementDefinition[]>([]);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const [showStarToast, setShowStarToast] = useState(false);
  const hasProcessedRef = useRef(false);

  // 전면 광고
  const { showInterstitialIfNeeded } = useInterstitialAd();

  // 웰컴 프로모션
  const { showPromotionToast, showPromotionError, promotionErrorMessage, tryClaimWelcome } = usePromotion();

  // 별 시스템
  const { onGameComplete } = usePoints();

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

    // 게임 카운트 증가
    incrementGameCount();

    // 업적 체크
    const achieved = checkAllAchievements({
      gamesPlayed: 1,
      correctStreak: correctCount,
      difficulty,
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

    // 전면 광고
    showInterstitialIfNeeded(() => {});

    // 게임 완료 별 지급
    onGameComplete().then((bal) => {
      if (bal > 0) {
        setShowStarToast(true);
        setTimeout(() => setShowStarToast(false), 3000);
      }
    }).catch(() => {});

    // 서버에 기록 저장 및 순위 조회
    const saveAndFetchRank = async () => {
      // 웰컴 프로모션 (온/오프라인 무관하게 시도)
      try {
        const userId = await getCurrentUserId();
        if (userId) {
          tryClaimWelcome(userId).catch((err) => {
            console.warn('프로모션 지급 실패:', err);
          });
        }
      } catch {
        // 프로모션 실패가 게임 플로우를 막지 않음
      }

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
  }, [state, navigate, online, showInterstitialIfNeeded, tryClaimWelcome, onGameComplete]);

  // state에서 값 추출 (null일 수 있으므로 기본값 처리)
  const difficulty = state?.difficulty ?? 'easy';
  const correctCount = state?.correctCount ?? 0;
  const wrongCount = state?.wrongCount ?? 0;
  const operation = state?.operation ?? Operation.MULTIPLICATION;

  // 다시하기 - 하트 체크 후 게임 시작
  const handleRetry = useCallback(() => {
    const consumed = tryConsumeHeart();
    if (!consumed) return;
    navigate(`/time-attack/${difficulty}`);
  }, [navigate, difficulty, tryConsumeHeart]);

  const handleHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  if (!state) {
    return null;
  }

  const config = DIFFICULTY_CONFIG[difficulty];
  const bestScore = getTimeAttackBestScore(difficulty, operation);
  const totalAttempts = correctCount + wrongCount;
  const accuracy = totalAttempts > 0 ? Math.round((correctCount / totalAttempts) * 100) : 0;

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

        {/* 하트 정보 표시 */}
        <div className="result-hearts-info">
          <HeartDisplay heartInfo={heartInfo} showCount showTimer />
        </div>

        {/* 배너 광고 */}
        <BannerAd className="banner-ad-result" />

        <div className="result-actions">
          <button className="action-btn primary" onClick={handleRetry}>
            다시 도전하기
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
          onShare={() => handleShareForHearts('구구단 타임어택! 제한시간 안에 몇 문제나 풀 수 있을까요? 나와 대결해요!')}
          onClose={() => setShowNoHeartsModal(false)}
        />
      )}

      {/* 프로모션 성공 토스트 */}
      {showPromotionToast && (
        <div className="promotion-success-toast">
          {WELCOME_PROMO_AMOUNT} 토스포인트가 지급되었어요!
        </div>
      )}

      {/* 프로모션 에러 토스트 */}
      {showPromotionError && (
        <div className="charge-error-toast">
          포인트 지급에 실패했어요. {promotionErrorMessage}
        </div>
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
          ⭐ +{GAME_COMPLETE_STARS}별 획득!
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
