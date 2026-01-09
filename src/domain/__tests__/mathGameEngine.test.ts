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
    { id: 1, firstNum: 3, secondNum: 4, answer: 12 },
    { id: 2, firstNum: 5, secondNum: 6, answer: 30 },
    { id: 3, firstNum: 7, secondNum: 8, answer: 56 },
    { id: 4, firstNum: 2, secondNum: 9, answer: 18 },
    { id: 5, firstNum: 4, secondNum: 4, answer: 16 },
  ];

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('createGameState', () => {
    it('should create initial game state', () => {
      const state = createGameState('easy', mockProblems);

      expect(state.difficulty).toBe('easy');
      expect(state.problems).toEqual(mockProblems);
      expect(state.currentIndex).toBe(0);
      expect(state.startTime).toBeNull();
      expect(state.endTime).toBeNull();
      expect(state.isComplete).toBe(false);
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
      const state = createGameState('medium', mockProblems);
      const started = startGame(state);

      expect(started.difficulty).toBe('medium');
      expect(started.currentIndex).toBe(0);
      expect(started.isComplete).toBe(false);
    });
  });

  describe('checkAnswer', () => {
    it('should return true for correct answer', () => {
      const state = createGameState('easy', mockProblems);
      const isCorrect = checkAnswer(state, 12); // 3 × 4 = 12

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
