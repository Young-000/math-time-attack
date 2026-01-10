/**
 * useMathGame Hook
 * 게임 상태 관리 및 UI 로직
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, DifficultyType, OperationType, Problem } from '@domain/entities';
import { Operation } from '@domain/entities';
import {
  createGameState,
  startGame as startGameEngine,
  checkAnswer,
  nextProblem,
  getElapsedTime,
  getCurrentProblem as getCurrentProblemFromState,
} from '@domain/usecases/mathGameEngine';
import { generateProblems } from '@data/problemGenerator';
import { saveRecord, isNewRecord as checkNewRecord } from '@data/recordService';
import { getCurrentUserId } from '@infrastructure/rankingService';

interface UseMathGameReturn {
  gameState: GameState | null;
  isPlaying: boolean;
  elapsedTime: number;
  currentProblem: Problem | null;
  currentIndex: number;
  totalProblems: number;
  isNewRecord: boolean;
  startGame: (difficulty: DifficultyType, operation?: OperationType) => void;
  submitAnswer: (answer: number) => boolean;
  resetGame: () => void;
  saveGameResult: () => Promise<void>;
}

export function useMathGame(): UseMathGameReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const timerRef = useRef<number | null>(null);

  const isPlaying = gameState !== null && !gameState.isComplete && gameState.startTime !== null;
  const currentProblem = gameState ? getCurrentProblemFromState(gameState) : null;
  const currentIndex = gameState?.currentIndex ?? 0;
  const totalProblems = gameState?.problems.length ?? 5;

  // Timer effect - 클로저 버그 수정: startTime을 직접 사용
  useEffect(() => {
    if (!isPlaying || !gameState?.startTime) return;

    const startTime = gameState.startTime;
    const id = window.setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    timerRef.current = id;

    return () => {
      clearInterval(id);
      timerRef.current = null;
    };
  }, [isPlaying, gameState?.startTime]);

  // Update elapsed time when game state changes
  useEffect(() => {
    if (gameState) {
      setElapsedTime(getElapsedTime(gameState));
    }
  }, [gameState]);

  const startGame = useCallback((difficulty: DifficultyType, operation: OperationType = Operation.MULTIPLICATION) => {
    const problems = generateProblems(difficulty, operation);
    let state = createGameState(difficulty, problems, operation);
    state = startGameEngine(state);
    setGameState(state);
    setElapsedTime(0);
    setIsNewRecord(false);
  }, []);

  const submitAnswer = useCallback((answer: number): boolean => {
    if (!gameState || gameState.isComplete) return false;

    const isCorrect = checkAnswer(gameState, answer);

    if (isCorrect) {
      const newState = nextProblem(gameState);
      setGameState(newState);

      if (newState.isComplete) {
        const finalTime = getElapsedTime(newState);
        setElapsedTime(finalTime);

        // 신기록 확인
        const newRecordStatus = checkNewRecord(
          newState.difficulty,
          finalTime,
          newState.operation
        );
        setIsNewRecord(newRecordStatus);

        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    }

    return isCorrect;
  }, [gameState]);

  const saveGameResult = useCallback(async () => {
    if (!gameState || !gameState.isComplete) return;

    const finalTime = getElapsedTime(gameState);
    const userId = await getCurrentUserId();

    await saveRecord(
      gameState.difficulty,
      finalTime,
      gameState.operation,
      userId || undefined
    );
  }, [gameState]);

  const resetGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setGameState(null);
    setElapsedTime(0);
    setIsNewRecord(false);
  }, []);

  return {
    gameState,
    isPlaying,
    elapsedTime,
    currentProblem,
    currentIndex,
    totalProblems,
    isNewRecord,
    startGame,
    submitAnswer,
    resetGame,
    saveGameResult,
  };
}
