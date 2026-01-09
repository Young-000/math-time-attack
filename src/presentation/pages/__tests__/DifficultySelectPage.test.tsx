/**
 * DifficultySelectPage 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DifficultySelectPage } from '../DifficultySelectPage';

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock recordService
vi.mock('@data/recordService', () => ({
  getBestRecord: vi.fn((difficulty: string) => {
    if (difficulty === 'easy') {
      return { difficulty: 'easy', time: 12340, date: Date.now() };
    }
    return null;
  }),
}));

describe('DifficultySelectPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <DifficultySelectPage />
      </MemoryRouter>
    );
  };

  describe('렌더링', () => {
    it('페이지 타이틀이 표시되어야 한다', () => {
      renderPage();
      expect(screen.getByRole('heading', { name: '연산 타임어택' })).toBeInTheDocument();
    });

    it('부제목이 표시되어야 한다', () => {
      renderPage();
      expect(screen.getByText('5문제를 가장 빠르게 풀어보세요!')).toBeInTheDocument();
    });

    it('3개의 난이도 버튼이 표시되어야 한다', () => {
      renderPage();
      expect(screen.getByText('초급')).toBeInTheDocument();
      expect(screen.getByText('중급')).toBeInTheDocument();
      expect(screen.getByText('고급')).toBeInTheDocument();
    });

    it('각 난이도의 범위가 표시되어야 한다', () => {
      renderPage();
      expect(screen.getByText('1-9단')).toBeInTheDocument();
      expect(screen.getByText('1-19단')).toBeInTheDocument();
      expect(screen.getByText('1-99단')).toBeInTheDocument();
    });
  });

  describe('기록 표시', () => {
    it('기록이 있는 난이도는 기록을 표시해야 한다', () => {
      renderPage();
      expect(screen.getByText(/최고 기록:/)).toBeInTheDocument();
    });

    it('기록이 없는 난이도는 "기록 없음"을 표시해야 한다', () => {
      renderPage();
      const noRecords = screen.getAllByText('기록 없음');
      expect(noRecords.length).toBe(2); // medium, hard
    });
  });

  describe('네비게이션', () => {
    it('초급 버튼 클릭시 /game/easy로 이동해야 한다', () => {
      renderPage();
      const easyButton = screen.getByText('초급').closest('button');
      fireEvent.click(easyButton!);
      expect(mockNavigate).toHaveBeenCalledWith('/game/easy');
    });

    it('중급 버튼 클릭시 /game/medium으로 이동해야 한다', () => {
      renderPage();
      const mediumButton = screen.getByText('중급').closest('button');
      fireEvent.click(mediumButton!);
      expect(mockNavigate).toHaveBeenCalledWith('/game/medium');
    });

    it('고급 버튼 클릭시 /game/hard로 이동해야 한다', () => {
      renderPage();
      const hardButton = screen.getByText('고급').closest('button');
      fireEvent.click(hardButton!);
      expect(mockNavigate).toHaveBeenCalledWith('/game/hard');
    });
  });
});
