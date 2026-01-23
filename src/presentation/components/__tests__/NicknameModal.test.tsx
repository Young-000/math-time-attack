/**
 * NicknameModal 컴포넌트 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NicknameModal } from '../NicknameModal';

describe('NicknameModal', () => {
  const defaultProps = {
    isOpen: true,
    currentNickname: '테스트유저',
    onClose: vi.fn(),
    onSave: vi.fn().mockResolvedValue(true),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('렌더링', () => {
    it('isOpen이 false일 때 렌더링하지 않아야 한다', () => {
      render(<NicknameModal {...defaultProps} isOpen={false} />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('isOpen이 true일 때 모달을 렌더링해야 한다', () => {
      render(<NicknameModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('닉네임 변경')).toBeInTheDocument();
    });

    it('현재 닉네임이 입력 필드에 표시되어야 한다', () => {
      render(<NicknameModal {...defaultProps} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('테스트유저');
    });

    it('저장 및 취소 버튼이 표시되어야 한다', () => {
      render(<NicknameModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    });
  });

  describe('입력 검증', () => {
    it('빈 닉네임을 제출하면 에러 메시지가 표시되어야 한다', async () => {
      render(<NicknameModal {...defaultProps} currentNickname="" />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '   ' } });
      fireEvent.click(screen.getByRole('button', { name: '저장' }));

      await waitFor(() => {
        expect(screen.getByText('닉네임을 입력해주세요.')).toBeInTheDocument();
      });
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });

    it('20자 초과 닉네임을 제출하면 에러 메시지가 표시되어야 한다', async () => {
      render(<NicknameModal {...defaultProps} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '가'.repeat(21) } });
      fireEvent.click(screen.getByRole('button', { name: '저장' }));

      await waitFor(() => {
        expect(screen.getByText('닉네임은 20자 이하로 입력해주세요.')).toBeInTheDocument();
      });
      expect(defaultProps.onSave).not.toHaveBeenCalled();
    });
  });

  describe('저장 동작', () => {
    it('유효한 닉네임을 제출하면 onSave가 호출되어야 한다', async () => {
      render(<NicknameModal {...defaultProps} />);
      const input = screen.getByRole('textbox');
      fireEvent.change(input, { target: { value: '새닉네임' } });
      fireEvent.click(screen.getByRole('button', { name: '저장' }));

      await waitFor(() => {
        expect(defaultProps.onSave).toHaveBeenCalledWith('새닉네임');
      });
    });

    it('저장 성공 시 onClose가 호출되어야 한다', async () => {
      render(<NicknameModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: '저장' }));

      await waitFor(() => {
        expect(defaultProps.onClose).toHaveBeenCalled();
      });
    });

    it('저장 실패 시 에러 메시지가 표시되어야 한다', async () => {
      const onSave = vi.fn().mockResolvedValue(false);
      render(<NicknameModal {...defaultProps} onSave={onSave} />);
      fireEvent.click(screen.getByRole('button', { name: '저장' }));

      await waitFor(() => {
        expect(screen.getByText('닉네임 저장에 실패했습니다.')).toBeInTheDocument();
      });
    });

    it('저장 중 예외 발생 시 에러 메시지가 표시되어야 한다', async () => {
      const onSave = vi.fn().mockRejectedValue(new Error('Network error'));
      render(<NicknameModal {...defaultProps} onSave={onSave} />);
      fireEvent.click(screen.getByRole('button', { name: '저장' }));

      await waitFor(() => {
        expect(screen.getByText('오류가 발생했습니다.')).toBeInTheDocument();
      });
    });

    it('저장 중에는 버튼이 비활성화되어야 한다', async () => {
      const onSave = vi.fn().mockImplementation(() => new Promise(() => {}));
      render(<NicknameModal {...defaultProps} onSave={onSave} />);
      fireEvent.click(screen.getByRole('button', { name: '저장' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '저장 중...' })).toBeDisabled();
        expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
      });
    });
  });

  describe('닫기 동작', () => {
    it('취소 버튼 클릭 시 onClose가 호출되어야 한다', () => {
      render(<NicknameModal {...defaultProps} />);
      fireEvent.click(screen.getByRole('button', { name: '취소' }));
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('오버레이 클릭 시 onClose가 호출되어야 한다', () => {
      render(<NicknameModal {...defaultProps} />);
      const overlay = document.querySelector('.modal-overlay');
      fireEvent.click(overlay!);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('모달 내용 클릭 시 onClose가 호출되지 않아야 한다', () => {
      render(<NicknameModal {...defaultProps} />);
      const content = document.querySelector('.modal-content');
      fireEvent.click(content!);
      expect(defaultProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('모달 재오픈', () => {
    it('모달이 다시 열릴 때 현재 닉네임으로 초기화되어야 한다', () => {
      const { rerender } = render(<NicknameModal {...defaultProps} isOpen={false} />);
      rerender(<NicknameModal {...defaultProps} isOpen={true} currentNickname="새이름" />);

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('새이름');
    });
  });
});
