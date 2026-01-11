/**
 * 난이도 선택 페이지
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DIFFICULTY_CONFIG, type DifficultyType, type RankingItem, Operation } from '@domain/entities';
import { getBestRecord, getTopRankings, getMyRankInfo, isOnlineMode } from '@data/recordService';
import { formatTime } from '@lib/utils';

interface RankingPreview {
  topPlayer: RankingItem | null;
  myRank: number | null;
  myPercentile: number | null;
  totalPlayers: number;
}

const difficulties: DifficultyType[] = ['easy', 'medium', 'hard'];

export function DifficultySelectPage() {
  const navigate = useNavigate();
  const [rankingPreview, setRankingPreview] = useState<RankingPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyType>('medium');

  const online = isOnlineMode();

  // 랭킹 프리뷰 데이터 로드
  useEffect(() => {
    let cancelled = false;

    const loadRankingPreview = async () => {
      if (!online) {
        // 오프라인 모드에서는 빈 상태로 설정
        setRankingPreview({ topPlayer: null, myRank: null, myPercentile: null, totalPlayers: 0 });
        return;
      }

      setIsLoading(true);
      try {
        // 1등 기록 조회
        const topRankings = await getTopRankings(selectedDifficulty, Operation.MULTIPLICATION, 1);
        const topPlayer = topRankings.length > 0 ? topRankings[0] : null;

        // 내 랭킹 조회 (odl_id가 있다면)
        const odlId = localStorage.getItem('odl_id') || '';
        let myRank: number | null = null;
        let myPercentile: number | null = null;
        let totalPlayers = 0;

        if (odlId) {
          const rankInfo = await getMyRankInfo(odlId, selectedDifficulty, Operation.MULTIPLICATION);
          myRank = rankInfo.rank;
          myPercentile = rankInfo.percentile;
          totalPlayers = rankInfo.totalPlayers;
        }

        if (!cancelled) {
          setRankingPreview({ topPlayer, myRank, myPercentile, totalPlayers });
        }
      } catch (error) {
        console.error('Failed to load ranking preview:', error);
        if (!cancelled) {
          setRankingPreview({ topPlayer: null, myRank: null, myPercentile: null, totalPlayers: 0 });
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
  }, [selectedDifficulty, online]);

  const handleSelect = (difficulty: DifficultyType) => {
    navigate(`/game/${difficulty}`);
  };

  const handleRankingClick = () => {
    navigate('/ranking');
  };

  const handleDifficultyTabChange = (difficulty: DifficultyType) => {
    setSelectedDifficulty(difficulty);
  };

  // 내 순위 표시 텍스트 생성
  const getMyRankText = () => {
    if (!rankingPreview) return null;
    const { myRank, myPercentile, totalPlayers } = rankingPreview;

    if (myRank === null) {
      return '아직 기록이 없어요';
    }

    // 100등 이내면 등수 표시
    if (myRank <= 100) {
      return `${myRank}등 / ${totalPlayers}명`;
    }

    // 100등 밖이면 퍼센타일 표시
    return `상위 ${myPercentile}%`;
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

      {/* 랭킹 프리뷰 섹션 - 항상 표시 */}
      <section className="ranking-preview" onClick={handleRankingClick}>
          <div className="ranking-preview-header">
            <h2 className="ranking-preview-title">🏆 실시간 랭킹</h2>
            <div className="ranking-tabs">
              {difficulties.map((diff) => (
                <button
                  key={diff}
                  className={`ranking-tab ${selectedDifficulty === diff ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDifficultyTabChange(diff);
                  }}
                >
                  {DIFFICULTY_CONFIG[diff].label}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="ranking-preview-loading">로딩 중...</div>
          ) : rankingPreview ? (
            <div className="ranking-preview-content">
              {/* 1등 기록 */}
              <div className="ranking-top-player">
                <div className="ranking-label">👑 1등</div>
                {rankingPreview.topPlayer ? (
                  <div className="ranking-value">
                    <span className="ranking-nickname">
                      {rankingPreview.topPlayer.nickname || rankingPreview.topPlayer.odl_id.slice(0, 8)}
                    </span>
                    <span className="ranking-time">
                      {formatTime(rankingPreview.topPlayer.time)}
                    </span>
                  </div>
                ) : (
                  <div className="ranking-value">
                    <span className="ranking-empty">아직 기록이 없어요</span>
                  </div>
                )}
              </div>

              {/* 내 순위 */}
              <div className="ranking-my-rank">
                <div className="ranking-label">📊 내 순위</div>
                <div className="ranking-value">
                  <span className={rankingPreview.myRank !== null && rankingPreview.myRank <= 10 ? 'ranking-highlight' : ''}>
                    {getMyRankText()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="ranking-preview-empty">
              랭킹 정보를 불러올 수 없습니다
            </div>
          )}

          <div className="ranking-preview-footer">
            <span className="ranking-view-all">전체 랭킹 보기 →</span>
          </div>
        </section>

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
