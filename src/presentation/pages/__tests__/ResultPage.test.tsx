/**
 * ResultPage 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResultPage } from '../ResultPage';

// Mock react-router-dom
const mockNavigate = vi.fn();
let mockLocationState: { difficulty: string; elapsedTime: number } | null = null;

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: mockLocationState }),
  };
});

// Mock recordService
const mockIsNewRecord = vi.fn();
const mockSaveBestRecord = vi.fn();
const mockGetBestRecord = vi.fn();

vi.mock('@data/recordService', () => ({
  isNewRecord: (...args: unknown[]) => mockIsNewRecord(...args),
  saveBestRecord: (...args: unknown[]) => mockSaveBestRecord(...args),
  getBestRecord: (...args: unknown[]) => mockGetBestRecord(...args),
}));

describe('ResultPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockIsNewRecord.mockClear();
    mockSaveBestRecord.mockClear();
    mockGetBestRecord.mockClear();
    mockLocationState = null;
  });

  const renderPage = () => {
    return render(
      <MemoryRouter>
        <ResultPage />
      </MemoryRouter>
    );
  };

  describe('state가 없는 경우', () => {
    it('홈으로 리다이렉트해야 한다', () => {
      mockLocationState = null;
      renderPage();
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('일반 결과 표시', () => {
    beforeEach(() => {
      mockLocationState = { difficulty: 'easy', elapsedTime: 15000 };
      mockIsNewRecord.mockReturnValue(false);
      mockGetBestRecord.mockReturnValue({ difficulty: 'easy', time: 12000, date: Date.now() });
    });

    it('난이도가 표시되어야 한다', () => {
      renderPage();
      expect(screen.getByText('초급')).toBeInTheDocument();
    });

    it('소요 시간이 표시되어야 한다', () => {
      renderPage();
      expect(screen.getByText('소요 시간')).toBeInTheDocument();
      expect(screen.getByText('15.00초')).toBeInTheDocument();
    });

    it('최고 기록이 표시되어야 한다', () => {
      renderPage();
      expect(screen.getByText('최고 기록')).toBeInTheDocument();
      expect(screen.getByText('12.00초')).toBeInTheDocument();
    });

    it('신기록 배너가 표시되지 않아야 한다', () => {
      renderPage();
      expect(screen.queryByText('신기록!')).not.toBeInTheDocument();
    });
  });

  describe('신기록인 경우', () => {
    beforeEach(() => {
      mockLocationState = { difficulty: 'easy', elapsedTime: 10000 };
      mockIsNewRecord.mockReturnValue(true);
      mockGetBestRecord.mockReturnValue({ difficulty: 'easy', time: 10000, date: Date.now() });
    });

    it('신기록 배너가 표시되어야 한다', () => {
      renderPage();
      expect(screen.getByText('신기록!')).toBeInTheDocument();
    });

    it('기록이 저장되어야 한다', () => {
      renderPage();
      expect(mockSaveBestRecord).toHaveBeenCalledWith('easy', 10000);
    });
  });

  describe('버튼 동작', () => {
    beforeEach(() => {
      mockLocationState = { difficulty: 'medium', elapsedTime: 20000 };
      mockIsNewRecord.mockReturnValue(false);
      mockGetBestRecord.mockReturnValue(null);
    });

    it('다시 하기 버튼 클릭시 같은 난이도로 이동해야 한다', () => {
      renderPage();
      const retryButton = screen.getByText('다시 하기');
      fireEvent.click(retryButton);
      expect(mockNavigate).toHaveBeenCalledWith('/game/medium');
    });

    it('난이도 선택 버튼 클릭시 홈으로 이동해야 한다', () => {
      renderPage();
      const homeButton = screen.getByText('난이도 선택');
      fireEvent.click(homeButton);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
