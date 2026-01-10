/**
 * TDD RED Phase: 게임 엔진 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createGameState,
  startGame,
  checkAnswer,
  nextProblem,
  isGameComplete,
  getElapsedTime,
  getCurrentProblem,
} from '../usecases/mathGameEngine';
import type { Problem } from '../entities';

describe('Math Game Engine', () => {
  const mockProblems: Problem[] = [
    { id: 1, firstNum: 3, secondNum: 4, operator: 'multiplication', answer: 12 },
    { id: 2, firstNum: 5, secondNum: 6, operator: 'multiplication', answer: 30 },
    { id: 3, firstNum: 7, secondNum: 8, operator: 'multiplication', answer: 56 },
    { id: 4, firstNum: 2, secondNum: 9, operator: 'multiplication', answer: 18 },
    { id: 5, firstNum: 4, secondNum: 4, operator: 'multiplication', answer: 16 },
  ];

  const mockAdditionProblems: Problem[] = [
    { id: 1, firstNum: 3, secondNum: 4, operator: 'addition', answer: 7 },
    { id: 2, firstNum: 5, secondNum: 6, operator: 'addition', answer: 11 },
    { id: 3, firstNum: 7, secondNum: 8, operator: 'addition', answer: 15 },
    { id: 4, firstNum: 2, secondNum: 9, operator: 'addition', answer: 11 },
    { id: 5, firstNum: 4, secondNum: 4, operator: 'addition', answer: 8 },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createGameState', () => {
    it('should create initial game state with multiplication', () => {
      const state = createGameState('easy', mockProblems);

      expect(state.difficulty).toBe('easy');
      expect(state.operation).toBe('multiplication');
      expect(state.problems).toEqual(mockProblems);
      expect(state.currentIndex).toBe(0);
      expect(state.startTime).toBeNull();
      expect(state.endTime).toBeNull();
      expect(state.isComplete).toBe(false);
    });

    it('should create game state with specified operation', () => {
      const state = createGameState('medium', mockAdditionProblems, 'addition');

      expect(state.operation).toBe('addition');
      expect(state.difficulty).toBe('medium');
    });

    it('should create game state with mixed operation', () => {
      const state = createGameState('hard', mockProblems, 'mixed');

      expect(state.operation).toBe('mixed');
    });
  });

  describe('startGame', () => {
    it('should set startTime to current time', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      const state = createGameState('easy', mockProblems);
      const started = startGame(state);

      expect(started.startTime).toBe(now);
    });

    it('should not modify other state properties', () => {
      const state = createGameState('medium', mockProblems, 'addition');
      const started = startGame(state);

      expect(started.difficulty).toBe('medium');
      expect(started.operation).toBe('addition');
      expect(started.currentIndex).toBe(0);
      expect(started.isComplete).toBe(false);
    });
  });

  describe('checkAnswer', () => {
    it('should return true for correct multiplication answer', () => {
      const state = createGameState('easy', mockProblems);
      const isCorrect = checkAnswer(state, 12); // 3 × 4 = 12

      expect(isCorrect).toBe(true);
    });

    it('should return true for correct addition answer', () => {
      const state = createGameState('easy', mockAdditionProblems, 'addition');
      const isCorrect = checkAnswer(state, 7); // 3 + 4 = 7

      expect(isCorrect).toBe(true);
    });

    it('should return false for incorrect answer', () => {
      const state = createGameState('easy', mockProblems);
      const isCorrect = checkAnswer(state, 999);

      expect(isCorrect).toBe(false);
    });

    it('should check answer for current problem', () => {
      let state = createGameState('easy', mockProblems);
      state = nextProblem(state); // Move to problem 2: 5 × 6 = 30

      expect(checkAnswer(state, 30)).toBe(true);
      expect(checkAnswer(state, 12)).toBe(false);
    });

    it('should return false when there is no current problem', () => {
      // 빈 문제 배열로 상태 생성
      const state = createGameState('easy', []);
      expect(checkAnswer(state, 12)).toBe(false);
    });

    it('should return false when currentIndex is out of bounds', () => {
      let state = createGameState('easy', mockProblems);
      // 모든 문제를 넘기고 범위를 벗어남
      for (let i = 0; i <= mockProblems.length; i++) {
        state = nextProblem(state);
      }
      expect(checkAnswer(state, 12)).toBe(false);
    });
  });

  describe('nextProblem', () => {
    it('should increment currentIndex', () => {
      let state = createGameState('easy', mockProblems);

      state = nextProblem(state);
      expect(state.currentIndex).toBe(1);

      state = nextProblem(state);
      expect(state.currentIndex).toBe(2);
    });

    it('should mark game as complete when reaching last problem', () => {
      let state = createGameState('easy', mockProblems);
      const now = Date.now();
      vi.setSystemTime(now);
      state = startGame(state);

      // Move through all problems
      for (let i = 0; i < 4; i++) {
        state = nextProblem(state);
        expect(state.isComplete).toBe(false);
      }

      vi.setSystemTime(now + 5000);
      state = nextProblem(state); // 5th problem done
      expect(state.isComplete).toBe(true);
      expect(state.endTime).toBe(now + 5000);
    });
  });

  describe('isGameComplete', () => {
    it('should return false when game is not complete', () => {
      const state = createGameState('easy', mockProblems);
      expect(isGameComplete(state)).toBe(false);
    });

    it('should return true when game is complete', () => {
      let state = createGameState('easy', mockProblems);
      state = startGame(state);

      for (let i = 0; i < 5; i++) {
        state = nextProblem(state);
      }

      expect(isGameComplete(state)).toBe(true);
    });
  });

  describe('getElapsedTime', () => {
    it('should return 0 when game not started', () => {
      const state = createGameState('easy', mockProblems);
      expect(getElapsedTime(state)).toBe(0);
    });

    it('should return elapsed time during game', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      let state = createGameState('easy', mockProblems);
      state = startGame(state);

      vi.setSystemTime(now + 3500);
      expect(getElapsedTime(state)).toBe(3500);
    });

    it('should return final time when game is complete', () => {
      const now = Date.now();
      vi.setSystemTime(now);

      let state = createGameState('easy', mockProblems);
      state = startGame(state);

      vi.setSystemTime(now + 5000);
      for (let i = 0; i < 5; i++) {
        state = nextProblem(state);
      }

      // Time should be fixed after game complete
      vi.setSystemTime(now + 10000);
      expect(getElapsedTime(state)).toBe(5000);
    });
  });

  describe('getCurrentProblem', () => {
    it('should return current problem', () => {
      const state = createGameState('easy', mockProblems);
      expect(getCurrentProblem(state)).toEqual(mockProblems[0]);
    });

    it('should return correct problem after moving', () => {
      let state = createGameState('easy', mockProblems);
      state = nextProblem(state);
      state = nextProblem(state);

      expect(getCurrentProblem(state)).toEqual(mockProblems[2]);
    });

    it('should return null when game is complete', () => {
      let state = createGameState('easy', mockProblems);
      state = startGame(state);

      for (let i = 0; i < 5; i++) {
        state = nextProblem(state);
      }

      expect(getCurrentProblem(state)).toBeNull();
    });
  });
});
