/**
 * 랭킹 페이지
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DifficultyType, RankingItem } from '@domain/entities';
import { DIFFICULTY_CONFIG, Operation } from '@domain/entities';
import { getTopRankings, getMyRankInfo } from '@data/recordService';
import { getCurrentUserId } from '@infrastructure/rankingService';
import { RankingTab, RankingList, NicknameModal } from '@presentation/components';
import { useNickname } from '@presentation/hooks/useNickname';
import { getHeartInfo, refillHearts, MAX_HEARTS, type HeartInfo } from '@domain/services/heartService';
import { share } from '@apps-in-toss/web-bridge';
import { useRewardedAd } from '@presentation/hooks/useRewardedAd';

interface MyRankData {
  easy: number | null;
  medium: number | null;
  hard: number | null;
}

export function RankingPage() {
  const navigate = useNavigate();
  const { difficulty: paramDifficulty } = useParams<{ difficulty?: DifficultyType }>();

  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyType>(
    paramDifficulty && DIFFICULTY_CONFIG[paramDifficulty] ? paramDifficulty : 'easy'
  );
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myOdlId, setMyOdlId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [myRanks, setMyRanks] = useState<MyRankData>({ easy: null, medium: null, hard: null });
  const [isLoadingMyRanks, setIsLoadingMyRanks] = useState(true);

  const { nickname, updateUserNickname } = useNickname();

  // 하트 상태
  const [heartInfo, setHeartInfo] = useState<HeartInfo>(getHeartInfo());
  const [showShareSuccess, setShowShareSuccess] = useState(false);

  // 광고 훅
  const { isAdSupported, isAdLoaded, isAdLoading, loadAd, showAd } = useRewardedAd();

  // 하트 정보 주기적 업데이트
  useEffect(() => {
    const updateHeartInfo = () => {
      setHeartInfo(getHeartInfo());
    };

    const interval = setInterval(updateHeartInfo, 1000);
    return () => clearInterval(interval);
  }, []);

  // 광고 미리 로드
  useEffect(() => {
    if (isAdSupported && !isAdLoaded && !isAdLoading) {
      loadAd();
    }
  }, [isAdSupported, isAdLoaded, isAdLoading, loadAd]);

  // 광고 시청으로 하트 풀충전
  const handleWatchAdForHearts = useCallback(() => {
    showAd({
      onRewarded: () => {
        refillHearts();
        setHeartInfo(getHeartInfo());
        setShowShareSuccess(true);
        setTimeout(() => setShowShareSuccess(false), 2000);
        loadAd();
      },
      onDismiss: () => {},
      onError: (error) => {
        console.error('Ad error:', error);
      },
    });
  }, [showAd, loadAd]);

  // 공유하기 핸들러 (앱인토스 네이티브 공유 API 사용)
  const handleShare = useCallback(async (type: 'ranking' | 'game') => {
    const myRank = myRanks[selectedDifficulty];
    const difficultyLabel = DIFFICULTY_CONFIG[selectedDifficulty].label;

    let shareText = '';
    if (type === 'ranking' && myRank) {
      shareText = `🏆 구구단 챌린지 ${difficultyLabel} 랭킹 ${myRank}위 달성!\n나와 대결해볼래? 🔥`;
    } else {
      shareText = '구구단 실력을 테스트해보세요! 타임어택 모드에서 나와 대결해요 🔥';
    }

    try {
      // 앱인토스 네이티브 공유 API 사용
      await share({ message: shareText });

      // 공유 성공 시 하트 풀충전
      refillHearts();
      setHeartInfo(getHeartInfo());
      setShowShareSuccess(true);
      setTimeout(() => setShowShareSuccess(false), 2000);
    } catch (error) {
      console.log('Share cancelled or failed:', error);
    }
  }, [myRanks, selectedDifficulty]);

  // 하트 아이콘 렌더링
  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < MAX_HEARTS; i++) {
      hearts.push(
        <span key={i} className={`heart-mini ${i < heartInfo.count ? 'filled' : 'empty'}`}>
          {i < heartInfo.count ? '❤️' : '🤍'}
        </span>
      );
    }
    return hearts;
  };

  // 사용자 ID 조회 및 모든 난이도 순위 로드
  useEffect(() => {
    const loadUserAndRanks = async () => {
      const userId = await getCurrentUserId();
      setMyOdlId(userId);

      if (userId) {
        setIsLoadingMyRanks(true);
        try {
          // 세 난이도 순위를 병렬로 조회
          const [easyRank, mediumRank, hardRank] = await Promise.all([
            getMyRankInfo(userId, 'easy', Operation.MULTIPLICATION),
            getMyRankInfo(userId, 'medium', Operation.MULTIPLICATION),
            getMyRankInfo(userId, 'hard', Operation.MULTIPLICATION),
          ]);

          setMyRanks({
            easy: easyRank.rank,
            medium: mediumRank.rank,
            hard: hardRank.rank,
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
      const data = await getTopRankings(selectedDifficulty);
      setRankings(data);
    } catch (err) {
      console.error('Failed to load rankings:', err);
      setRankings([]);
    } finally {
      setIsLoading(false);
    }
  }, [selectedDifficulty]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  // 탭 변경 시 URL 업데이트
  const handleDifficultyChange = (difficulty: DifficultyType) => {
    setSelectedDifficulty(difficulty);
    navigate(`/ranking/${difficulty}`, { replace: true });
  };

  const handleNicknameSave = async (newNickname: string): Promise<boolean> => {
    const success = await updateUserNickname(newNickname);
    if (success) {
      // 랭킹 새로고침
      await loadRankings();
    }
    return success;
  };

  return (
    <div className="page ranking-page">
      {/* 앱인토스 공통 내비게이션 바 사용 - 자체 헤더 제거 */}

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

      {/* 내 순위 요약 - 초급/중급/고급 */}
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

      <RankingTab
        selectedDifficulty={selectedDifficulty}
        onSelect={handleDifficultyChange}
      />

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
        />
      </main>

      {/* 하트 충전 & 공유 섹션 */}
      <div className="ranking-share-section">
        <div className="heart-status">
          <div className="heart-display-mini">{renderHearts()}</div>
          <span className="heart-count-mini">{heartInfo.count}/{MAX_HEARTS}</span>
          {!heartInfo.isFull && (
            <span className="heart-timer-mini">⏱️ {heartInfo.timeUntilNextFormatted}</span>
          )}
        </div>

        {showShareSuccess ? (
          <div className="share-success">
            ✅ 하트가 충전되었어요!
          </div>
        ) : (
          <div className="share-buttons-grid">
            {isAdSupported && !heartInfo.isFull && (
              <button
                className="share-btn ad-recharge"
                onClick={handleWatchAdForHearts}
                disabled={isAdLoading}
              >
                <span className="share-icon">📺</span>
                {isAdLoading ? '준비 중...' : '광고 보기'}
              </button>
            )}
            {myRanks[selectedDifficulty] && (
              <button
                className="share-btn ranking-share"
                onClick={() => handleShare('ranking')}
              >
                <span className="share-icon">🏆</span>
                순위 공유
              </button>
            )}
            <button
              className="share-btn game-share"
              onClick={() => handleShare('game')}
            >
              <span className="share-icon">📤</span>
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
