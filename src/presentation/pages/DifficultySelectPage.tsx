/**
 * 난이도 선택 페이지
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DIFFICULTY_CONFIG, type DifficultyType, Operation } from '@domain/entities';
import { getBestRecord, getMyRankInfo, isOnlineMode } from '@data/recordService';
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

  const online = isOnlineMode();

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

  const handleSelect = (difficulty: DifficultyType) => {
    navigate(`/game/${difficulty}`);
  };

  const handleRankingClick = () => {
    navigate('/ranking');
  };

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
        <h1 className="title">연산 타임어택</h1>
        <p className="subtitle">5문제를 가장 빠르게 풀어보세요!</p>
      </header>

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
