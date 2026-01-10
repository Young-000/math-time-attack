/**
 * Problem Generator
 * 난이도별/연산별 문제 생성기
 */

import type { Problem, DifficultyType, OperationType } from '@domain/entities';
import { DIFFICULTY_CONFIG, GAME_CONFIG, Operation } from '@domain/entities';

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
 * 랜덤 연산자 선택 (mixed 모드용)
 */
function getRandomOperator(): Exclude<OperationType, 'mixed'> {
  return Math.random() < 0.5 ? Operation.ADDITION : Operation.MULTIPLICATION;
}

/**
 * 정답 계산
 */
function calculateAnswer(
  firstNum: number,
  secondNum: number,
  operator: Exclude<OperationType, 'mixed'>
): number {
  if (operator === Operation.ADDITION) {
    return firstNum + secondNum;
  }
  return firstNum * secondNum;
}

/**
 * 단일 문제 생성
 */
export function generateProblem(
  difficulty: DifficultyType,
  operation: OperationType = Operation.MULTIPLICATION
): Problem {
  const config = DIFFICULTY_CONFIG[difficulty];
  const firstNum = getRandomInt(config.min, config.max);
  const secondNum = getRandomInt(config.min, config.max);

  // mixed인 경우 랜덤으로 연산자 선택
  const operator: Exclude<OperationType, 'mixed'> =
    operation === Operation.MIXED ? getRandomOperator() : operation;

  return {
    id: generateId(),
    firstNum,
    secondNum,
    operator,
    answer: calculateAnswer(firstNum, secondNum, operator),
  };
}

/**
 * 여러 문제 생성
 */
export function generateProblems(
  difficulty: DifficultyType,
  operation: OperationType = Operation.MULTIPLICATION,
  count: number = GAME_CONFIG.PROBLEMS_PER_GAME
): Problem[] {
  resetIdCounter(); // 게임마다 ID 초기화

  return Array.from({ length: count }, () => generateProblem(difficulty, operation));
}
