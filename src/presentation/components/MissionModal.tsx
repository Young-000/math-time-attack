/**
 * 미션 모달
 * 전체 미션 목록 및 보상 수령 UI
 */

import { useState, useCallback } from 'react';
import {
  getMissionsByCategory,
  claimMissionReward,
  claimAllPendingRewards,
  getPendingRewardCount,
  getCompletedCount,
  MISSIONS,
  CATEGORY_LABELS,
  type MissionCategory,
  type MissionWithProgress,
} from '@domain/services/missionService';

type MissionModalProps = {
  onClose: () => void;
  onRewardClaimed: (stars: number) => void;
};

const CATEGORY_ORDER: MissionCategory[] = ['beginner', 'streak', 'record', 'master', 'exchange'];

export function MissionModal({ onClose, onRewardClaimed }: MissionModalProps): JSX.Element {
  const [missions, setMissions] = useState(getMissionsByCategory);
  const [pendingCount, setPendingCount] = useState(getPendingRewardCount);
  const [completedCount, setCompletedCount] = useState(getCompletedCount);
  const [claimedToast, setClaimedToast] = useState<string | null>(null);

  const refreshMissions = useCallback((): void => {
    setMissions(getMissionsByCategory());
    setPendingCount(getPendingRewardCount());
    setCompletedCount(getCompletedCount());
  }, []);

  const handleClaimSingle = useCallback((missionId: string): void => {
    const stars = claimMissionReward(missionId);
    if (stars > 0) {
      onRewardClaimed(stars);
      refreshMissions();
      setClaimedToast(`+${stars}별 획득!`);
      setTimeout(() => setClaimedToast(null), 2000);
    }
  }, [onRewardClaimed, refreshMissions]);

  const handleClaimAll = useCallback((): void => {
    const stars = claimAllPendingRewards();
    if (stars > 0) {
      onRewardClaimed(stars);
      refreshMissions();
      setClaimedToast(`+${stars}별 일괄 획득!`);
      setTimeout(() => setClaimedToast(null), 2000);
    }
  }, [onRewardClaimed, refreshMissions]);

  const renderMissionItem = (mission: MissionWithProgress): JSX.Element => {
    const { progress } = mission;
    const isCompleted = progress.completed;
    const isClaimed = progress.claimed;

    return (
      <div
        key={mission.id}
        className={`mission-item ${isCompleted ? 'completed' : ''} ${isClaimed ? 'claimed' : ''}`}
      >
        <div className="mission-item-left">
          <span className="mission-emoji">{mission.emoji}</span>
          <div className="mission-info">
            <span className="mission-title">{mission.title}</span>
            <span className="mission-desc">{mission.description}</span>
          </div>
        </div>
        <div className="mission-item-right">
          {!isCompleted && (
            <span className="mission-reward-badge">+{mission.reward}별</span>
          )}
          {isCompleted && !isClaimed && (
            <button
              className="mission-claim-btn"
              onClick={() => handleClaimSingle(mission.id)}
              type="button"
            >
              +{mission.reward}별 받기
            </button>
          )}
          {isCompleted && isClaimed && (
            <span className="mission-claimed-badge">완료</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="mission-modal" onClick={(e) => e.stopPropagation()}>
        <header className="mission-modal-header">
          <h2 className="mission-modal-title">미션</h2>
          <button
            className="mission-modal-close"
            onClick={onClose}
            aria-label="닫기"
            type="button"
          >
            &times;
          </button>
        </header>

        {/* 진행 요약 */}
        <div className="mission-summary">
          <div className="mission-summary-progress">
            <span className="mission-summary-count">
              {completedCount}/{MISSIONS.length}
            </span>
            <span className="mission-summary-label">달성</span>
          </div>
          {pendingCount > 0 && (
            <button
              className="mission-claim-all-btn"
              onClick={handleClaimAll}
              type="button"
            >
              미수령 {pendingCount}개 일괄 받기
            </button>
          )}
        </div>

        {/* 카테고리별 미션 목록 */}
        <div className="mission-list-container">
          {CATEGORY_ORDER.map((category) => {
            const categoryMissions = missions[category];
            if (!categoryMissions || categoryMissions.length === 0) return null;

            return (
              <div key={category} className="mission-category">
                <h3 className="mission-category-title">
                  {CATEGORY_LABELS[category]}
                </h3>
                <div className="mission-category-list">
                  {categoryMissions.map(renderMissionItem)}
                </div>
              </div>
            );
          })}
        </div>

        {/* 토스트 */}
        {claimedToast && (
          <div className="mission-claimed-toast">
            {claimedToast}
          </div>
        )}
      </div>
    </div>
  );
}
