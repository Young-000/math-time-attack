/**
 * RankingTab 컴포넌트 테스트
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RankingTab } from '../RankingTab';
import type { DifficultyType } from '@domain/entities';

describe('RankingTab', () => {
  const defaultProps = {
    selectedDifficulty: 'easy' as DifficultyType,
    onSelect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('렌더링', () => {
    it('모든 난이도 탭이 렌더링되어야 한다', () => {
      render(<RankingTab {...defaultProps} />);
      expect(screen.getByRole('tab', { name: '초급' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '중급' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: '고급' })).toBeInTheDocument();
    });

    it('tablist role이 적용되어야 한다', () => {
      render(<RankingTab {...defaultProps} />);
      expect(screen.getByRole('tablist', { name: '난이도 선택' })).toBeInTheDocument();
    });
  });

  describe('선택 상태', () => {
    it('선택된 탭에 active 클래스가 적용되어야 한다', () => {
      render(<RankingTab {...defaultProps} selectedDifficulty="easy" />);
      const easyTab = screen.getByRole('tab', { name: '초급' });
      expect(easyTab).toHaveClass('active');
    });

    it('선택된 탭의 aria-selected가 true여야 한다', () => {
      render(<RankingTab {...defaultProps} selectedDifficulty="medium" />);
      const mediumTab = screen.getByRole('tab', { name: '중급' });
      expect(mediumTab).toHaveAttribute('aria-selected', 'true');
    });

    it('선택되지 않은 탭의 aria-selected가 false여야 한다', () => {
      render(<RankingTab {...defaultProps} selectedDifficulty="easy" />);
      const mediumTab = screen.getByRole('tab', { name: '중급' });
      expect(mediumTab).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('탭 클릭', () => {
    it('초급 탭 클릭 시 onSelect가 "easy"와 함께 호출되어야 한다', () => {
      render(<RankingTab {...defaultProps} selectedDifficulty="medium" />);
      fireEvent.click(screen.getByRole('tab', { name: '초급' }));
      expect(defaultProps.onSelect).toHaveBeenCalledWith('easy');
    });

    it('중급 탭 클릭 시 onSelect가 "medium"과 함께 호출되어야 한다', () => {
      render(<RankingTab {...defaultProps} selectedDifficulty="easy" />);
      fireEvent.click(screen.getByRole('tab', { name: '중급' }));
      expect(defaultProps.onSelect).toHaveBeenCalledWith('medium');
    });

    it('고급 탭 클릭 시 onSelect가 "hard"와 함께 호출되어야 한다', () => {
      render(<RankingTab {...defaultProps} selectedDifficulty="easy" />);
      fireEvent.click(screen.getByRole('tab', { name: '고급' }));
      expect(defaultProps.onSelect).toHaveBeenCalledWith('hard');
    });
  });

  describe('접근성', () => {
    it('각 탭에 aria-controls 속성이 있어야 한다', () => {
      render(<RankingTab {...defaultProps} />);
      const easyTab = screen.getByRole('tab', { name: '초급' });
      expect(easyTab).toHaveAttribute('aria-controls', 'ranking-panel-easy');
    });
  });
});
