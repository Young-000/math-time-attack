/**
 * Problem Generator
 * 난이도별/연산별 문제 생성기
 */

import type { Problem, DifficultyType, OperationType } from '@domain/entities';
import { DIFFICULTY_CONFIG, GAME_CONFIG, Operation } from '@domain/entities';
import { createSeededRandom } from '@domain/services/dailyChallengeService';

let problemIdCounter = 0;

// 현재 사용 중인 랜덤 함수 (시드 기반 또는 기본)
let currentRandomFn: (() => number) | null = null;

/**
 * 랜덤 함수 반환 (시드 기반 또는 Math.random)
 */
function getRandom(): number {
  if (currentRandomFn) {
    return currentRandomFn();
  }
  return Math.random();
}

/**
 * 지정된 범위 내 랜덤 정수 생성
 */
function getRandomInt(min: number, max: number): number {
  return Math.floor(getRandom() * (max - min + 1)) + min;
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
  return getRandom() < 0.5 ? Operation.ADDITION : Operation.MULTIPLICATION;
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
 * @param seed - 시드 값 (일일 챌린지용, 같은 시드면 같은 문제)
 */
export function generateProblems(
  difficulty: DifficultyType,
  operation: OperationType = Operation.MULTIPLICATION,
  count: number = GAME_CONFIG.PROBLEMS_PER_GAME,
  seed?: number
): Problem[] {
  resetIdCounter(); // 게임마다 ID 초기화

  // 시드가 제공되면 시드 기반 랜덤 사용
  if (seed !== undefined) {
    currentRandomFn = createSeededRandom(seed);
  } else {
    currentRandomFn = null;
  }

  const problems = Array.from({ length: count }, () =>
    generateProblem(difficulty, operation)
  );

  // 시드 기반 랜덤 함수 초기화
  currentRandomFn = null;

  return problems;
}
