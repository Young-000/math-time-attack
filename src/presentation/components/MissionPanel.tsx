import { MISSION_TRACKS, getMissionState, getCompletedStageCount, getTotalStageCount } from '@domain/services/missionService';
import type { MissionContext } from '@domain/services/missionService';
import { MissionCard } from './MissionCard';

type MissionPanelProps = {
  readonly context: MissionContext;
};

export function MissionPanel({ context }: MissionPanelProps): JSX.Element {
  const state = getMissionState();
  const completed = getCompletedStageCount();
  const total = getTotalStageCount();

  return (
    <section className="mission-panel" aria-label="미션">
      <div className="mission-panel__header">
        <h2 className="mission-panel__title">&#x1F3AF; 미션</h2>
        <span className="mission-panel__count">완료 {completed}/{total}</span>
      </div>
      <div className="mission-panel__scroll">
        {MISSION_TRACKS.map((track) => (
          <MissionCard key={track.id} track={track} state={state} context={context} />
        ))}
      </div>
    </section>
  );
}
