/**
 * Problem Generator
 * 난이도별 곱셈 문제 생성기
 */

import type { Problem, DifficultyType } from '@domain/entities';
import { DIFFICULTY_CONFIG, GAME_CONFIG } from '@domain/entities';

let problemIdCounter = 0;

/**
 * 지정된 범위 내 랜덤 정수 생성
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 고유 ID 생성
 */
function generateId(): number {
  return ++problemIdCounter;
}

/**
 * ID 카운터 리셋 (테스트용)
 */
export function resetIdCounter(): void {
  problemIdCounter = 0;
}

/**
 * 단일 문제 생성
 */
export function generateProblem(difficulty: DifficultyType): Problem {
  const config = DIFFICULTY_CONFIG[difficulty];
  const firstNum = getRandomInt(config.min, config.max);
  const secondNum = getRandomInt(config.min, config.max);

  return {
    id: generateId(),
    firstNum,
    secondNum,
    answer: firstNum * secondNum,
  };
}

/**
 * 여러 문제 생성
 */
export function generateProblems(
  difficulty: DifficultyType,
  count: number = GAME_CONFIG.PROBLEMS_PER_GAME
): Problem[] {
  resetIdCounter(); // 게임마다 ID 초기화

  return Array.from({ length: count }, () => generateProblem(difficulty));
}
