import type { MissionTrack, MissionState, MissionContext } from '@domain/services/missionService';
import { getCurrentStage, getTrackProgress } from '@domain/services/missionService';

type MissionCardProps = {
  readonly track: MissionTrack;
  readonly state: MissionState;
  readonly context: MissionContext;
};

export function MissionCard({ track, state, context }: MissionCardProps): JSX.Element {
  const stage = getCurrentStage(track, state);
  const { current, target, isCompleted } = getTrackProgress(track, state, context);
  const percent = target > 0 ? Math.min((current / target) * 100, 100) : 100;

  return (
    <div className="mission-card">
      <div className="mission-card__header">
        <span className="mission-card__emoji" role="img" aria-hidden="true">{track.emoji}</span>
        <span className="mission-card__name">{track.name}</span>
      </div>
      {isCompleted ? (
        <div className="mission-card__completed">
          <span className="mission-card__badge">&#x2705;</span>
          <span className="mission-card__badge-text">완료!</span>
        </div>
      ) : stage ? (
        <>
          <p className="mission-card__level">Lv.{stage.level}</p>
          <p className="mission-card__desc">{stage.description}</p>
          <div className="mission-card__bar-wrap">
            <div className="mission-card__bar-fill" style={{ width: `${percent}%` }} />
          </div>
          <p className="mission-card__progress">{current}/{target}</p>
          <p className="mission-card__reward">+{stage.reward} 별</p>
        </>
      ) : null}
    </div>
  );
}
