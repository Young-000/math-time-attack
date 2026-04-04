/**
 * 내 포인트 페이지
 * 별 잔액 + 적립/사용 내역
 */

import { useNavigate } from 'react-router-dom';
import { usePoints } from '@presentation/hooks/usePoints';
import { BannerAd } from '@presentation/components';

const TYPE_LABELS: Record<string, string> = {
  game_complete: '게임 클리어',
  round_bonus: '라운드 보너스',
  rewarded_ad: '광고 시청',
  mission: '미션 보상',
  daily_login: '일일 출석',
  exchange: '토스 포인트 교환',
  admin: '관리자',
};

export function MyPointsPage(): JSX.Element {
  const navigate = useNavigate();
  const { balance, totalEarned, isLoading, history } = usePoints();

  return (
    <div className="page my-points-page">
      <header className="mp-header">
        <h1 className="mp-title">{'내 별'}</h1>
      </header>

      {/* 잔액 카드 */}
      <div className="mp-balance-card">
        <div className="mp-balance-main">
          <span className="mp-star-icon">{'⭐'}</span>
          <span className="mp-balance-number">
            {isLoading ? '...' : balance.toLocaleString()}
          </span>
        </div>
        <div className="mp-balance-sub">
          {'총 적립:'} {totalEarned.toLocaleString()}{'별'}
        </div>
      </div>

      {/* 교환 버튼 */}
      <button
        className="mp-exchange-btn"
        onClick={() => navigate('/exchange')}
        type="button"
      >
        {'💰 토스 포인트로 교환하기'}
      </button>

      {/* 내역 */}
      <h2 className="mp-history-title">{'적립/사용 내역'}</h2>
      <div className="mp-history-list">
        {isLoading ? (
          <div className="mp-history-loading">{'로딩 중...'}</div>
        ) : history.length === 0 ? (
          <div className="mp-history-empty">
            <p>{'아직 내역이 없어요'}</p>
            <p className="mp-history-empty-sub">
              {'게임을 플레이하면 별을 받을 수 있어요!'}
            </p>
          </div>
        ) : (
          history.map((tx) => (
            <div
              key={tx.id}
              className={`mp-history-item ${tx.amount > 0 ? 'earn' : 'spend'}`}
            >
              <div className="mp-history-info">
                <span className="mp-history-type">
                  {TYPE_LABELS[tx.type] ?? tx.type}
                </span>
                <span className="mp-history-desc">
                  {tx.description ?? ''}
                </span>
                <span className="mp-history-date">
                  {new Date(tx.created_at).toLocaleDateString('ko-KR')}
                </span>
              </div>
              <span
                className={`mp-history-amount ${tx.amount > 0 ? 'positive' : 'negative'}`}
              >
                {tx.amount > 0 ? '+' : ''}{tx.amount}{'별'}
              </span>
            </div>
          ))
        )}
      </div>

      <BannerAd className="banner-ad-my-points" />
    </div>
  );
}
