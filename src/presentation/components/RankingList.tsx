/**
 * 랭킹 리스트 컴포넌트
 */

import type { RankingItem } from '@domain/entities';
import { formatTime } from '@lib/utils';

interface RankingListProps {
  rankings: RankingItem[];
  myOdlId?: string | null;
  isLoading: boolean;
}

export function RankingList({ rankings, myOdlId, isLoading }: RankingListProps) {
  if (isLoading) {
    return (
      <div className="ranking-loading">
        <div className="loading-spinner" aria-label="로딩 중" />
        <p>랭킹을 불러오는 중...</p>
      </div>
    );
  }

  if (rankings.length === 0) {
    return (
      <div className="ranking-empty">
        <p>아직 기록이 없습니다.</p>
        <p>첫 번째 기록을 세워보세요!</p>
      </div>
    );
  }

  return (
    <div className="ranking-list" role="list" aria-label="랭킹 목록">
      {rankings.map((item) => {
        const isMe = myOdlId && item.odl_id === myOdlId;

        return (
          <div
            key={item.odl_id}
            className={`ranking-item ${isMe ? 'is-me' : ''}`}
            role="listitem"
          >
            <div className="ranking-rank">
              {item.rank <= 3 ? (
                <span className={`ranking-medal rank-${item.rank}`}>
                  {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉'}
                </span>
              ) : (
                <span className="ranking-number">{item.rank}</span>
              )}
            </div>
            <div className="ranking-info">
              <span className={`ranking-nickname ${isMe ? 'is-me' : ''}`}>
                {item.nickname || `플레이어${item.odl_id.slice(-4)}`}
                {isMe && <span className="ranking-me-badge">나</span>}
              </span>
            </div>
            <div className={`ranking-time ${isMe ? 'is-me' : ''}`}>
              {formatTime(item.time)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
