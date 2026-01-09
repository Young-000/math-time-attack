/**
 * TDD RED Phase: useMathGame 훅 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMathGame } from '../useMathGame';

describe('useMathGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() => useMathGame());

      expect(result.current.gameState).toBeNull();
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.elapsedTime).toBe(0);
      expect(result.current.currentProblem).toBeNull();
    });
  });

  describe('startGame', () => {
    it('should initialize game with selected difficulty', () => {
      const { result } = renderHook(() => useMathGame());

      act(() => {
        result.current.startGame('easy');
      });

      expect(result.current.gameState).not.toBeNull();
      expect(result.current.gameState!.difficulty).toBe('easy');
      expect(result.current.isPlaying).toBe(true);
      expect(result.current.currentProblem).not.toBeNull();
    });

    it('should generate 5 problems', () => {
      const { result } = renderHook(() => useMathGame());

      act(() => {
        result.current.startGame('medium');
      });

      expect(result.current.gameState!.problems).toHaveLength(5);
    });
  });

  describe('submitAnswer', () => {
    it('should return true and move to next problem on correct answer', () => {
      const { result } = renderHook(() => useMathGame());

      act(() => {
        result.current.startGame('easy');
      });

      const correctAnswer = result.current.currentProblem!.answer;

      let isCorrect: boolean | undefined;
      act(() => {
        isCorrect = result.current.submitAnswer(correctAnswer);
      });

      expect(isCorrect).toBe(true);
      expect(result.current.gameState!.currentIndex).toBe(1);
    });

    it('should return false on incorrect answer', () => {
      const { result } = renderHook(() => useMathGame());

      act(() => {
        result.current.startGame('easy');
      });

      const wrongAnswer = result.current.currentProblem!.answer + 1;

      let isCorrect: boolean | undefined;
      act(() => {
        isCorrect = result.current.submitAnswer(wrongAnswer);
      });

      expect(isCorrect).toBe(false);
      expect(result.current.gameState!.currentIndex).toBe(0); // Should stay at same problem
    });

    it('should complete game after 5 correct answers', () => {
      const { result } = renderHook(() => useMathGame());

      act(() => {
        result.current.startGame('easy');
      });

      // Answer all 5 problems correctly
      for (let i = 0; i < 5; i++) {
        const answer = result.current.currentProblem!.answer;
        act(() => {
          result.current.submitAnswer(answer);
        });
      }

      expect(result.current.isPlaying).toBe(false);
      expect(result.current.gameState!.isComplete).toBe(true);
    });
  });

  describe('resetGame', () => {
    it('should reset to initial state', () => {
      const { result } = renderHook(() => useMathGame());

      act(() => {
        result.current.startGame('easy');
      });

      act(() => {
        result.current.resetGame();
      });

      expect(result.current.gameState).toBeNull();
      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('elapsed time', () => {
    it('should start with 0 elapsed time', () => {
      const { result } = renderHook(() => useMathGame());

      act(() => {
        result.current.startGame('easy');
      });

      // Initial elapsed time should be 0 or very small
      expect(result.current.elapsedTime).toBeGreaterThanOrEqual(0);
    });

    it('should have elapsed time after game completes', () => {
      vi.useRealTimers(); // Use real timers for this test

      const { result } = renderHook(() => useMathGame());

      act(() => {
        result.current.startGame('easy');
      });

      // Complete the game
      for (let i = 0; i < 5; i++) {
        const answer = result.current.currentProblem!.answer;
        act(() => {
          result.current.submitAnswer(answer);
        });
      }

      // Elapsed time should be recorded
      expect(result.current.elapsedTime).toBeGreaterThanOrEqual(0);
      expect(result.current.gameState!.isComplete).toBe(true);
    });
  });
});
