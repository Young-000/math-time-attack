/**
 * 미션 달성 토스트
 * 게임 완료 시 새로 달성된 미션 표시
 */

import type { NewlyCompletedMission } from '@domain/services/missionService';

type MissionCompletedToastProps = {
  missions: NewlyCompletedMission[];
  onClose: () => void;
};

export function MissionCompletedToast({
  missions,
  onClose,
}: MissionCompletedToastProps): JSX.Element | null {
  if (missions.length === 0) return null;

  return (
    <div className="mission-completed-overlay" onClick={onClose}>
      <div className="mission-completed-modal" onClick={(e) => e.stopPropagation()}>
        <div className="mission-completed-header">
          <span className="mission-completed-icon">🎉</span>
          <h3 className="mission-completed-title">미션 달성!</h3>
        </div>
        <div className="mission-completed-list">
          {missions.map((m) => (
            <div key={m.id} className="mission-completed-item">
              <span className="mission-completed-emoji">{m.emoji}</span>
              <div className="mission-completed-info">
                <span className="mission-completed-name">{m.title}</span>
                <span className="mission-completed-reward">+{m.reward}별</span>
              </div>
            </div>
          ))}
        </div>
        <p className="mission-completed-hint">미션 메뉴에서 보상을 수령하세요!</p>
        <button
          className="mission-completed-close-btn"
          onClick={onClose}
          type="button"
        >
          확인
        </button>
      </div>
    </div>
  );
}
