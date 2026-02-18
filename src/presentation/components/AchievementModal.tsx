/**
 * 업적 달성 모달
 * - 달성한 업적 표시
 * - 하트 보상 안내
 */

import type { AchievementDefinition } from '@domain/services/achievementDefinitions';

interface AchievementModalProps {
  achievements: AchievementDefinition[];
  onClose: () => void;
}

export function AchievementModal({ achievements, onClose }: AchievementModalProps) {
  if (achievements.length === 0) return null;

  return (
    <div className="achievement-modal-overlay" onClick={onClose}>
      <div className="achievement-modal" onClick={(e) => e.stopPropagation()}>
        <div className="achievement-modal-header">
          <span className="achievement-trophy">🏅</span>
          <h2 className="achievement-modal-title">업적 달성!</h2>
        </div>

        <div className="achievement-list">
          {achievements.map((achievement) => (
            <div key={achievement.key} className="achievement-item">
              <span className="achievement-emoji">{achievement.emoji}</span>
              <div className="achievement-info">
                <span className="achievement-name">{achievement.title}</span>
                <span className="achievement-desc">{achievement.description}</span>
              </div>
              {achievement.heartReward > 0 && (
                <span className="achievement-reward">+{achievement.heartReward} ❤️</span>
              )}
            </div>
          ))}
        </div>

        <button className="achievement-close-btn" onClick={onClose}>
          확인
        </button>
      </div>
    </div>
  );
}
