import { useEffect, useState } from 'react';
import type { CompletedStage } from '@domain/services/missionService';

type MissionToastProps = {
  readonly completedStages: readonly CompletedStage[];
  readonly onDone: () => void;
};

export function MissionToast({ completedStages, onDone }: MissionToastProps): JSX.Element | null {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (completedStages.length === 0) return;
    const timer = setTimeout(() => { setVisible(false); onDone(); }, 3000);
    return () => clearTimeout(timer);
  }, [completedStages, onDone]);

  if (completedStages.length === 0 || !visible) return null;
  const first = completedStages[0];
  if (!first) return null;

  return (
    <div className="mission-toast" role="alert">
      <div className="mission-toast__content">
        <span className="mission-toast__emoji">&#x1F389;</span>
        <span className="mission-toast__text">
          {first.trackEmoji} {first.trackName} Lv.{first.level} 달성! +{first.reward} 별
        </span>
      </div>
    </div>
  );
}
