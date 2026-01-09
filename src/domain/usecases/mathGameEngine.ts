/**
 * Math Game Engine
 * 게임 상태 관리 및 핵심 로직
 */

import type { GameState, Problem, DifficultyType } from '../entities';

/**
 * 초기 게임 상태 생성
 */
export function createGameState(
  difficulty: DifficultyType,
  problems: Problem[]
): GameState {
  return {
    difficulty,
    problems,
    currentIndex: 0,
    startTime: null,
    endTime: null,
    isComplete: false,
  };
}

/**
 * 게임 시작 (타이머 시작)
 */
export function startGame(state: GameState): GameState {
  return {
    ...state,
    startTime: Date.now(),
  };
}

/**
 * 정답 확인
 */
export function checkAnswer(state: GameState, answer: number): boolean {
  const currentProblem = getCurrentProblem(state);
  if (!currentProblem) return false;

  return currentProblem.answer === answer;
}

/**
 * 다음 문제로 이동
 */
export function nextProblem(state: GameState): GameState {
  const nextIndex = state.currentIndex + 1;
  const isComplete = nextIndex >= state.problems.length;

  return {
    ...state,
    currentIndex: nextIndex,
    isComplete,
    endTime: isComplete ? Date.now() : state.endTime,
  };
}

/**
 * 게임 완료 여부
 */
export function isGameComplete(state: GameState): boolean {
  return state.isComplete;
}

/**
 * 경과 시간 계산 (밀리초)
 */
export function getElapsedTime(state: GameState): number {
  if (state.startTime === null) return 0;

  if (state.endTime !== null) {
    return state.endTime - state.startTime;
  }

  return Date.now() - state.startTime;
}

/**
 * 현재 문제 가져오기
 */
export function getCurrentProblem(state: GameState): Problem | null {
  if (state.isComplete || state.currentIndex >= state.problems.length) {
    return null;
  }

  return state.problems[state.currentIndex];
}
