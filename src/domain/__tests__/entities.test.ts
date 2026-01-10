/**
 * TDD RED Phase: 도메인 엔티티 테스트
 * 이 테스트는 entities/index.ts 구현 전에 작성됨
 */
import { describe, it, expect } from 'vitest';
import {
  Difficulty,
  Operation,
  DIFFICULTY_CONFIG,
  OPERATION_CONFIG,
  OPERATION_SYMBOLS,
  Problem,
  GameState,
  GameResult,
  GAME_CONFIG,
  createGameModeKey,
} from '../entities';

describe('Domain Entities', () => {
  describe('Difficulty', () => {
    it('should have three difficulty levels', () => {
      expect(Difficulty.EASY).toBe('easy');
      expect(Difficulty.MEDIUM).toBe('medium');
      expect(Difficulty.HARD).toBe('hard');
    });
  });

  describe('Operation', () => {
    it('should have three operation types', () => {
      expect(Operation.ADDITION).toBe('addition');
      expect(Operation.MULTIPLICATION).toBe('multiplication');
      expect(Operation.MIXED).toBe('mixed');
    });
  });

  describe('OPERATION_SYMBOLS', () => {
    it('should have correct symbols for operations', () => {
      expect(OPERATION_SYMBOLS.addition).toBe('+');
      expect(OPERATION_SYMBOLS.multiplication).toBe('×');
    });
  });

  describe('OPERATION_CONFIG', () => {
    it('should have configuration for all operations', () => {
      expect(OPERATION_CONFIG.addition.label).toBe('덧셈');
      expect(OPERATION_CONFIG.multiplication.label).toBe('곱셈');
      expect(OPERATION_CONFIG.mixed.label).toBe('복합');
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
    it('should have required fields including operator', () => {
      const problem: Problem = {
        id: 1,
        firstNum: 7,
        secondNum: 8,
        operator: 'multiplication',
        answer: 56,
      };

      expect(problem.id).toBe(1);
      expect(problem.firstNum).toBe(7);
      expect(problem.secondNum).toBe(8);
      expect(problem.operator).toBe('multiplication');
      expect(problem.answer).toBe(56);
    });

    it('should support addition operator', () => {
      const problem: Problem = {
        id: 1,
        firstNum: 5,
        secondNum: 3,
        operator: 'addition',
        answer: 8,
      };

      expect(problem.operator).toBe('addition');
      expect(problem.answer).toBe(8);
    });
  });

  describe('GameState type', () => {
    it('should have required fields including operation', () => {
      const state: GameState = {
        difficulty: 'easy',
        operation: 'multiplication',
        problems: [],
        currentIndex: 0,
        startTime: null,
        endTime: null,
        isComplete: false,
      };

      expect(state.difficulty).toBe('easy');
      expect(state.operation).toBe('multiplication');
      expect(state.currentIndex).toBe(0);
      expect(state.isComplete).toBe(false);
    });
  });

  describe('GameResult type', () => {
    it('should have required fields including operation', () => {
      const result: GameResult = {
        difficulty: 'easy',
        operation: 'addition',
        elapsedTime: 12345,
        completedAt: new Date().toISOString(),
        isNewRecord: false,
      };

      expect(result.difficulty).toBe('easy');
      expect(result.operation).toBe('addition');
      expect(result.elapsedTime).toBe(12345);
      expect(typeof result.completedAt).toBe('string');
      expect(result.isNewRecord).toBe(false);
    });
  });

  describe('createGameModeKey', () => {
    it('should create correct game mode key', () => {
      expect(createGameModeKey('easy', 'multiplication')).toBe('easy_multiplication');
      expect(createGameModeKey('hard', 'addition')).toBe('hard_addition');
      expect(createGameModeKey('medium', 'mixed')).toBe('medium_mixed');
    });
  });
});
