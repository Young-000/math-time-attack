/**
 * TDD RED Phase: 문제 생성기 테스트
 * 이 테스트는 problemGenerator.ts 구현 전에 작성됨
 */
import { describe, it, expect } from 'vitest';
import { generateProblem, generateProblems } from '../problemGenerator';
import { DIFFICULTY_CONFIG, GAME_CONFIG } from '@domain/entities';

describe('Problem Generator', () => {
  describe('generateProblem', () => {
    describe('EASY difficulty (1-9)', () => {
      it('should generate numbers within 1-9 range', () => {
        for (let i = 0; i < 100; i++) {
          const problem = generateProblem('easy');

          expect(problem.firstNum).toBeGreaterThanOrEqual(1);
          expect(problem.firstNum).toBeLessThanOrEqual(9);
          expect(problem.secondNum).toBeGreaterThanOrEqual(1);
          expect(problem.secondNum).toBeLessThanOrEqual(9);
        }
      });

      it('should calculate correct answer', () => {
        for (let i = 0; i < 100; i++) {
          const problem = generateProblem('easy');
          expect(problem.answer).toBe(problem.firstNum * problem.secondNum);
        }
      });
    });

    describe('MEDIUM difficulty (1-19)', () => {
      it('should generate numbers within 1-19 range', () => {
        for (let i = 0; i < 100; i++) {
          const problem = generateProblem('medium');

          expect(problem.firstNum).toBeGreaterThanOrEqual(1);
          expect(problem.firstNum).toBeLessThanOrEqual(19);
          expect(problem.secondNum).toBeGreaterThanOrEqual(1);
          expect(problem.secondNum).toBeLessThanOrEqual(19);
        }
      });

      it('should calculate correct answer', () => {
        for (let i = 0; i < 100; i++) {
          const problem = generateProblem('medium');
          expect(problem.answer).toBe(problem.firstNum * problem.secondNum);
        }
      });
    });

    describe('HARD difficulty (1-99)', () => {
      it('should generate numbers within 1-99 range', () => {
        for (let i = 0; i < 100; i++) {
          const problem = generateProblem('hard');

          expect(problem.firstNum).toBeGreaterThanOrEqual(1);
          expect(problem.firstNum).toBeLessThanOrEqual(99);
          expect(problem.secondNum).toBeGreaterThanOrEqual(1);
          expect(problem.secondNum).toBeLessThanOrEqual(99);
        }
      });

      it('should calculate correct answer', () => {
        for (let i = 0; i < 100; i++) {
          const problem = generateProblem('hard');
          expect(problem.answer).toBe(problem.firstNum * problem.secondNum);
        }
      });
    });

    it('should generate unique IDs', () => {
      const problems = [
        generateProblem('easy'),
        generateProblem('easy'),
        generateProblem('easy'),
      ];

      const ids = problems.map(p => p.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('generateProblems', () => {
    it('should generate exactly PROBLEMS_PER_GAME (5) problems by default', () => {
      const problems = generateProblems('easy');
      expect(problems).toHaveLength(GAME_CONFIG.PROBLEMS_PER_GAME);
    });

    it('should generate specified number of problems', () => {
      const problems = generateProblems('easy', 10);
      expect(problems).toHaveLength(10);
    });

    it('should generate problems with sequential IDs starting from 1', () => {
      const problems = generateProblems('medium');

      problems.forEach((problem, index) => {
        expect(problem.id).toBe(index + 1);
      });
    });

    it('should respect difficulty config for all problems', () => {
      const difficulties = ['easy', 'medium', 'hard'] as const;

      for (const difficulty of difficulties) {
        const config = DIFFICULTY_CONFIG[difficulty];
        const problems = generateProblems(difficulty);

        for (const problem of problems) {
          expect(problem.firstNum).toBeGreaterThanOrEqual(config.min);
          expect(problem.firstNum).toBeLessThanOrEqual(config.max);
          expect(problem.secondNum).toBeGreaterThanOrEqual(config.min);
          expect(problem.secondNum).toBeLessThanOrEqual(config.max);
        }
      }
    });
  });
});
