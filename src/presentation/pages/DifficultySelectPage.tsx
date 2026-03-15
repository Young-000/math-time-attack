/**
 * 난이도 선택 페이지
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DIFFICULTY_CONFIG, type DifficultyType, Operation } from '@domain/entities';
import { getBestRecord, getMyRankInfo, getTimeAttackRankInfo, isOnlineMode } from '@data/recordService';
import {
  isDailyChallengeCompleted,
  getDailyChallengeCompletion,
  getTimeUntilNextChallenge,
  formatTimeRemaining,
  getDailyChallengeDifficulty,
} from '@domain/services/dailyChallengeService';
import { MAX_HEARTS, claimDailyLoginBonus, hasDailyBonusClaimed } from '@domain/services/heartService';
import { formatTime } from '@lib/utils';
import { getCurrentUserId } from '@infrastructure/rankingService';
import { getTimeAttackBestScore, TIME_ATTACK_DURATION_BY_DIFFICULTY } from '@presentation/hooks/useTimeAttack';
import { useHeartSystem } from '@presentation/hooks/useHeartSystem';
import { usePoints } from '@presentation/hooks/usePoints';
import { DAILY_LOGIN_STARS, GAME_COMPLETE_STARS, ROUND_BONUS_STARS } from '@constants/points';
import { StreakBanner, HeartDisplay, NoHeartsModal, BannerAd, MissionModal } from '@presentation/components';
import { getPendingRewardCount } from '@domain/services/missionService';

const difficulties: DifficultyType[] = ['easy', 'medium', 'hard'];

type GameMode = 'classic' | 'timeattack';

export function DifficultySelectPage() {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<GameMode>('classic');
  const [myRanks, setMyRanks] = useState<Record<DifficultyType, number | null>>({
    easy: null,
    medium: null,
    hard: null,
  });
  const [myTimeAttackRanks, setMyTimeAttackRanks] = useState<Record<DifficultyType, number | null>>({
    easy: null,
    medium: null,
    hard: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingTimeAttack, setIsLoadingTimeAttack] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState('');

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

  const [showHeartChargeModal, setShowHeartChargeModal] = useState(false);
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [showStarBonus, setShowStarBonus] = useState(false);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const [missionBadgeCount, setMissionBadgeCount] = useState(getPendingRewardCount);

  // 별 시스템
  const { balance: starBalance, isLoading: isStarLoading, checkDailyLogin, onMissionReward, refresh: refreshPoints } = usePoints();

  const online = isOnlineMode();

  // 일일 로그인 보너스 체크 (하트 + 별)
  useEffect(() => {
    if (!hasDailyBonusClaimed()) {
      const claimed = claimDailyLoginBonus();
      if (claimed) {
        setShowDailyBonus(true);
        setTimeout(() => setShowDailyBonus(false), 3000);
      }
    }
    // 별 일일 출석 보너스
    checkDailyLogin().then((result) => {
      if (result !== null) {
        setShowStarBonus(true);
        setTimeout(() => setShowStarBonus(false), 3000);
      }
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dailyDifficulty = getDailyChallengeDifficulty();
  const dailyCompleted = isDailyChallengeCompleted();
  const dailyCompletion = getDailyChallengeCompletion();

  // 다음 일일 챌린지까지 남은 시간 업데이트
  useEffect(() => {
    const updateTimer = () => {
      const remaining = getTimeUntilNextChallenge();
      setTimeRemaining(formatTimeRemaining(remaining));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  // 내 순위 데이터 로드 (모든 난이도)
  useEffect(() => {
    let cancelled = false;

    const loadMyRanks = async () => {
      if (!online) return;

      setIsLoading(true);
      try {
        const userId = await getCurrentUserId();
        if (!userId) return;

        const [easyInfo, mediumInfo, hardInfo] = await Promise.all([
          getMyRankInfo(userId, 'easy', Operation.MULTIPLICATION),
          getMyRankInfo(userId, 'medium', Operation.MULTIPLICATION),
          getMyRankInfo(userId, 'hard', Operation.MULTIPLICATION),
        ]);

        if (!cancelled) {
          setMyRanks({
            easy: easyInfo.rank,
            medium: mediumInfo.rank,
            hard: hardInfo.rank,
          });
        }
      } catch (error) {
        console.error('Failed to load my ranks:', error);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadMyRanks();

    return () => {
      cancelled = true;
    };
  }, [online]);

  // 타임어택 내 순위 데이터 로드
  useEffect(() => {
    let cancelled = false;

    const loadTimeAttackRanks = async () => {
      if (!online) return;

      setIsLoadingTimeAttack(true);
      try {
        const userId = await getCurrentUserId();
        if (!userId) return;

        const [easyInfo, mediumInfo, hardInfo] = await Promise.all([
          getTimeAttackRankInfo(userId, 'easy', Operation.MULTIPLICATION),
          getTimeAttackRankInfo(userId, 'medium', Operation.MULTIPLICATION),
          getTimeAttackRankInfo(userId, 'hard', Operation.MULTIPLICATION),
        ]);

        if (!cancelled) {
          setMyTimeAttackRanks({
            easy: easyInfo.rank,
            medium: mediumInfo.rank,
            hard: hardInfo.rank,
          });
        }
      } catch (error) {
        console.error('Failed to load time attack ranks:', error);
      } finally {
        if (!cancelled) {
          setIsLoadingTimeAttack(false);
        }
      }
    };

    loadTimeAttackRanks();

    return () => {
      cancelled = true;
    };
  }, [online]);

  // 하트 체크 후 게임 시작
  const tryStartGame = useCallback((type: 'classic' | 'timeattack' | 'daily', difficulty: DifficultyType) => {
    const consumed = tryConsumeHeart();
    if (!consumed) {
      return;
    }

    if (type === 'classic') {
      navigate(`/game/${difficulty}`);
    } else if (type === 'daily') {
      navigate(`/game/${difficulty}?daily=true`);
    } else {
      navigate(`/time-attack/${difficulty}`);
    }
  }, [navigate, tryConsumeHeart]);

  const handleSelect = useCallback((difficulty: DifficultyType) => {
    tryStartGame('classic', difficulty);
  }, [tryStartGame]);

  const handleDailyChallenge = useCallback(() => {
    tryStartGame('daily', dailyDifficulty);
  }, [tryStartGame, dailyDifficulty]);

  const handleRankingClick = useCallback(() => {
    navigate('/ranking');
  }, [navigate]);

  const handleTimeAttack = useCallback((difficulty: DifficultyType) => {
    tryStartGame('timeattack', difficulty);
  }, [tryStartGame]);

  // 헤더 하트 클릭 - 충전 모달 열기
  const handleHeartClick = useCallback(() => {
    if (heartInfo.isFull) return;
    setShowHeartChargeModal(true);
  }, [heartInfo.isFull]);

  // 미션 보상 수령 콜백
  const handleMissionRewardClaimed = useCallback((stars: number) => {
    onMissionReward(stars, '미션 보상').catch(() => {});
    refreshPoints();
    setMissionBadgeCount(getPendingRewardCount());
  }, [onMissionReward, refreshPoints]);

  // 미션 모달 닫기
  const handleMissionModalClose = useCallback(() => {
    setShowMissionModal(false);
    setMissionBadgeCount(getPendingRewardCount());
  }, []);

  // 일일 챌린지 배너 렌더링
  const renderDailyChallenge = () => (
    <div className={`daily-challenge-banner ${dailyCompleted ? 'completed' : ''}`}>
      <div className="daily-challenge-header">
        <span className="daily-challenge-icon">🔥</span>
        <span className="daily-challenge-title">오늘의 챌린지</span>
        {dailyCompleted && (
          <span className="daily-challenge-badge">✓ 완료</span>
        )}
      </div>
      <div className="daily-challenge-info">
        <span className="daily-challenge-difficulty">
          {DIFFICULTY_CONFIG[dailyDifficulty].label} ({DIFFICULTY_CONFIG[dailyDifficulty].min}-{DIFFICULTY_CONFIG[dailyDifficulty].max}단)
        </span>
        {dailyCompleted && dailyCompletion ? (
          <span className="daily-challenge-record">
            기록: {formatTime(dailyCompletion.time)}
          </span>
        ) : (
          <span className="daily-challenge-timer">
            남은 시간: {timeRemaining}
          </span>
        )}
      </div>
      <button
        className="daily-challenge-btn"
        onClick={handleDailyChallenge}
        disabled={dailyCompleted}
      >
        {dailyCompleted ? '내일 다시 도전하세요!' : '도전하기'}
      </button>
    </div>
  );

  // 5문제 모드 (클래식) 콘텐츠
  const renderClassicContent = () => (
    <>
      {/* 오늘의 챌린지 - 미완료 시 상단에 표시 */}
      {!dailyCompleted && renderDailyChallenge()}

      <div className="difficulty-list">
        {difficulties.map((difficulty) => {
          const config = DIFFICULTY_CONFIG[difficulty];
          const record = getBestRecord(difficulty);
          const myRank = myRanks[difficulty];

          return (
            <button
              key={difficulty}
              className="difficulty-card"
              onClick={() => handleSelect(difficulty)}
              data-difficulty={difficulty}
            >
              <div className="difficulty-header">
                <span className="difficulty-label">{config.label}</span>
                <span className="difficulty-range">
                  {config.min}-{config.max}단
                </span>
              </div>
              <p className="difficulty-desc">{config.description}</p>
              <div className="difficulty-stats">
                <div className="difficulty-record">
                  {record ? (
                    <span className="record-time">
                      🏆 최고 기록: {formatTime(record.time)}
                    </span>
                  ) : (
                    <span className="record-none">기록 없음</span>
                  )}
                </div>
                {online && (
                  <div className="difficulty-rank">
                    {isLoading ? (
                      <span className="rank-loading">...</span>
                    ) : myRank ? (
                      <span className="rank-value">🏅 내 순위: {myRank}위</span>
                    ) : (
                      <span className="rank-none">순위 없음</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 오늘의 챌린지 - 완료 시 하단에 표시 */}
      {dailyCompleted && renderDailyChallenge()}
    </>
  );

  // 타임어택 모드 콘텐츠
  const renderTimeAttackContent = () => (
    <div className="time-attack-content">
      <p className="time-attack-desc">제한 시간 안에 최대한 많은 문제를 풀어보세요!</p>
      <div className="difficulty-list">
        {difficulties.map((difficulty) => {
          const config = DIFFICULTY_CONFIG[difficulty];
          const bestScore = getTimeAttackBestScore(difficulty);
          const durationSec = TIME_ATTACK_DURATION_BY_DIFFICULTY[difficulty] / 1000;
          const myRank = myTimeAttackRanks[difficulty];

          return (
            <button
              key={`timeattack-${difficulty}`}
              className="difficulty-card time-attack-card"
              onClick={() => handleTimeAttack(difficulty)}
              data-difficulty={difficulty}
            >
              <div className="difficulty-header">
                <span className="difficulty-label">{config.label}</span>
                <span className="difficulty-range time-attack-time">
                  {durationSec}초
                </span>
              </div>
              <p className="difficulty-desc">
                {config.min}-{config.max}단 구구단
              </p>
              <div className="difficulty-stats">
                <div className="difficulty-record">
                  {bestScore !== null ? (
                    <span className="record-time">
                      🏆 최고 기록: {bestScore}문제
                    </span>
                  ) : (
                    <span className="record-none">기록 없음</span>
                  )}
                </div>
                {online && (
                  <div className="difficulty-rank">
                    {isLoadingTimeAttack ? (
                      <span className="rank-loading">...</span>
                    ) : myRank ? (
                      <span className="rank-value">🏅 내 순위: {myRank}위</span>
                    ) : (
                      <span className="rank-none">순위 없음</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="page">
      <header className="header">
        <div className="header-top">
          <button
            className="ranking-link-btn"
            onClick={handleRankingClick}
            aria-label="랭킹 보기"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path
                d="M7 17h2v-7H7v7zm4 0h2V7h-2v10zm4 0h2v-4h-2v4z"
                fill="currentColor"
              />
            </svg>
            랭킹
          </button>

          {/* 미션 버튼 */}
          <button
            className="header-mission-btn"
            onClick={() => setShowMissionModal(true)}
            aria-label="미션 보기"
          >
            <span className="mission-btn-icon">🎯</span>
            <span className="mission-btn-label">미션</span>
            {missionBadgeCount > 0 && (
              <span className="mission-badge">{missionBadgeCount}</span>
            )}
          </button>

          {/* 별 잔액 - 클릭하면 내 포인트 */}
          <button
            className="header-stars"
            onClick={() => navigate('/my-points')}
            aria-label="내 별 보기"
          >
            <span className="stars-icon">⭐</span>
            <span className="stars-balance">{isStarLoading ? '...' : starBalance}</span>
          </button>

          {/* 하트 표시 - 클릭하면 충전 모달 */}
          <button
            className={`header-hearts ${heartInfo.isFull ? 'full' : 'chargeable'}`}
            onClick={handleHeartClick}
            aria-label={heartInfo.isFull ? '하트 가득 참' : '하트 충전하기'}
          >
            <div className="hearts-row"><HeartDisplay heartInfo={heartInfo} size="small" /></div>
            <div className="hearts-info">
              <span className="hearts-label">{heartInfo.count}/{MAX_HEARTS}</span>
              {!heartInfo.isFull && (
                <span className="hearts-timer-small">{heartInfo.timeUntilNextFormatted}</span>
              )}
            </div>
            {!heartInfo.isFull && <span className="hearts-charge-hint">+</span>}
          </button>
        </div>
        <h1 className="title">구구단 챌린지</h1>
        <p className="subtitle">
          {activeTab === 'classic'
            ? '5문제를 가장 빠르게 풀어보세요!'
            : '제한 시간 안에 최대한 많이!'}
        </p>
        <p className="subtitle-bonus">게임 완료 시 +{GAME_COMPLETE_STARS}별 + 라운드 보너스 +{ROUND_BONUS_STARS}별</p>

      </header>

      {/* 게임 모드 탭 */}
      <div className="game-mode-tabs" role="tablist">
        <button
          className={`game-mode-tab ${activeTab === 'classic' ? 'active' : ''}`}
          onClick={() => setActiveTab('classic')}
          role="tab"
          aria-selected={activeTab === 'classic'}
        >
          <span className="tab-icon">🎯</span>
          <span className="tab-label">5문제</span>
        </button>
        <button
          className={`game-mode-tab ${activeTab === 'timeattack' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeattack')}
          role="tab"
          aria-selected={activeTab === 'timeattack'}
        >
          <span className="tab-icon">⚡</span>
          <span className="tab-label">타임어택</span>
        </button>
      </div>

      <main className="content">
        {activeTab === 'classic' ? renderClassicContent() : renderTimeAttackContent()}
      </main>

      {/* 배너 광고 */}
      <BannerAd className="banner-ad-home" />

      {/* 연속 출석 배너 - 하단 */}
      <StreakBanner />

      {/* 미션 모달 */}
      {showMissionModal && (
        <MissionModal
          onClose={handleMissionModalClose}
          onRewardClaimed={handleMissionRewardClaimed}
        />
      )}

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

      {/* 하트 충전 모달 (상단 하트 클릭 시) */}
      {showHeartChargeModal && (
        <NoHeartsModal
          heartInfo={heartInfo}
          isAdSupported={isAdSupported}
          isAdLoading={isAdLoading}
          title="하트 충전"
          icon={'\u2764\uFE0F'}
          onWatchAd={() => handleWatchAdForHearts(() => setShowHeartChargeModal(false))}
          onShare={() => handleShareForHearts('구구단 실력을 테스트해보세요! 나와 대결해요!', () => setShowHeartChargeModal(false))}
          onClose={() => setShowHeartChargeModal(false)}
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

      {/* 일일 로그인 보너스 토스트 */}
      {showDailyBonus && (
        <div className="charge-success-toast">
          🎁 오늘의 로그인 보너스! 하트 +1
        </div>
      )}

      {/* 별 일일 출석 보너스 토스트 */}
      {showStarBonus && (
        <div className="charge-success-toast">
          ⭐ 출석 보너스! +{DAILY_LOGIN_STARS}별
        </div>
      )}

    </div>
  );
}
