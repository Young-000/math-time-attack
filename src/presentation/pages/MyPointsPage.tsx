/**
 * 내 포인트 페이지
 * 별 잔액 + 적립/사용 내역
 */

import { useNavigate } from 'react-router-dom';
import { usePoints } from '@presentation/hooks/usePoints';
import { BannerAd } from '@presentation/components';

const TYPE_LABELS: Record<string, string> = {
  game_complete: '\uAC8C\uC784 \uD074\uB9AC\uC5B4',
  round_bonus: '\uB77C\uC6B4\uB4DC \uBCF4\uB108\uC2A4',
  rewarded_ad: '\uAD11\uACE0 \uC2DC\uCCAD',
  mission: '\uBBF8\uC158 \uBCF4\uC0C1',
  daily_login: '\uC77C\uC77C \uCD9C\uC11D',
  exchange: '\uD1A0\uC2A4 \uD3EC\uC778\uD2B8 \uAD50\uD658',
  admin: '\uAD00\uB9AC\uC790',
};

export function MyPointsPage(): JSX.Element {
  const navigate = useNavigate();
  const { balance, totalEarned, isLoading, history } = usePoints();

  return (
    <div className="page my-points-page">
      <header className="mp-header">
        <h1 className="mp-title">{'\uB0B4 \uBCC4'}</h1>
      </header>

      {/* 잔액 카드 */}
      <div className="mp-balance-card">
        <div className="mp-balance-main">
          <span className="mp-star-icon">{'\u2B50'}</span>
          <span className="mp-balance-number">
            {isLoading ? '...' : balance.toLocaleString()}
          </span>
        </div>
        <div className="mp-balance-sub">
          {'\uCD1D \uC801\uB9BD:'} {totalEarned.toLocaleString()}{'\uBCC4'}
        </div>
      </div>

      {/* 교환 버튼 */}
      <button
        className="mp-exchange-btn"
        onClick={() => navigate('/exchange')}
        type="button"
      >
        {'\uD83D\uDCB0 \uD1A0\uC2A4 \uD3EC\uC778\uD2B8\uB85C \uAD50\uD658\uD558\uAE30'}
      </button>

      {/* 내역 */}
      <h2 className="mp-history-title">{'\uC801\uB9BD/\uC0AC\uC6A9 \uB0B4\uC5ED'}</h2>
      <div className="mp-history-list">
        {isLoading ? (
          <div className="mp-history-loading">{'\uB85C\uB529 \uC911...'}</div>
        ) : history.length === 0 ? (
          <div className="mp-history-empty">
            <p>{'\uC544\uC9C1 \uB0B4\uC5ED\uC774 \uC5C6\uC5B4\uC694'}</p>
            <p className="mp-history-empty-sub">
              {'\uAC8C\uC784\uC744 \uD50C\uB808\uC774\uD558\uBA74 \uBCC4\uC744 \uBC1B\uC744 \uC218 \uC788\uC5B4\uC694!'}
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
                {tx.amount > 0 ? '+' : ''}{tx.amount}{'\uBCC4'}
              </span>
            </div>
          ))
        )}
      </div>

      <BannerAd className="banner-ad-my-points" />
    </div>
  );
}
