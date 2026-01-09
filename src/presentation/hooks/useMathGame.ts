/**
 * useMathGame Hook
 * 게임 상태 관리 및 UI 로직
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { GameState, DifficultyType, Problem } from '@domain/entities';
import {
  createGameState,
  startGame as startGameEngine,
  checkAnswer,
  nextProblem,
  getElapsedTime,
  getCurrentProblem as getCurrentProblemFromState,
} from '@domain/usecases/mathGameEngine';
import { generateProblems } from '@data/problemGenerator';

interface UseMathGameReturn {
  gameState: GameState | null;
  isPlaying: boolean;
  elapsedTime: number;
  currentProblem: Problem | null;
  currentIndex: number;
  totalProblems: number;
  startGame: (difficulty: DifficultyType) => void;
  submitAnswer: (answer: number) => boolean;
  resetGame: () => void;
}

export function useMathGame(): UseMathGameReturn {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
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

  const startGame = useCallback((difficulty: DifficultyType) => {
    const problems = generateProblems(difficulty);
    let state = createGameState(difficulty, problems);
    state = startGameEngine(state);
    setGameState(state);
    setElapsedTime(0);
  }, []);

  const submitAnswer = useCallback((answer: number): boolean => {
    if (!gameState || gameState.isComplete) return false;

    const isCorrect = checkAnswer(gameState, answer);

    if (isCorrect) {
      const newState = nextProblem(gameState);
      setGameState(newState);

      if (newState.isComplete) {
        setElapsedTime(getElapsedTime(newState));
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    }

    return isCorrect;
  }, [gameState]);

  const resetGame = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setGameState(null);
    setElapsedTime(0);
  }, []);

  return {
    gameState,
    isPlaying,
    elapsedTime,
    currentProblem,
    currentIndex,
    totalProblems,
    startGame,
    submitAnswer,
    resetGame,
  };
}
