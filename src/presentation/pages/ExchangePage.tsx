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
      setErrorMsg('네트워크 오류가 발생했습니다');
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
        <h1 className="exchange-title">{'토스 포인트 교환'}</h1>
      </header>

      {/* 별 잔액 */}
      <div className="exchange-balance-card">
        <span className="exchange-balance-label">{'내 별'}</span>
        <div className="exchange-balance-value">
          <span className="exchange-star-icon">{'⭐'}</span>
          <span className="exchange-star-count">
            {isPointsLoading ? '...' : balance.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 교환 비율 */}
      <div className="exchange-rate-info">
        <div className="exchange-rate-row">
          <span>{'⭐'} {EXCHANGE_RATE.stars}{'별'}</span>
          <span className="exchange-rate-arrow">{'→'}</span>
          <span>{'💰'} {EXCHANGE_RATE.tossPoints} {'토스 포인트'}</span>
        </div>
        {canExchange && (
          <p className="exchange-max-info">
            {'최대'} {maxStars.toLocaleString()}{'별'} {'→'} {maxTossPoints.toLocaleString()} {'토스 포인트 교환 가능'}
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
        <p>{'•'} {EXCHANGE_RATE.stars}{'별 = '}{EXCHANGE_RATE.tossPoints}{'토스 포인트 단위로 교환 가능합니다'}</p>
        <p>{'• 적립한 만큼 무제한 교환 가능합니다'}</p>
        <p>{'• 교환된 포인트는 취소할 수 없습니다'}</p>
        <p>{'• 본 프로모션은 사전 고지 없이 중단될 수 있습니다'}</p>
      </div>

      {/* 내 포인트 페이지 링크 */}
      <button
        className="exchange-history-link"
        onClick={() => navigate('/my-points')}
        type="button"
      >
        {'📋 적립/사용 내역 보기'}
      </button>

      <BannerAd className="banner-ad-exchange" />
    </div>
  );
}
