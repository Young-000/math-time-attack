/**
 * 난이도 선택 페이지
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DIFFICULTY_CONFIG, type DifficultyType, Operation } from '@domain/entities';
import { getBestRecord, getMyRankInfo, isOnlineMode } from '@data/recordService';
import {
  isDailyChallengeCompleted,
  getDailyChallengeCompletion,
  getTimeUntilNextChallenge,
  formatTimeRemaining,
  getDailyChallengeDifficulty,
} from '@domain/services/dailyChallengeService';
import { formatTime } from '@lib/utils';

interface RankingPreview {
  myRank: number | null;
  totalPlayers: number;
}

const difficulties: DifficultyType[] = ['easy', 'medium', 'hard'];

export function DifficultySelectPage() {
  const navigate = useNavigate();
  const [rankingPreview, setRankingPreview] = useState<RankingPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
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

  // 랭킹 프리뷰 데이터 로드
  useEffect(() => {
    let cancelled = false;

    const loadRankingPreview = async () => {
      if (!online) {
        setRankingPreview({ myRank: null, totalPlayers: 0 });
        return;
      }

      setIsLoading(true);
      try {
        // 내 랭킹 조회 (odl_id가 있다면)
        const odlId = localStorage.getItem('odl_id') || localStorage.getItem('dev_odl_id') || '';
        let myRank: number | null = null;
        let totalPlayers = 0;

        if (odlId) {
          // 기본 난이도(easy)로 내 랭킹 조회
          const rankInfo = await getMyRankInfo(odlId, 'easy', Operation.MULTIPLICATION);
          myRank = rankInfo.rank;
          totalPlayers = rankInfo.totalPlayers;
        }

        if (!cancelled) {
          setRankingPreview({ myRank, totalPlayers });
        }
      } catch (error) {
        console.error('Failed to load ranking preview:', error);
        if (!cancelled) {
          setRankingPreview({ myRank: null, totalPlayers: 0 });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadRankingPreview();

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
        <p className="subtitle">5문제를 가장 빠르게 풀어보세요!</p>
      </header>

      {/* 오늘의 챌린지 배너 */}
      <div className="daily-challenge-banner">
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

      {/* 랭킹 프리뷰 - 간단한 한 줄 표시 */}
      <button
        className="ranking-preview-compact"
        onClick={handleRankingClick}
        aria-label="전체 랭킹 보기"
      >
        <span className="ranking-preview-icon">🏆</span>
        <span className="ranking-preview-text">
          {isLoading ? (
            '랭킹 로딩 중...'
          ) : rankingPreview?.myRank ? (
            `내 순위: ${rankingPreview.myRank}등 / ${rankingPreview.totalPlayers}명`
          ) : (
            '랭킹 보기'
          )}
        </span>
        <span className="ranking-preview-arrow">→</span>
      </button>

      <main className="content">
        <div className="difficulty-list">
          {difficulties.map((difficulty) => {
            const config = DIFFICULTY_CONFIG[difficulty];
            const record = getBestRecord(difficulty);

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
                <div className="difficulty-record">
                  {record ? (
                    <span className="record-time">
                      최고 기록: {formatTime(record.time)}
                    </span>
                  ) : (
                    <span className="record-none">기록 없음</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}
