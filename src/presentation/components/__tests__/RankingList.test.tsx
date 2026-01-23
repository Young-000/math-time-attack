/**
 * RankingList 컴포넌트 테스트
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankingList } from '../RankingList';
import type { RankingItem } from '@domain/entities';

describe('RankingList', () => {
  const mockRankings: RankingItem[] = [
    { rank: 1, odl_id: 'user001', nickname: '챔피언', time: 10000 },
    { rank: 2, odl_id: 'user002', nickname: '도전자', time: 12000 },
    { rank: 3, odl_id: 'user003', nickname: null, time: 15000 },
    { rank: 4, odl_id: 'user004', nickname: '일반유저', time: 20000 },
  ];

  describe('로딩 상태', () => {
    it('로딩 중일 때 로딩 UI를 표시해야 한다', () => {
      render(<RankingList rankings={[]} myOdlId={null} isLoading={true} />);
      expect(screen.getByText('랭킹을 불러오는 중...')).toBeInTheDocument();
      expect(screen.getByLabelText('로딩 중')).toBeInTheDocument();
    });
  });

  describe('빈 상태', () => {
    it('랭킹이 비어있을 때 빈 상태 메시지를 표시해야 한다', () => {
      render(<RankingList rankings={[]} myOdlId={null} isLoading={false} />);
      expect(screen.getByText('아직 기록이 없습니다.')).toBeInTheDocument();
      expect(screen.getByText('첫 번째 기록을 세워보세요!')).toBeInTheDocument();
    });
  });

  describe('랭킹 목록 렌더링', () => {
    it('랭킹 목록이 올바르게 렌더링되어야 한다', () => {
      render(<RankingList rankings={mockRankings} myOdlId={null} isLoading={false} />);
      expect(screen.getByRole('list', { name: '랭킹 목록' })).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(4);
    });

    it('1등에 금메달이 표시되어야 한다', () => {
      render(<RankingList rankings={mockRankings} myOdlId={null} isLoading={false} />);
      expect(screen.getByText('🥇')).toBeInTheDocument();
    });

    it('2등에 은메달이 표시되어야 한다', () => {
      render(<RankingList rankings={mockRankings} myOdlId={null} isLoading={false} />);
      expect(screen.getByText('🥈')).toBeInTheDocument();
    });

    it('3등에 동메달이 표시되어야 한다', () => {
      render(<RankingList rankings={mockRankings} myOdlId={null} isLoading={false} />);
      expect(screen.getByText('🥉')).toBeInTheDocument();
    });

    it('4등 이후에는 숫자가 표시되어야 한다', () => {
      render(<RankingList rankings={mockRankings} myOdlId={null} isLoading={false} />);
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('닉네임이 표시되어야 한다', () => {
      render(<RankingList rankings={mockRankings} myOdlId={null} isLoading={false} />);
      expect(screen.getByText('챔피언')).toBeInTheDocument();
      expect(screen.getByText('도전자')).toBeInTheDocument();
    });

    it('닉네임이 없을 때 플레이어 ID의 마지막 4자리가 표시되어야 한다', () => {
      render(<RankingList rankings={mockRankings} myOdlId={null} isLoading={false} />);
      expect(screen.getByText('플레이어r003')).toBeInTheDocument();
    });

    it('시간이 포맷팅되어 표시되어야 한다', () => {
      render(<RankingList rankings={mockRankings} myOdlId={null} isLoading={false} />);
      expect(screen.getByText('10.00초')).toBeInTheDocument();
      expect(screen.getByText('12.00초')).toBeInTheDocument();
    });
  });

  describe('내 랭킹 표시', () => {
    it('내 랭킹 항목에 "나" 뱃지가 표시되어야 한다', () => {
      render(<RankingList rankings={mockRankings} myOdlId="user002" isLoading={false} />);
      expect(screen.getByText('나')).toBeInTheDocument();
    });

    it('내 랭킹 항목에 is-me 클래스가 적용되어야 한다', () => {
      render(<RankingList rankings={mockRankings} myOdlId="user002" isLoading={false} />);
      const items = screen.getAllByRole('listitem');
      expect(items[1]).toHaveClass('is-me');
    });

    it('myOdlId가 없을 때 "나" 뱃지가 표시되지 않아야 한다', () => {
      render(<RankingList rankings={mockRankings} myOdlId={null} isLoading={false} />);
      expect(screen.queryByText('나')).not.toBeInTheDocument();
    });
  });
});
