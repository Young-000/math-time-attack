/**
 * TDD RED Phase: useMathGame 훅 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMathGame } from '../useMathGame';

// Mock recordService
vi.mock('@data/recordService', () => ({
  saveRecord: vi.fn(() => Promise.resolve({ isNewLocalRecord: true, serverRecord: null })),
  isNewRecord: vi.fn(() => true),
}));

// Mock rankingService
vi.mock('@infrastructure/rankingService', () => ({
  getCurrentUserId: vi.fn(() => Promise.resolve('test-user-id')),
}));

describe('useMathGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.clearAllMocks();
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

    it('should return false when game is not started', () => {
      const { result } = renderHook(() => useMathGame());

      let isCorrect: boolean | undefined;
      act(() => {
        isCorrect = result.current.submitAnswer(12);
      });

      expect(isCorrect).toBe(false);
    });

    it('should return false when game is already complete', () => {
      const { result } = renderHook(() => useMathGame());

      act(() => {
        result.current.startGame('easy');
      });

      // 모든 문제 맞추기
      for (let i = 0; i < 5; i++) {
        const answer = result.current.currentProblem!.answer;
        act(() => {
          result.current.submitAnswer(answer);
        });
      }

      // 게임 완료 후 추가 제출 시도
      let isCorrect: boolean | undefined;
      act(() => {
        isCorrect = result.current.submitAnswer(12);
      });

      expect(isCorrect).toBe(false);
      expect(result.current.gameState!.isComplete).toBe(true);
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

    it('should update elapsed time as timer runs', () => {
      const { result } = renderHook(() => useMathGame());

      act(() => {
        result.current.startGame('easy');
      });

      // 초기 시간
      expect(result.current.elapsedTime).toBe(0);

      // 100ms 진행 (타이머 인터벌)
      act(() => {
        vi.advanceTimersByTime(100);
      });

      // elapsedTime이 업데이트되어야 함
      expect(result.current.elapsedTime).toBeGreaterThan(0);

      // 500ms 더 진행
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // elapsedTime이 더 증가해야 함
      expect(result.current.elapsedTime).toBeGreaterThanOrEqual(500);
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

    it('should stop timer when game is not playing', () => {
      const { result } = renderHook(() => useMathGame());

      act(() => {
        result.current.startGame('easy');
      });

      // 시간 진행
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // 시간이 증가했는지 확인
      expect(result.current.elapsedTime).toBeGreaterThan(0);

      // 게임 리셋
      act(() => {
        result.current.resetGame();
      });

      // 시간 더 진행
      act(() => {
        vi.advanceTimersByTime(500);
      });

      // elapsedTime은 0으로 리셋되어야 함
      expect(result.current.elapsedTime).toBe(0);
    });
  });

  describe('saveGameResult', () => {
    it('should not save when game is not complete', async () => {
      const { saveRecord } = await import('@data/recordService');
      const { result } = renderHook(() => useMathGame());

      act(() => {
        result.current.startGame('easy');
      });

      // 게임이 완료되지 않은 상태에서 저장 시도
      await act(async () => {
        await result.current.saveGameResult();
      });

      expect(saveRecord).not.toHaveBeenCalled();
    });

    it('should save when game is complete', async () => {
      vi.useRealTimers();
      const { saveRecord } = await import('@data/recordService');
      const { result } = renderHook(() => useMathGame());

      act(() => {
        result.current.startGame('easy');
      });

      // 모든 문제 맞추기
      for (let i = 0; i < 5; i++) {
        const answer = result.current.currentProblem!.answer;
        act(() => {
          result.current.submitAnswer(answer);
        });
      }

      expect(result.current.gameState!.isComplete).toBe(true);

      // 게임 결과 저장
      await act(async () => {
        await result.current.saveGameResult();
      });

      expect(saveRecord).toHaveBeenCalledWith(
        'easy',
        expect.any(Number),
        'multiplication',
        'test-user-id'
      );
    });

    it('should save with null userId when not logged in', async () => {
      vi.useRealTimers();
      const { saveRecord } = await import('@data/recordService');
      const { getCurrentUserId } = await import('@infrastructure/rankingService');
      vi.mocked(getCurrentUserId).mockResolvedValueOnce(null);

      const { result } = renderHook(() => useMathGame());

      act(() => {
        result.current.startGame('medium');
      });

      // 모든 문제 맞추기
      for (let i = 0; i < 5; i++) {
        const answer = result.current.currentProblem!.answer;
        act(() => {
          result.current.submitAnswer(answer);
        });
      }

      // 게임 결과 저장
      await act(async () => {
        await result.current.saveGameResult();
      });

      expect(saveRecord).toHaveBeenCalledWith(
        'medium',
        expect.any(Number),
        'multiplication',
        undefined
      );
    });

    it('should not save when gameState is null', async () => {
      const { saveRecord } = await import('@data/recordService');
      const { result } = renderHook(() => useMathGame());

      // gameState가 null인 상태
      expect(result.current.gameState).toBeNull();

      await act(async () => {
        await result.current.saveGameResult();
      });

      expect(saveRecord).not.toHaveBeenCalled();
    });
  });
});
