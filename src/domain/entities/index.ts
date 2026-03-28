/**
 * Domain Entities for Math Time Attack
 * 연산 타임어택 게임 핵심 도메인 모델
 */

/** 연산 타입 */
export const Operation = {
  ADDITION: 'addition',
  MULTIPLICATION: 'multiplication',
  MIXED: 'mixed',
} as const;

export type OperationType = (typeof Operation)[keyof typeof Operation];

/** 연산자 기호 */
export const OPERATION_SYMBOLS: Record<Exclude<OperationType, 'mixed'>, string> = {
  addition: '+',
  multiplication: '×',
};

/** 연산 타입별 설정 */
export interface OperationConfigItem {
  label: string;
  description: string;
  emoji: string;
}

export const OPERATION_CONFIG: Record<OperationType, OperationConfigItem> = {
  addition: {
    label: '덧셈',
    description: '더하기 문제',
    emoji: '➕',
  },
  multiplication: {
    label: '곱셈',
    description: '곱하기 문제',
    emoji: '✖️',
  },
  mixed: {
    label: '복합',
    description: '덧셈 + 곱셈 랜덤',
    emoji: '🔀',
  },
};

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
    description: '1~9단',
  },
  medium: {
    min: 10,
    max: 19,
    label: '중급',
    description: '10~19단',
  },
  hard: {
    min: 20,
    max: 99,
    label: '고급',
    description: '20단 이상',
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
  operator: Exclude<OperationType, 'mixed'>; // 실제 연산자 (mixed 제외)
  answer: number;
}

/** 게임 상태 */
export interface GameState {
  difficulty: DifficultyType;
  operation: OperationType;
  problems: Problem[];
  currentIndex: number;
  startTime: number | null;
  endTime: number | null;
  isComplete: boolean;
}

/** 게임 결과 */
export interface GameResult {
  difficulty: DifficultyType;
  operation: OperationType;
  elapsedTime: number; // milliseconds
  completedAt: string; // ISO date string
  isNewRecord: boolean;
}

/** 최고 기록 (로컬) */
export interface BestRecord {
  difficulty: DifficultyType;
  operation: OperationType;
  time: number; // milliseconds
  achievedAt: string; // ISO date string
}

/** 게임 기록 (Supabase 저장용) */
export interface GameRecord {
  id?: string;
  odl_id?: string; // Apps-in-Toss 사용자 ID
  difficulty: DifficultyType;
  operation: OperationType;
  time: number; // milliseconds
  played_at: string; // ISO date string
}

/** 랭킹 아이템 */
export interface RankingItem {
  rank: number;
  odl_id: string;
  nickname?: string;
  time: number;
  played_at: string;
}

/** 게임 모드 키 (난이도 + 연산타입 조합) */
export type GameModeKey = `${DifficultyType}_${OperationType}`;

/** 게임 모드 키 생성 헬퍼 */
export function createGameModeKey(difficulty: DifficultyType, operation: OperationType): GameModeKey {
  return `${difficulty}_${operation}`;
}
