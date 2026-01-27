/**
 * 타임어택 게임 페이지
 * 60초 안에 최대한 많은 문제 풀기
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTimeAttack, TIME_ATTACK_DURATION_BY_DIFFICULTY } from '@presentation/hooks/useTimeAttack';
import { DIFFICULTY_CONFIG, OPERATION_SYMBOLS, type DifficultyType } from '@domain/entities';

export function TimeAttackPage() {
  const { difficulty } = useParams<{ difficulty: DifficultyType }>();
  const navigate = useNavigate();
  const {
    gameState,
    remainingTime,
    currentProblem,
    correctCount,
    wrongCount,
    startGame,
    submitAnswer,
  } = useTimeAttack();

  const [inputValue, setInputValue] = useState('');
  const [isWrong, setIsWrong] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrongTimeoutRef = useRef<number | null>(null);

  // 게임 시작
  useEffect(() => {
    if (difficulty && DIFFICULTY_CONFIG[difficulty] && !gameState) {
      startGame(difficulty);
    }
  }, [difficulty, gameState, startGame]);

  // 입력창 포커스
  useEffect(() => {
    inputRef.current?.focus();
  }, [correctCount, wrongCount]);

  // Cleanup timeout
  useEffect(() => {
    return () => {
      if (wrongTimeoutRef.current) {
        clearTimeout(wrongTimeoutRef.current);
      }
    };
  }, []);

  // 게임 완료 시 결과 페이지로 이동
  useEffect(() => {
    if (gameState?.isComplete) {
      navigate('/time-attack/result', {
        state: {
          difficulty: gameState.difficulty,
          correctCount: gameState.correctCount,
          wrongCount: gameState.wrongCount,
          operation: gameState.operation,
        },
      });
    }
  }, [gameState?.isComplete, gameState?.difficulty, gameState?.correctCount, gameState?.wrongCount, gameState?.operation, navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = inputValue.trim();
    if (!/^\d+$/.test(trimmed)) return;

    const answer = parseInt(trimmed, 10);
    if (answer < 0 || answer > 100000) return;

    const isCorrect = submitAnswer(answer);

    if (isCorrect) {
      setInputValue('');
      setIsWrong(false);
    } else {
      setIsWrong(true);
      setInputValue('');
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      if (wrongTimeoutRef.current) {
        clearTimeout(wrongTimeoutRef.current);
      }
      wrongTimeoutRef.current = window.setTimeout(() => setIsWrong(false), 300);
    }
  };

  // 남은 시간 포맷 (초.밀리초)
  const formatRemainingTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}`;
  };

  // 난이도별 총 시간
  const totalDuration = difficulty ? TIME_ATTACK_DURATION_BY_DIFFICULTY[difficulty] : 60000;

  // 진행률 계산 (난이도별 시간 기준)
  const progressPercent = ((totalDuration - remainingTime) / totalDuration) * 100;

  // 남은 시간이 3초 이하면 경고 스타일 (난이도 상관없이)
  const isTimeWarning = remainingTime <= 3000;

  if (!difficulty || !DIFFICULTY_CONFIG[difficulty]) {
    return <div>잘못된 난이도입니다.</div>;
  }

  if (!currentProblem) {
    return <div className="loading">로딩 중...</div>;
  }

  return (
    <div className="page game-page time-attack-page">
      <header className="game-header">
        <div className="game-progress">
          <span className="progress-text time-attack-score">
            ✅ {correctCount} | ❌ {wrongCount}
          </span>
          <div
            className="progress-bar time-attack-progress"
            role="progressbar"
            aria-valuenow={remainingTime}
            aria-valuemin={0}
            aria-valuemax={totalDuration}
            aria-label={`남은 시간: ${formatRemainingTime(remainingTime)}초`}
          >
            <div
              className="progress-fill time-attack-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
        <div className={`game-timer time-attack-timer ${isTimeWarning ? 'warning' : ''}`}>
          {formatRemainingTime(remainingTime)}
        </div>
      </header>

      <main className="game-content">
        <div className="time-attack-badge">⚡ 타임어택</div>

        <div className={`problem-card ${isWrong ? 'shake' : ''}`}>
          <span className="problem-num">{currentProblem.firstNum}</span>
          <span className="problem-op">{OPERATION_SYMBOLS[currentProblem.operator]}</span>
          <span className="problem-num">{currentProblem.secondNum}</span>
          <span className="problem-eq">=</span>
          <span className="problem-answer">?</span>
        </div>

        <form onSubmit={handleSubmit} className="answer-form" role="form">
          <div className="mobile-timer time-attack-mobile-timer">
            <span className={isTimeWarning ? 'warning' : ''}>
              {formatRemainingTime(remainingTime)}
            </span>
          </div>
          <label htmlFor="answer-input" className="visually-hidden">
            {currentProblem.firstNum} {OPERATION_SYMBOLS[currentProblem.operator]} {currentProblem.secondNum}의 정답을 입력하세요
          </label>
          <div className="input-row">
            <input
              id="answer-input"
              ref={inputRef}
              type="number"
              inputMode="numeric"
              pattern="[0-9]*"
              className={`answer-input ${isWrong ? 'wrong' : ''}`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="정답 입력"
              aria-invalid={isWrong}
              autoComplete="off"
            />
            <button type="submit" className="submit-btn" aria-label="정답 확인">
              확인
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
