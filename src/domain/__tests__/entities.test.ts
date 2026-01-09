/**
 * TDD RED Phase: 도메인 엔티티 테스트
 * 이 테스트는 entities/index.ts 구현 전에 작성됨
 */
import { describe, it, expect } from 'vitest';
import {
  Difficulty,
  DIFFICULTY_CONFIG,
  Problem,
  GameState,
  GameResult,
  GAME_CONFIG,
} from '../entities';

describe('Domain Entities', () => {
  describe('Difficulty', () => {
    it('should have three difficulty levels', () => {
      expect(Difficulty.EASY).toBe('easy');
      expect(Difficulty.MEDIUM).toBe('medium');
      expect(Difficulty.HARD).toBe('hard');
    });
  });

  describe('DIFFICULTY_CONFIG', () => {
    it('should define range for EASY (1-9)', () => {
      expect(DIFFICULTY_CONFIG.easy.min).toBe(1);
      expect(DIFFICULTY_CONFIG.easy.max).toBe(9);
      expect(DIFFICULTY_CONFIG.easy.label).toBe('초급');
    });

    it('should define range for MEDIUM (1-19)', () => {
      expect(DIFFICULTY_CONFIG.medium.min).toBe(1);
      expect(DIFFICULTY_CONFIG.medium.max).toBe(19);
      expect(DIFFICULTY_CONFIG.medium.label).toBe('중급');
    });

    it('should define range for HARD (1-99)', () => {
      expect(DIFFICULTY_CONFIG.hard.min).toBe(1);
      expect(DIFFICULTY_CONFIG.hard.max).toBe(99);
      expect(DIFFICULTY_CONFIG.hard.label).toBe('고급');
    });
  });

  describe('GAME_CONFIG', () => {
    it('should have PROBLEMS_PER_GAME = 5', () => {
      expect(GAME_CONFIG.PROBLEMS_PER_GAME).toBe(5);
    });
  });

  describe('Problem type', () => {
    it('should have required fields', () => {
      const problem: Problem = {
        id: 1,
        firstNum: 7,
        secondNum: 8,
        answer: 56,
      };

      expect(problem.id).toBe(1);
      expect(problem.firstNum).toBe(7);
      expect(problem.secondNum).toBe(8);
      expect(problem.answer).toBe(56);
    });
  });

  describe('GameState type', () => {
    it('should have required fields', () => {
      const state: GameState = {
        difficulty: 'easy',
        problems: [],
        currentIndex: 0,
        startTime: null,
        endTime: null,
        isComplete: false,
      };

      expect(state.difficulty).toBe('easy');
      expect(state.currentIndex).toBe(0);
      expect(state.isComplete).toBe(false);
    });
  });

  describe('GameResult type', () => {
    it('should have required fields', () => {
      const result: GameResult = {
        difficulty: 'easy',
        elapsedTime: 12345,
        completedAt: new Date().toISOString(),
        isNewRecord: false,
      };

      expect(result.difficulty).toBe('easy');
      expect(result.elapsedTime).toBe(12345);
      expect(typeof result.completedAt).toBe('string');
      expect(result.isNewRecord).toBe(false);
    });
  });
});
