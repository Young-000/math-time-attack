/**
 * Domain Entities for Math Time Attack
 * 연산 타임어택 게임 핵심 도메인 모델
 */

/** 난이도 */
export const Difficulty = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard',
} as const;

export type DifficultyType = (typeof Difficulty)[keyof typeof Difficulty];

/** 난이도별 설정 */
export interface DifficultyConfigItem {
  min: number;
  max: number;
  label: string;
  description: string;
}

export const DIFFICULTY_CONFIG: Record<DifficultyType, DifficultyConfigItem> = {
  easy: {
    min: 1,
    max: 9,
    label: '초급',
    description: '구구단 (1-9단)',
  },
  medium: {
    min: 1,
    max: 19,
    label: '중급',
    description: '19단 (1-19단)',
  },
  hard: {
    min: 1,
    max: 99,
    label: '고급',
    description: '99단 (1-99단)',
  },
};

/** 게임 설정 */
export const GAME_CONFIG = {
  PROBLEMS_PER_GAME: 5,
} as const;

/** 문제 */
export interface Problem {
  id: number;
  firstNum: number;
  secondNum: number;
  answer: number;
}

/** 게임 상태 */
export interface GameState {
  difficulty: DifficultyType;
  problems: Problem[];
  currentIndex: number;
  startTime: number | null;
  endTime: number | null;
  isComplete: boolean;
}

/** 게임 결과 */
export interface GameResult {
  difficulty: DifficultyType;
  elapsedTime: number; // milliseconds
  completedAt: string; // ISO date string
  isNewRecord: boolean;
}

/** 최고 기록 */
export interface BestRecord {
  difficulty: DifficultyType;
  time: number; // milliseconds
  achievedAt: string; // ISO date string
}
