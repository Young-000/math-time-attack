/**
 * RankingPage 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { RankingPage } from '../RankingPage';

// Mock react-router-dom
const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock recordService
const mockGetTopRankings = vi.fn();

vi.mock('@data/recordService', () => ({
  getTopRankings: (...args: unknown[]) => mockGetTopRankings(...args),
  getNickname: vi.fn().mockResolvedValue('테스트유저'),
  updateNickname: vi.fn().mockResolvedValue(true),
}));

// Mock rankingService
vi.mock('@infrastructure/rankingService', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('test-user-id'),
}));

describe('RankingPage', () => {
  const mockRankings = [
    { rank: 1, odl_id: 'user001', nickname: '챔피언', time: 10000 },
    { rank: 2, odl_id: 'user002', nickname: '도전자', time: 12000 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTopRankings.mockResolvedValue(mockRankings);
  });

  const renderPage = (initialRoute = '/ranking') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/ranking/:difficulty" element={<RankingPage />} />
        </Routes>
      </MemoryRouter>
    );
  };

  describe('렌더링', () => {
    it('랭킹 페이지 타이틀이 표시되어야 한다', async () => {
      renderPage();
      expect(screen.getByRole('heading', { name: '랭킹' })).toBeInTheDocument();
    });

    it('뒤로 가기 버튼이 표시되어야 한다', async () => {
      renderPage();
      expect(screen.getByRole('button', { name: '뒤로 가기' })).toBeInTheDocument();
    });

    it('닉네임 변경 버튼이 표시되어야 한다', async () => {
      renderPage();
      expect(screen.getByRole('button', { name: '닉네임 변경' })).toBeInTheDocument();
    });

    it('난이도 탭들이 표시되어야 한다', async () => {
      renderPage();
      expect(screen.getByRole('tab', { name: '초급' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '중급' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '고급' })).toBeInTheDocument();
    });
  });

  describe('랭킹 로드', () => {
    it('랭킹 데이터가 로드되어야 한다', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('챔피언')).toBeInTheDocument();
        expect(screen.getByText('도전자')).toBeInTheDocument();
      });
    });

    it('초기에 easy 난이도 랭킹이 로드되어야 한다', async () => {
      renderPage();

      await waitFor(() => {
        expect(mockGetTopRankings).toHaveBeenCalledWith('easy');
      });
    });

    it('URL 파라미터로 난이도가 지정되면 해당 난이도가 로드되어야 한다', async () => {
      renderPage('/ranking/medium');

      await waitFor(() => {
        expect(mockGetTopRankings).toHaveBeenCalledWith('medium');
      });
    });
  });

  describe('탭 전환', () => {
    it('중급 탭 클릭 시 난이도가 변경되어야 한다', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('챔피언')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('tab', { name: '중급' }));

      await waitFor(() => {
        expect(mockGetTopRankings).toHaveBeenCalledWith('medium');
        expect(mockNavigate).toHaveBeenCalledWith('/ranking/medium', { replace: true });
      });
    });

    it('고급 탭 클릭 시 난이도가 변경되어야 한다', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('챔피언')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('tab', { name: '고급' }));

      await waitFor(() => {
        expect(mockGetTopRankings).toHaveBeenCalledWith('hard');
        expect(mockNavigate).toHaveBeenCalledWith('/ranking/hard', { replace: true });
      });
    });
  });

  describe('네비게이션', () => {
    it('뒤로 가기 버튼 클릭 시 홈으로 이동해야 한다', async () => {
      renderPage();
      fireEvent.click(screen.getByRole('button', { name: '뒤로 가기' }));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('닉네임 모달', () => {
    it('닉네임 변경 버튼 클릭 시 모달이 열려야 한다', async () => {
      renderPage();

      fireEvent.click(screen.getByRole('button', { name: '닉네임 변경' }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('닉네임 변경')).toBeInTheDocument();
      });
    });

    it('수정 버튼 클릭 시 모달이 열려야 한다', async () => {
      renderPage();

      const editButton = screen.getByRole('button', { name: '닉네임 수정' });
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });
  });

  describe('에러 처리', () => {
    it('랭킹 로드 실패 시 빈 배열이 설정되어야 한다', async () => {
      mockGetTopRankings.mockRejectedValue(new Error('Network error'));
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('아직 기록이 없습니다.')).toBeInTheDocument();
      });
    });
  });

  describe('닉네임 표시', () => {
    it('닉네임이 표시되어야 한다', async () => {
      renderPage();

      await waitFor(() => {
        expect(screen.getByText('테스트유저')).toBeInTheDocument();
      });
    });

    it('내 닉네임 레이블이 표시되어야 한다', async () => {
      renderPage();
      expect(screen.getByText('내 닉네임:')).toBeInTheDocument();
    });
  });
});
