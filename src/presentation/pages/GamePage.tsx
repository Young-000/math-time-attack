/**
 * 게임 플레이 페이지
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMathGame } from '@presentation/hooks';
import { DIFFICULTY_CONFIG, type DifficultyType } from '@domain/entities';
import { formatTime } from '@lib/utils';

export function GamePage() {
  const { difficulty } = useParams<{ difficulty: DifficultyType }>();
  const navigate = useNavigate();
  const {
    gameState,
    elapsedTime,
    currentProblem,
    currentIndex,
    totalProblems,
    startGame,
    submitAnswer,
  } = useMathGame();

  const [inputValue, setInputValue] = useState('');
  const [isWrong, setIsWrong] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Start game on mount
  useEffect(() => {
    if (difficulty && !gameState) {
      startGame(difficulty);
    }
  }, [difficulty, gameState, startGame]);

  // Focus input on mount and after each answer
  useEffect(() => {
    inputRef.current?.focus();
  }, [currentIndex]);

  // Navigate to result when complete
  useEffect(() => {
    if (gameState?.isComplete) {
      navigate('/result', {
        state: {
          difficulty: gameState.difficulty,
          elapsedTime,
        },
      });
    }
  }, [gameState?.isComplete, gameState?.difficulty, elapsedTime, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const answer = parseInt(inputValue, 10);
    if (isNaN(answer)) return;

    const isCorrect = submitAnswer(answer);

    if (isCorrect) {
      setInputValue('');
      setIsWrong(false);
    } else {
      setIsWrong(true);
      setInputValue('');
      // Vibrate on wrong answer (if supported)
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      setTimeout(() => setIsWrong(false), 300);
    }
  };

  if (!difficulty || !DIFFICULTY_CONFIG[difficulty]) {
    return <div>잘못된 난이도입니다.</div>;
  }

  if (!currentProblem) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="page game-page">
      <header className="game-header">
        <div className="game-progress">
          <span className="progress-text">
            {currentIndex + 1} / {totalProblems}
          </span>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((currentIndex) / totalProblems) * 100}%` }}
            />
          </div>
        </div>
        <div className="game-timer">{formatTime(elapsedTime)}</div>
      </header>

      <main className="game-content">
        <div className={`problem-card ${isWrong ? 'shake' : ''}`}>
          <span className="problem-num">{currentProblem.firstNum}</span>
          <span className="problem-op">×</span>
          <span className="problem-num">{currentProblem.secondNum}</span>
          <span className="problem-eq">=</span>
          <span className="problem-answer">?</span>
        </div>

        <form onSubmit={handleSubmit} className="answer-form">
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            className={`answer-input ${isWrong ? 'wrong' : ''}`}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="정답 입력"
            autoComplete="off"
          />
          <button type="submit" className="submit-btn">
            확인
          </button>
        </form>
      </main>
    </div>
  );
}
