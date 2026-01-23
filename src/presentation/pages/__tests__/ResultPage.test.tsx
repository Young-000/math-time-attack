/**
 * ResultPage 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ResultPage } from '../ResultPage';

// Mock react-router-dom
const mockNavigate = vi.fn();
let mockLocationState: { difficulty: string; elapsedTime: number; operation?: string } | null = null;

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
const mockSaveRecord = vi.fn();
const mockGetBestRecord = vi.fn();
const mockGetMyRankInfo = vi.fn();

vi.mock('@data/recordService', () => ({
  isNewRecord: (...args: unknown[]) => mockIsNewRecord(...args),
  saveRecord: (...args: unknown[]) => mockSaveRecord(...args),
  getBestRecord: (...args: unknown[]) => mockGetBestRecord(...args),
  getMyRankInfo: (...args: unknown[]) => mockGetMyRankInfo(...args),
}));

// Mock rankingService
vi.mock('@infrastructure/rankingService', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue(null),
}));

describe('ResultPage', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockIsNewRecord.mockClear();
    mockSaveRecord.mockClear();
    mockGetBestRecord.mockClear();
    mockGetMyRankInfo.mockClear();
    mockGetMyRankInfo.mockResolvedValue({ rank: null, percentile: null, totalPlayers: 0 });
    mockSaveRecord.mockResolvedValue({ isNewLocalRecord: false, serverRecord: null });
    mockLocationState = null;
    // localStorage mock for dev_odl_id
    localStorage.clear();
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
      mockLocationState = { difficulty: 'easy', elapsedTime: 15000, operation: 'multiplication' };
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
      mockLocationState = { difficulty: 'easy', elapsedTime: 10000, operation: 'multiplication' };
      mockIsNewRecord.mockReturnValue(true);
      mockGetBestRecord.mockReturnValue({ difficulty: 'easy', time: 10000, date: Date.now() });
    });

    it('신기록 배너가 표시되어야 한다', async () => {
      renderPage();
      // 비동기 처리 후 신기록 배너가 표시됨
      await vi.waitFor(() => {
        expect(screen.getByText('신기록!')).toBeInTheDocument();
      });
    });

    it('기록이 저장되어야 한다', async () => {
      renderPage();
      // saveRecord는 비동기로 호출되므로 약간의 대기 필요
      await vi.waitFor(() => {
        expect(mockSaveRecord).toHaveBeenCalled();
      });
      // saveRecord 호출 인자 확인 (difficulty, time, operation, userId)
      expect(mockSaveRecord.mock.calls[0][0]).toBe('easy');
      expect(mockSaveRecord.mock.calls[0][1]).toBe(10000);
      expect(mockSaveRecord.mock.calls[0][2]).toBe('multiplication');
    });
  });

  describe('버튼 동작', () => {
    beforeEach(() => {
      mockLocationState = { difficulty: 'medium', elapsedTime: 20000, operation: 'multiplication' };
      mockIsNewRecord.mockReturnValue(false);
      mockGetBestRecord.mockReturnValue(null);
    });

    it('다시 하기 버튼 클릭시 같은 난이도로 이동해야 한다', () => {
      renderPage();
      const retryButton = screen.getByText('다시 하기');
      fireEvent.click(retryButton);
      expect(mockNavigate).toHaveBeenCalledWith('/game/medium');
    });

    it('홈으로 버튼 클릭시 홈으로 이동해야 한다', () => {
      renderPage();
      const homeButton = screen.getByText('🏠 홈으로');
      fireEvent.click(homeButton);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});
