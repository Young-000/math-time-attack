/**
 * 랭킹 탭 컴포넌트
 */

import type { DifficultyType } from '@domain/entities';
import { DIFFICULTY_CONFIG } from '@domain/entities';

interface RankingTabProps {
  selectedDifficulty: DifficultyType;
  onSelect: (difficulty: DifficultyType) => void;
}

const difficulties: DifficultyType[] = ['easy', 'medium', 'hard'];

export function RankingTab({ selectedDifficulty, onSelect }: RankingTabProps) {
  return (
    <div className="ranking-tabs" role="tablist" aria-label="난이도 선택">
      {difficulties.map((difficulty) => {
        const config = DIFFICULTY_CONFIG[difficulty];
        const isSelected = selectedDifficulty === difficulty;

        return (
          <button
            key={difficulty}
            className={`ranking-tab ${isSelected ? 'active' : ''}`}
            role="tab"
            aria-selected={isSelected}
            aria-controls={`ranking-panel-${difficulty}`}
            onClick={() => onSelect(difficulty)}
          >
            {config.label}
          </button>
        );
      })}
    </div>
  );
}
