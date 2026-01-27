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
import { formatTime } from '@lib/utils';
import { getCurrentUserId } from '@infrastructure/rankingService';
import { getTimeAttackBestScore, TIME_ATTACK_DURATION_BY_DIFFICULTY } from '@presentation/hooks/useTimeAttack';
import { StreakBanner } from '@presentation/components';

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

  const online = isOnlineMode();
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

  const handleSelect = useCallback((difficulty: DifficultyType) => {
    navigate(`/game/${difficulty}`);
  }, [navigate]);

  const handleDailyChallenge = useCallback(() => {
    navigate(`/game/${dailyDifficulty}?daily=true`);
  }, [navigate, dailyDifficulty]);

  const handleRankingClick = useCallback(() => {
    navigate('/ranking');
  }, [navigate]);

  const handleTimeAttack = useCallback((difficulty: DifficultyType) => {
    navigate(`/time-attack/${difficulty}`);
  }, [navigate]);

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
        </div>
        <h1 className="title">구구단 챌린지</h1>
        <p className="subtitle">
          {activeTab === 'classic'
            ? '5문제를 가장 빠르게 풀어보세요!'
            : '제한 시간 안에 최대한 많이!'}
        </p>
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

      {/* 연속 출석 배너 - 하단 */}
      <StreakBanner />
    </div>
  );
}
