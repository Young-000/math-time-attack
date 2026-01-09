/**
 * GamePage 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../GamePage';

// Mock useMathGame hook
const mockStartGame = vi.fn();
const mockSubmitAnswer = vi.fn();
let mockGameState: {
  difficulty: string;
  isComplete: boolean;
  currentIndex: number;
  problems: { firstNum: number; secondNum: number; answer: number }[];
  startTime: number;
} | null = null;
let mockCurrentProblem: { firstNum: number; secondNum: number; answer: number } | null = null;

vi.mock('@presentation/hooks', () => ({
  useMathGame: () => ({
    gameState: mockGameState,
    elapsedTime: 5000,
    currentProblem: mockCurrentProblem,
    currentIndex: 0,
    totalProblems: 5,
    startGame: mockStartGame,
    submitAnswer: mockSubmitAnswer,
  }),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('GamePage', () => {
  beforeEach(() => {
    mockStartGame.mockClear();
    mockSubmitAnswer.mockClear();
    mockNavigate.mockClear();
    mockGameState = null;
    mockCurrentProblem = null;
  });

  const renderPage = (difficulty = 'easy') => {
    return render(
      <MemoryRouter initialEntries={[`/game/${difficulty}`]}>
        <Routes>
          <Route path="/game/:difficulty" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('잘못된 난이도', () => {
    it('유효하지 않은 난이도일 때 에러 메시지를 표시해야 한다', () => {
      renderPage('invalid');
      expect(screen.getByText('잘못된 난이도입니다.')).toBeInTheDocument();
    });
  });

  describe('로딩 상태', () => {
    it('문제가 없을 때 로딩 메시지를 표시해야 한다', () => {
      mockGameState = {
        difficulty: 'easy',
        isComplete: false,
        currentIndex: 0,
        problems: [],
        startTime: Date.now(),
      };
      mockCurrentProblem = null;
      renderPage('easy');
      expect(screen.getByText('로딩 중...')).toBeInTheDocument();
    });
  });

  describe('게임 플레이', () => {
    beforeEach(() => {
      mockGameState = {
        difficulty: 'easy',
        isComplete: false,
        currentIndex: 0,
        problems: [{ firstNum: 3, secondNum: 4, answer: 12 }],
        startTime: Date.now(),
      };
      mockCurrentProblem = { firstNum: 3, secondNum: 4, answer: 12 };
    });

    it('문제가 표시되어야 한다', () => {
      renderPage('easy');
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
      expect(screen.getByText('×')).toBeInTheDocument();
    });

    it('진행률이 표시되어야 한다', () => {
      renderPage('easy');
      expect(screen.getByText('1 / 5')).toBeInTheDocument();
    });

    it('타이머가 표시되어야 한다', () => {
      renderPage('easy');
      expect(screen.getByText('5.00초')).toBeInTheDocument();
    });

    it('입력 필드가 있어야 한다', () => {
      renderPage('easy');
      const input = screen.getByRole('spinbutton');
      expect(input).toBeInTheDocument();
    });

    it('확인 버튼이 있어야 한다', () => {
      renderPage('easy');
      expect(screen.getByRole('button', { name: '정답 확인' })).toBeInTheDocument();
    });

    it('정답 제출시 submitAnswer가 호출되어야 한다', () => {
      mockSubmitAnswer.mockReturnValue(true);
      renderPage('easy');

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '12' } });

      const form = screen.getByRole('form');
      fireEvent.submit(form);

      expect(mockSubmitAnswer).toHaveBeenCalledWith(12);
    });

    it('빈 입력은 제출되지 않아야 한다', () => {
      renderPage('easy');

      const form = screen.getByRole('form');
      fireEvent.submit(form);

      expect(mockSubmitAnswer).not.toHaveBeenCalled();
    });

    it('음수 입력은 제출되지 않아야 한다', () => {
      renderPage('easy');

      const input = screen.getByRole('spinbutton');
      fireEvent.change(input, { target: { value: '-5' } });

      const form = screen.getByRole('form');
      fireEvent.submit(form);

      expect(mockSubmitAnswer).not.toHaveBeenCalled();
    });
  });

  describe('접근성', () => {
    beforeEach(() => {
      mockGameState = {
        difficulty: 'easy',
        isComplete: false,
        currentIndex: 0,
        problems: [{ firstNum: 3, secondNum: 4, answer: 12 }],
        startTime: Date.now(),
      };
      mockCurrentProblem = { firstNum: 3, secondNum: 4, answer: 12 };
    });

    it('progressbar role이 있어야 한다', () => {
      renderPage('easy');
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('입력 필드에 aria-label이 있어야 한다', () => {
      renderPage('easy');
      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('aria-label', '3 × 4 = ?');
    });
  });
});
