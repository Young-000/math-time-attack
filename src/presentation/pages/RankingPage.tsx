/**
 * 랭킹 페이지
 * - 게임 모드 탭 (5문제 / 타임어택)
 * - 기간 필터 (전체 / 이번 주)
 * - 난이도 탭 (초급 / 중급 / 고급)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DifficultyType, RankingItem } from '@domain/entities';
import { DIFFICULTY_CONFIG, Operation } from '@domain/entities';
import {
  getTopRankings,
  getMyRankInfo,
  getTimeAttackRankings,
  getTimeAttackRankInfo,
  type TimeAttackRankingItem,
} from '@data/recordService';
import { getCurrentUserId } from '@infrastructure/rankingService';
import { RankingTab, RankingList, NicknameModal, HeartDisplay } from '@presentation/components';
import { useNickname } from '@presentation/hooks/useNickname';
import { MAX_HEARTS } from '@domain/services/heartService';
import { useHeartSystem } from '@presentation/hooks/useHeartSystem';

type GameMode = 'classic' | 'timeattack';
type RankingPeriod = 'all' | 'weekly';

interface MyRankData {
  easy: number | null;
  medium: number | null;
  hard: number | null;
}

export function RankingPage() {
  const navigate = useNavigate();
  const { difficulty: paramDifficulty } = useParams<{ difficulty?: DifficultyType }>();

  const [gameMode, setGameMode] = useState<GameMode>('classic');
  const [period, setPeriod] = useState<RankingPeriod>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyType>(
    paramDifficulty && DIFFICULTY_CONFIG[paramDifficulty] ? paramDifficulty : 'easy'
  );
  const [classicRankings, setClassicRankings] = useState<RankingItem[]>([]);
  const [timeAttackRankings, setTimeAttackRankings] = useState<TimeAttackRankingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myOdlId, setMyOdlId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [myClassicRanks, setMyClassicRanks] = useState<MyRankData>({ easy: null, medium: null, hard: null });
  const [myTimeAttackRanks, setMyTimeAttackRanks] = useState<MyRankData>({ easy: null, medium: null, hard: null });
  const [isLoadingMyRanks, setIsLoadingMyRanks] = useState(true);

  const { nickname, updateUserNickname } = useNickname();

  const {
    heartInfo,
    showChargeSuccess: showShareSuccess,
    isAdSupported,
    isAdLoading,
    handleWatchAdForHearts,
    handleShareForHearts,
  } = useHeartSystem();

  const myRanks = gameMode === 'classic' ? myClassicRanks : myTimeAttackRanks;

  // 공유하기 핸들러
  const handleShare = useCallback((type: 'ranking' | 'game') => {
    const myRank = myRanks[selectedDifficulty];
    const difficultyLabel = DIFFICULTY_CONFIG[selectedDifficulty].label;

    let shareText = '';
    if (type === 'ranking' && myRank) {
      const modeLabel = gameMode === 'timeattack' ? '타임어택 ' : '';
      shareText = `구구단 챌린지 ${modeLabel}${difficultyLabel} 랭킹 ${myRank}위 달성! 나와 대결해볼래?`;
    } else {
      shareText = '구구단 실력을 테스트해보세요! 타임어택 모드에서 나와 대결해요';
    }

    handleShareForHearts(shareText);
  }, [myRanks, selectedDifficulty, gameMode, handleShareForHearts]);

  // 사용자 ID 조회 및 모든 난이도 순위 로드
  useEffect(() => {
    const loadUserAndRanks = async () => {
      const userId = await getCurrentUserId();
      setMyOdlId(userId);

      if (userId) {
        setIsLoadingMyRanks(true);
        try {
          const [easyClassic, mediumClassic, hardClassic, easyTA, mediumTA, hardTA] = await Promise.all([
            getMyRankInfo(userId, 'easy', Operation.MULTIPLICATION),
            getMyRankInfo(userId, 'medium', Operation.MULTIPLICATION),
            getMyRankInfo(userId, 'hard', Operation.MULTIPLICATION),
            getTimeAttackRankInfo(userId, 'easy', Operation.MULTIPLICATION),
            getTimeAttackRankInfo(userId, 'medium', Operation.MULTIPLICATION),
            getTimeAttackRankInfo(userId, 'hard', Operation.MULTIPLICATION),
          ]);

          setMyClassicRanks({
            easy: easyClassic.rank,
            medium: mediumClassic.rank,
            hard: hardClassic.rank,
          });
          setMyTimeAttackRanks({
            easy: easyTA.rank,
            medium: mediumTA.rank,
            hard: hardTA.rank,
          });
        } catch (err) {
          console.error('Failed to load my ranks:', err);
        } finally {
          setIsLoadingMyRanks(false);
        }
      } else {
        setIsLoadingMyRanks(false);
      }
    };

    loadUserAndRanks();
  }, []);

  // 랭킹 데이터 로드
  const loadRankings = useCallback(async () => {
    setIsLoading(true);
    try {
      if (gameMode === 'classic') {
        const data = await getTopRankings(selectedDifficulty, Operation.MULTIPLICATION, 100, period);
        setClassicRankings(data);
      } else {
        const data = await getTimeAttackRankings(selectedDifficulty, Operation.MULTIPLICATION, 100, period);
        setTimeAttackRankings(data);
      }
    } catch (err) {
      console.error('Failed to load rankings:', err);
      if (gameMode === 'classic') {
        setClassicRankings([]);
      } else {
        setTimeAttackRankings([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedDifficulty, gameMode, period]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  const handleDifficultyChange = (difficulty: DifficultyType) => {
    setSelectedDifficulty(difficulty);
    navigate(`/ranking/${difficulty}`, { replace: true });
  };

  const handleNicknameSave = async (newNickname: string): Promise<boolean> => {
    const success = await updateUserNickname(newNickname);
    if (success) {
      await loadRankings();
    }
    return success;
  };

  const rankings = gameMode === 'classic' ? classicRankings : timeAttackRankings;

  return (
    <div className="page ranking-page">
      <div className="ranking-nickname-bar">
        <span className="nickname-label">내 닉네임:</span>
        <span className="nickname-value">{nickname || '로딩 중...'}</span>
        <button
          className="nickname-edit-btn"
          onClick={() => setIsModalOpen(true)}
          aria-label="닉네임 수정"
        >
          수정
        </button>
      </div>

      {/* 게임 모드 탭 */}
      <div className="ranking-mode-tabs" role="tablist" aria-label="게임 모드">
        <button
          className={`ranking-mode-tab ${gameMode === 'classic' ? 'active' : ''}`}
          onClick={() => setGameMode('classic')}
          role="tab"
          aria-selected={gameMode === 'classic'}
        >
          5문제
        </button>
        <button
          className={`ranking-mode-tab ${gameMode === 'timeattack' ? 'active' : ''}`}
          onClick={() => setGameMode('timeattack')}
          role="tab"
          aria-selected={gameMode === 'timeattack'}
        >
          타임어택
        </button>
      </div>

      {/* 내 순위 요약 */}
      <div className="my-rank-summary" aria-label="내 순위 요약">
        {(['easy', 'medium', 'hard'] as const).map((diff) => (
          <button
            key={diff}
            className={`my-rank-item ${selectedDifficulty === diff ? 'active' : ''}`}
            data-difficulty={diff}
            onClick={() => handleDifficultyChange(diff)}
            aria-label={`${DIFFICULTY_CONFIG[diff].label} 내 순위`}
          >
            <span className="my-rank-difficulty">{DIFFICULTY_CONFIG[diff].label}</span>
            {isLoadingMyRanks ? (
              <span className="my-rank-loading" aria-label="로딩 중" />
            ) : myRanks[diff] ? (
              <span className="my-rank-value">{myRanks[diff]}위</span>
            ) : (
              <span className="my-rank-value no-rank">-</span>
            )}
          </button>
        ))}
      </div>

      {/* 기간 필터 + 난이도 탭 */}
      <div className="ranking-filters">
        <div className="ranking-period-toggle" role="radiogroup" aria-label="기간 선택">
          <button
            className={`period-btn ${period === 'all' ? 'active' : ''}`}
            onClick={() => setPeriod('all')}
            role="radio"
            aria-checked={period === 'all'}
          >
            전체
          </button>
          <button
            className={`period-btn ${period === 'weekly' ? 'active' : ''}`}
            onClick={() => setPeriod('weekly')}
            role="radio"
            aria-checked={period === 'weekly'}
          >
            이번 주
          </button>
        </div>

        <RankingTab
          selectedDifficulty={selectedDifficulty}
          onSelect={handleDifficultyChange}
        />
      </div>

      <main
        className="ranking-content"
        role="tabpanel"
        id={`ranking-panel-${selectedDifficulty}`}
        aria-label={`${DIFFICULTY_CONFIG[selectedDifficulty].label} 랭킹`}
      >
        <RankingList
          rankings={rankings}
          myOdlId={myOdlId}
          isLoading={isLoading}
          mode={gameMode}
        />
      </main>

      {/* 하트 충전 & 공유 섹션 */}
      <div className="ranking-share-section">
        <div className="heart-status">
          <div className="heart-display-mini"><HeartDisplay heartInfo={heartInfo} size="mini" /></div>
          <span className="heart-count-mini">{heartInfo.count}/{MAX_HEARTS}</span>
          {!heartInfo.isFull && (
            <span className="heart-timer-mini">{heartInfo.timeUntilNextFormatted}</span>
          )}
        </div>

        {showShareSuccess ? (
          <div className="share-success">
            하트가 충전되었어요!
          </div>
        ) : (
          <div className="share-buttons-grid">
            {isAdSupported && !heartInfo.isFull && (
              <button
                className="share-btn ad-recharge"
                onClick={() => handleWatchAdForHearts()}
                disabled={isAdLoading}
              >
                <span className="share-icon">{'\uD83D\uDCFA'}</span>
                {isAdLoading ? '준비 중...' : '광고 보기'}
              </button>
            )}
            {myRanks[selectedDifficulty] && (
              <button
                className="share-btn ranking-share"
                onClick={() => handleShare('ranking')}
              >
                <span className="share-icon">{'\uD83C\uDFC6'}</span>
                순위 공유
              </button>
            )}
            <button
              className="share-btn game-share"
              onClick={() => handleShare('game')}
            >
              <span className="share-icon">{'\uD83D\uDCE4'}</span>
              게임 공유
            </button>
          </div>
        )}
      </div>

      <NicknameModal
        isOpen={isModalOpen}
        currentNickname={nickname}
        onClose={() => setIsModalOpen(false)}
        onSave={handleNicknameSave}
      />
    </div>
  );
}
