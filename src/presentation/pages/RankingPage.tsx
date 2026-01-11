/**
 * 랭킹 페이지
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { DifficultyType, RankingItem } from '@domain/entities';
import { DIFFICULTY_CONFIG } from '@domain/entities';
import { getTopRankings } from '@data/recordService';
import { getCurrentUserId } from '@infrastructure/rankingService';
import { RankingTab, RankingList, NicknameModal } from '@presentation/components';
import { useNickname } from '@presentation/hooks/useNickname';

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

  const { nickname, updateUserNickname } = useNickname();

  // 사용자 ID 조회
  useEffect(() => {
    getCurrentUserId().then(setMyOdlId);
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

  const handleBack = () => {
    navigate('/');
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
      <header className="ranking-header">
        <button
          className="back-btn"
          onClick={handleBack}
          aria-label="뒤로 가기"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <h1 className="ranking-title">랭킹</h1>
        <button
          className="settings-btn"
          onClick={() => setIsModalOpen(true)}
          aria-label="닉네임 변경"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
              fill="currentColor"
            />
          </svg>
        </button>
      </header>

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

      <NicknameModal
        isOpen={isModalOpen}
        currentNickname={nickname}
        onClose={() => setIsModalOpen(false)}
        onSave={handleNicknameSave}
      />
    </div>
  );
}
