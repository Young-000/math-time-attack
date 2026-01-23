/**
 * useNickname Hook 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useNickname } from '../useNickname';

// Mock recordService
const mockGetNickname = vi.fn();
const mockUpdateNickname = vi.fn();

vi.mock('@data/recordService', () => ({
  getNickname: (...args: unknown[]) => mockGetNickname(...args),
  updateNickname: (...args: unknown[]) => mockUpdateNickname(...args),
}));

// Mock rankingService
const mockGetCurrentUserId = vi.fn();

vi.mock('@infrastructure/rankingService', () => ({
  getCurrentUserId: () => mockGetCurrentUserId(),
}));

describe('useNickname', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUserId.mockResolvedValue('test-user-id');
    mockGetNickname.mockResolvedValue('테스트유저');
    mockUpdateNickname.mockResolvedValue(true);
  });

  describe('초기 로드', () => {
    it('로딩 상태가 true로 시작해야 한다', () => {
      const { result } = renderHook(() => useNickname());
      expect(result.current.isLoading).toBe(true);
    });

    it('닉네임이 로드되면 isLoading이 false가 되어야 한다', async () => {
      const { result } = renderHook(() => useNickname());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('닉네임이 정상적으로 로드되어야 한다', async () => {
      const { result } = renderHook(() => useNickname());

      await waitFor(() => {
        expect(result.current.nickname).toBe('테스트유저');
      });
    });

    it('getCurrentUserId와 getNickname이 호출되어야 한다', async () => {
      renderHook(() => useNickname());

      await waitFor(() => {
        expect(mockGetCurrentUserId).toHaveBeenCalled();
        expect(mockGetNickname).toHaveBeenCalled();
      });
    });

    it('닉네임 로드 실패 시 에러가 설정되어야 한다', async () => {
      mockGetNickname.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useNickname());

      await waitFor(() => {
        expect(result.current.error).toBe('닉네임을 불러오는데 실패했습니다.');
      });
    });
  });

  describe('updateUserNickname', () => {
    it('유효한 닉네임을 업데이트할 수 있어야 한다', async () => {
      const { result } = renderHook(() => useNickname());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateUserNickname('새닉네임');
      });

      expect(success).toBe(true);
      expect(result.current.nickname).toBe('새닉네임');
    });

    it('빈 닉네임을 제출하면 에러가 설정되어야 한다', async () => {
      const { result } = renderHook(() => useNickname());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.updateUserNickname('   ');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('닉네임을 입력해주세요.');
    });

    it('20자 초과 닉네임을 제출하면 에러가 설정되어야 한다', async () => {
      const { result } = renderHook(() => useNickname());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.updateUserNickname('가'.repeat(21));
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('닉네임은 20자 이하로 입력해주세요.');
    });

    it('업데이트 실패 시 에러가 설정되어야 한다', async () => {
      mockUpdateNickname.mockResolvedValue(false);
      const { result } = renderHook(() => useNickname());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.updateUserNickname('새닉네임');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('닉네임 저장에 실패했습니다.');
    });

    it('업데이트 중 예외 발생 시 에러가 설정되어야 한다', async () => {
      mockUpdateNickname.mockRejectedValue(new Error('Network error'));
      const { result } = renderHook(() => useNickname());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.updateUserNickname('새닉네임');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('닉네임 변경 중 오류가 발생했습니다.');
    });
  });

  describe('refreshNickname', () => {
    it('닉네임을 새로고침할 수 있어야 한다', async () => {
      const { result } = renderHook(() => useNickname());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      mockGetNickname.mockResolvedValue('갱신된닉네임');

      await act(async () => {
        await result.current.refreshNickname();
      });

      expect(result.current.nickname).toBe('갱신된닉네임');
    });

    it('새로고침 중 isLoading이 true가 되어야 한다', async () => {
      const { result } = renderHook(() => useNickname());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 느린 응답 시뮬레이션
      mockGetNickname.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('갱신된닉네임'), 100))
      );

      act(() => {
        result.current.refreshNickname();
      });

      expect(result.current.isLoading).toBe(true);
    });
  });
});
