/**
 * 토스 포인트 교환 페이지
 * 내부 포인트(별) -> 토스 포인트 교환
 * 교환비: 100별 = 1P (프로모션 Edge Function 사용)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePoints } from '@presentation/hooks/usePoints';
import { EXCHANGE_RATE, MIN_EXCHANGE_STARS } from '@constants/points';
import { BannerAd } from '@presentation/components';
import { getCachedUserId } from '@infrastructure/userIdentity';
import { claimPromotion } from '@domain/services/promotionService';
import { spendPoints } from '@domain/services/pointService';
import { recordExchange, checkMissions } from '@domain/services/missionService';
import { getCurrentStreak } from '@domain/services/streakService';

const PROD_CODE = '01KMATK7D77QHW1PKD9B8DCZK2';
const PROMOTION_CODE = import.meta.env.DEV ? `TEST_${PROD_CODE}` : PROD_CODE;

type ExchangeStatus = 'idle' | 'loading' | 'success' | 'error';

export function ExchangePage(): JSX.Element {
  const navigate = useNavigate();
  const { balance, refresh, isLoading: isPointsLoading } = usePoints();
  const [status, setStatus] = useState<ExchangeStatus>('idle');
  // Exchange active
  const [errorMsg, setErrorMsg] = useState('');
  const [lastResult, setLastResult] = useState<{
    starsSpent: number;
    tossPoints: number;
  } | null>(null);

  const canExchange = balance >= MIN_EXCHANGE_STARS;
  const exchangeUnits = Math.floor(balance / EXCHANGE_RATE.stars);
  const maxStars = exchangeUnits * EXCHANGE_RATE.stars;
  const maxTossPoints = exchangeUnits * EXCHANGE_RATE.tossPoints;

  const handleExchange = useCallback(async (): Promise<void> => {
    if (!canExchange) return;
    setStatus('loading');
    setErrorMsg('');

    try {
      const userKey = getCachedUserId();
      if (!userKey) {
        setStatus('error');
        setErrorMsg('로그인이 필요합니다');
        return;
      }

      const tossPoints = maxTossPoints;
      const starsToSpend = maxStars;

      // 1. 프로모션 API 먼저 호출 (전체 잔액 한 번에 교환)
      const result = await claimPromotion(PROMOTION_CODE, tossPoints, userKey);

      if (result.success) {
        // 2. API 성공 후에만 별 차감
        await spendPoints(userKey, starsToSpend, 'exchange', `${starsToSpend}별 -> ${tossPoints}P 교환`);

        setStatus('success');
        setLastResult({ starsSpent: starsToSpend, tossPoints });

        // 미션 통계 업데이트
        recordExchange(tossPoints);
        checkMissions(getCurrentStreak());

        refresh();
      } else {
        setStatus('error');
        setErrorMsg(result.error);
      }
    } catch {
      setStatus('error');
      setErrorMsg('\uB124\uD2B8\uC6CC\uD06C \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4');
    }
  }, [canExchange, refresh]);

  // Reset status after 3s
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      const timer = setTimeout(() => setStatus('idle'), 3000);
      return (): void => { clearTimeout(timer); };
    }
  }, [status]);

  return (
    <div className="page exchange-page">
      <header className="exchange-header">
        <h1 className="exchange-title">{'\uD1A0\uC2A4 \uD3EC\uC778\uD2B8 \uAD50\uD658'}</h1>
      </header>

      {/* 별 잔액 */}
      <div className="exchange-balance-card">
        <span className="exchange-balance-label">{'\uB0B4 \uBCC4'}</span>
        <div className="exchange-balance-value">
          <span className="exchange-star-icon">{'\u2B50'}</span>
          <span className="exchange-star-count">
            {isPointsLoading ? '...' : balance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 교환 비율 */}
      <div className="exchange-rate-info">
        <div className="exchange-rate-row">
          <span>{'\u2B50'} {EXCHANGE_RATE.stars}{'\uBCC4'}</span>
          <span className="exchange-rate-arrow">{'\u2192'}</span>
          <span>{'\uD83D\uDCB0'} {EXCHANGE_RATE.tossPoints} {'\uD1A0\uC2A4 \uD3EC\uC778\uD2B8'}</span>
        </div>
        {canExchange && (
          <p className="exchange-max-info">
            {'\uCD5C\uB300'} {maxStars.toLocaleString()}{'\uBCC4'} {'\u2192'} {maxTossPoints.toLocaleString()} {'\uD1A0\uC2A4 \uD3EC\uC778\uD2B8 \uAD50\uD658 \uAC00\uB2A5'}
          </p>
        )}
      </div>

      {/* 교환 버튼 */}
      {status === 'success' && lastResult ? (
        <div style={{ textAlign: 'center', padding: '16px', background: '#e8f5e9', borderRadius: '12px', margin: '8px 0' }}>
          <p style={{ color: '#2e7d32', fontWeight: 700 }}>교환 완료! ⭐{lastResult.starsSpent}별 → {lastResult.tossPoints}P</p>
        </div>
      ) : status === 'error' ? (
        <div style={{ textAlign: 'center', padding: '16px', background: '#ffebee', borderRadius: '12px', margin: '8px 0' }}>
          <p style={{ color: '#c62828', fontWeight: 700 }}>{errorMsg || '교환 실패'}</p>
        </div>
      ) : (
        <button
          className={`exchange-btn ${!canExchange ? 'disabled' : ''}`}
          disabled={!canExchange || status === 'loading'}
          onClick={handleExchange}
          type="button"
        >
          {status === 'loading' ? '교환 중...' : canExchange ? `${maxStars.toLocaleString()}별 → ${maxTossPoints.toLocaleString()}P 전체 교환하기` : '별이 부족합니다'}
        </button>
      )}

      {/* 필수 고지 */}
      <div className="exchange-disclaimer">
        <p>{'\u2022'} {EXCHANGE_RATE.stars}{'\uBCC4 = '}{EXCHANGE_RATE.tossPoints}{'\uD1A0\uC2A4 \uD3EC\uC778\uD2B8 \uB2E8\uC704\uB85C \uAD50\uD658 \uAC00\uB2A5\uD569\uB2C8\uB2E4'}</p>
        <p>{'\u2022 \uC801\uB9BD\uD55C \uB9CC\uD07C \uBB34\uC81C\uD55C \uAD50\uD658 \uAC00\uB2A5\uD569\uB2C8\uB2E4'}</p>
        <p>{'\u2022 \uAD50\uD658\uB41C \uD3EC\uC778\uD2B8\uB294 \uCDE8\uC18C\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4'}</p>
        <p>{'\u2022 \uBCF8 \uD504\uB85C\uBAA8\uC158\uC740 \uC0AC\uC804 \uACE0\uC9C0 \uC5C6\uC774 \uC911\uB2E8\uB420 \uC218 \uC788\uC2B5\uB2C8\uB2E4'}</p>
      </div>

      {/* 내 포인트 페이지 링크 */}
      <button
        className="exchange-history-link"
        onClick={() => navigate('/my-points')}
        type="button"
      >
        {'\uD83D\uDCCB \uC801\uB9BD/\uC0AC\uC6A9 \uB0B4\uC5ED \uBCF4\uAE30'}
      </button>

      <BannerAd className="banner-ad-exchange" />
    </div>
  );
}
