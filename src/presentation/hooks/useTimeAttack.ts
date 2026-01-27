/**
 * useTimeAttack Hook
 * 타임어택 모드: 60초 안에 최대한 많은 문제 풀기
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { DifficultyType, OperationType, Problem } from '@domain/entities';
import { Operation, DIFFICULTY_CONFIG } from '@domain/entities';

// 난이도별 타임어택 시간 (ms)
export const TIME_ATTACK_DURATION_BY_DIFFICULTY: Record<DifficultyType, number> = {
  easy: 10000,   // 초급: 10초
  medium: 20000, // 중급: 20초
  hard: 60000,   // 고급: 60초
};

export interface TimeAttackState {
  difficulty: DifficultyType;
  operation: OperationType;
  currentProblem: Problem;
  correctCount: number;
  wrongCount: number;
  isComplete: boolean;
  startTime: number | null;
}

export interface TimeAttackResult {
  difficulty: DifficultyType;
  operation: OperationType;
  correctCount: number;
  wrongCount: number;
  accuracy: number;
  completedAt: string;
}

interface UseTimeAttackReturn {
  gameState: TimeAttackState | null;
  isPlaying: boolean;
  remainingTime: number;
  currentProblem: Problem | null;
  correctCount: number;
  wrongCount: number;
  isNewRecord: boolean;
  startGame: (difficulty: DifficultyType, operation?: OperationType) => void;
  submitAnswer: (answer: number) => boolean;
  resetGame: () => void;
  saveGameResult: () => Promise<void>;
}

let problemIdCounter = 0;

/**
 * 단일 문제 생성 (인라인)
 */
function generateProblem(
  difficulty: DifficultyType,
  operation: OperationType = Operation.MULTIPLICATION
): Problem {
  const config = DIFFICULTY_CONFIG[difficulty];
  const firstNum = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;
  const secondNum = Math.floor(Math.random() * (config.max - config.min + 1)) + config.min;

  const operator: Exclude<OperationType, 'mixed'> =
    operation === Operation.MIXED
      ? Math.random() < 0.5 ? Operation.ADDITION : Operation.MULTIPLICATION
      : operation;

  const answer = operator === Operation.ADDITION
    ? firstNum + secondNum
    : firstNum * secondNum;

  return {
    id: ++problemIdCounter,
    firstNum,
    secondNum,
    operator,
    answer,
  };
}

/**
 * 타임어택 최고 기록 저장 키
 */
function getTimeAttackStorageKey(difficulty: DifficultyType, operation: OperationType): string {
  return `math-time-attack-timeattack-${difficulty}-${operation}`;
}

/**
 * 타임어택 최고 기록 조회
 */
export function getTimeAttackBestScore(
  difficulty: DifficultyType,
  operation: OperationType = Operation.MULTIPLICATION
): number | null {
  try {
    const key = getTimeAttackStorageKey(difficulty, operation);
    const stored = localStorage.getItem(key);
    return stored ? parseInt(stored, 10) : null;
  } catch {
    return null;
  }
}

/**
 * 타임어택 최고 기록 저장
 */
function saveTimeAttackBestScore(
  difficulty: DifficultyType,
  score: number,
  operation: OperationType = Operation.MULTIPLICATION
): boolean {
  const existing = getTimeAttackBestScore(difficulty, operation);

  if (existing !== null && score <= existing) {
    return false;
  }

  try {
    const key = getTimeAttackStorageKey(difficulty, operation);
    localStorage.setItem(key, score.toString());
    return true;
  } catch {
    return false;
  }
}

export function useTimeAttack(): UseTimeAttackReturn {
  const [gameState, setGameState] = useState<TimeAttackState | null>(null);
  const [remainingTime, setRemainingTime] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const timerRef = useRef<number | null>(null);

  const isPlaying = gameState !== null && !gameState.isComplete && gameState.startTime !== null;
  const currentProblem = gameState?.currentProblem ?? null;
  const correctCount = gameState?.correctCount ?? 0;
  const wrongCount = gameState?.wrongCount ?? 0;

  // 카운트다운 타이머
  useEffect(() => {
    if (!isPlaying || !gameState?.startTime) return;

    const startTime = gameState.startTime;
    const duration = TIME_ATTACK_DURATION_BY_DIFFICULTY[gameState.difficulty];
    const id = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      setRemainingTime(remaining);

      // 시간 종료
      if (remaining <= 0) {
        clearInterval(id);
        setGameState(prev => {
          if (!prev) return null;

          // 신기록 확인
          const isRecord = saveTimeAttackBestScore(
            prev.difficulty,
            prev.correctCount,
            prev.operation
          );
          setIsNewRecord(isRecord);

          return {
            ...prev,
            isComplete: true,
          };
        });
      }
    }, 100);

    timerRef.current = id;

    return () => {
      clearInterval(id);
      timerRef.current = null;
    };
  }, [isPlaying, gameState?.startTime]);

  const startGame = useCallback((
    difficulty: DifficultyType,
    operation: OperationType = Operation.MULTIPLICATION
  ) => {
    problemIdCounter = 0;
    const firstProblem = generateProblem(difficulty, operation);
    const duration = TIME_ATTACK_DURATION_BY_DIFFICULTY[difficulty];

    setGameState({
      difficulty,
      operation,
      currentProblem: firstProblem,
      correctCount: 0,
      wrongCount: 0,
      isComplete: false,
      startTime: Date.now(),
    });
    setRemainingTime(duration);
    setIsNewRecord(false);
  }, []);

  const submitAnswer = useCallback((answer: number): boolean => {
    if (!gameState || gameState.isComplete) return false;

    const isCorrect = answer === gameState.currentProblem.answer;

    setGameState(prev => {
      if (!prev) return null;

      // 다음 문제 생성
      const nextProblem = generateProblem(prev.difficulty, prev.operation);

      return {
        ...prev,
        currentProblem: nextProblem,
        correctCount: isCorrect ? prev.correctCount + 1 : prev.correctCount,
        wrongCount: isCorrect ? prev.wrongCount : prev.wrongCount + 1,
      };
    });

    return isCorrect;
  }, [gameState]);

  const saveGameResult = useCallback(async () => {
    if (!gameState || !gameState.isComplete) return;

    // 로컬 저장은 타이머 종료 시 이미 처리됨
    // TODO: 서버 랭킹 저장 추가
  }, [gameState]);

  const resetGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setGameState(null);
    setRemainingTime(0);
    setIsNewRecord(false);
  }, []);

  return {
    gameState,
    isPlaying,
    remainingTime,
    currentProblem,
    correctCount,
    wrongCount,
    isNewRecord,
    startGame,
    submitAnswer,
    resetGame,
    saveGameResult,
  };
}
