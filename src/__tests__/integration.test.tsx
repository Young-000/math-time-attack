/**
 * 통합 테스트
 * 전체 게임 플로우와 컴포넌트 간 상호작용 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DifficultySelectPage } from '@presentation/pages/DifficultySelectPage';
import { GamePage } from '@presentation/pages/GamePage';

// Mock recordService
vi.mock('@data/recordService', () => ({
  getBestRecord: vi.fn(() => null),
  saveBestRecord: vi.fn(() => true),
  isNewRecord: vi.fn(() => true),
  isOnlineMode: vi.fn(() => false),
  getTopRankings: vi.fn(() => Promise.resolve([])),
  getMyRankInfo: vi.fn(() => Promise.resolve({ rank: null, percentile: null, totalPlayers: 0 })),
}));

// Mock useMathGame for integration tests
const mockStartGame = vi.fn();
const mockSubmitAnswer = vi.fn();
const mockSaveGameResult = vi.fn();

vi.mock('@presentation/hooks', () => ({
  useMathGame: () => ({
    gameState: {
      difficulty: 'easy',
      operation: 'multiplication',
      isComplete: false,
      currentIndex: 0,
      problems: [{ id: 1, firstNum: 5, secondNum: 6, operator: 'multiplication', answer: 30 }],
      startTime: Date.now(),
    },
    elapsedTime: 1000,
    currentProblem: { id: 1, firstNum: 5, secondNum: 6, operator: 'multiplication', answer: 30 },
    currentIndex: 0,
    totalProblems: 5,
    isNewRecord: false,
    startGame: mockStartGame,
    submitAnswer: mockSubmitAnswer,
    resetGame: vi.fn(),
    saveGameResult: mockSaveGameResult,
  }),
}));

describe('통합 테스트', () => {
  beforeEach(() => {
    localStorage.clear();
    mockStartGame.mockClear();
    mockSubmitAnswer.mockClear();
  });

  const renderApp = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/" element={<DifficultySelectPage />} />
          <Route path="/game/:difficulty" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('난이도 선택 페이지', () => {
    it('모든 난이도 옵션이 표시되어야 한다', () => {
      renderApp('/');

      // difficulty-card 버튼으로 난이도 확인
      const difficultyCards = document.querySelectorAll('.difficulty-card');
      expect(difficultyCards.length).toBe(3);
      expect(screen.getByText('1-9단')).toBeInTheDocument();
      expect(screen.getByText('1-19단')).toBeInTheDocument();
      expect(screen.getByText('1-99단')).toBeInTheDocument();
    });

    it('난이도 설명이 정확해야 한다', () => {
      renderApp('/');

      expect(screen.getByText('1-9 범위')).toBeInTheDocument();
      expect(screen.getByText('1-19 범위')).toBeInTheDocument();
      expect(screen.getByText('1-99 범위')).toBeInTheDocument();
    });

    it('기록이 없는 경우 "기록 없음"을 표시해야 한다', () => {
      renderApp('/');

      // difficulty-card 내의 기록 없음만 카운트
      const noRecords = document.querySelectorAll('.difficulty-card .record-none');
      expect(noRecords.length).toBe(3);
    });
  });

  describe('게임 페이지 (mocked hooks)', () => {
    it('게임이 시작되면 문제가 표시되어야 한다', () => {
      renderApp('/game/easy');

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('6')).toBeInTheDocument();
      expect(screen.getByText('×')).toBeInTheDocument();
    });

    it('진행률이 표시되어야 한다', () => {
      renderApp('/game/easy');

      expect(screen.getByText('1 / 5')).toBeInTheDocument();
    });

    it('입력 필드와 확인 버튼이 있어야 한다', () => {
      renderApp('/game/easy');

      expect(screen.getByRole('spinbutton')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '정답 확인' })).toBeInTheDocument();
    });

    it('타이머가 표시되어야 한다', () => {
      renderApp('/game/easy');

      expect(screen.getByText('1.00초')).toBeInTheDocument();
    });
  });

  describe('접근성', () => {
    it('progress bar에 적절한 ARIA 속성이 있어야 한다', () => {
      renderApp('/game/easy');

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-valuenow', '0');
      expect(progressbar).toHaveAttribute('aria-valuemin', '0');
      expect(progressbar).toHaveAttribute('aria-valuemax', '5');
    });

    it('입력 필드에 aria-label이 있어야 한다', () => {
      renderApp('/game/easy');

      const input = screen.getByRole('spinbutton');
      expect(input).toHaveAttribute('aria-label', '5 × 6 = ?');
    });

    it('진행률 aria-label이 정확해야 한다', () => {
      renderApp('/game/easy');

      const progressbar = screen.getByRole('progressbar');
      expect(progressbar).toHaveAttribute('aria-label', '진행률: 0/5 문제 완료');
    });
  });

  describe('잘못된 경로', () => {
    it('잘못된 난이도에서 에러 메시지를 표시해야 한다', () => {
      renderApp('/game/invalid');

      expect(screen.getByText('잘못된 난이도입니다.')).toBeInTheDocument();
    });

    it('존재하지 않는 난이도 타입에서 에러를 표시해야 한다', () => {
      renderApp('/game/extreme');

      expect(screen.getByText('잘못된 난이도입니다.')).toBeInTheDocument();
    });
  });
});

describe('도메인 규칙 테스트', () => {
  it('난이도별 숫자 범위가 올바르게 설정되어야 한다', async () => {
    const { DIFFICULTY_CONFIG } = await import('@domain/entities');

    expect(DIFFICULTY_CONFIG.easy.min).toBe(1);
    expect(DIFFICULTY_CONFIG.easy.max).toBe(9);

    expect(DIFFICULTY_CONFIG.medium.min).toBe(1);
    expect(DIFFICULTY_CONFIG.medium.max).toBe(19);

    expect(DIFFICULTY_CONFIG.hard.min).toBe(1);
    expect(DIFFICULTY_CONFIG.hard.max).toBe(99);
  });

  it('게임당 문제 수가 5개로 설정되어야 한다', async () => {
    const { GAME_CONFIG } = await import('@domain/entities');

    expect(GAME_CONFIG.PROBLEMS_PER_GAME).toBe(5);
  });
});

describe('유틸리티 함수 경계값 테스트', () => {
  it('formatTime이 경계값에서 올바르게 동작해야 한다', async () => {
    const { formatTime } = await import('@lib/utils');

    // 0
    expect(formatTime(0)).toBe('0.00초');

    // 59초 999ms (1분 미만 최대)
    expect(formatTime(59999)).toBe('59.99초');

    // 정확히 1분
    expect(formatTime(60000)).toBe('1:00.00');

    // 아주 큰 값
    expect(formatTime(3600000)).toBe('60:00.00');
  });
});
