/**
 * 토스 포인트 교환 페이지
 * 내부 포인트(별) -> 토스 포인트 교환
 * 교환비: 10별 = 1P (프로모션 Edge Function 사용)
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

const PROMOTION_CODE = 'TEST_MATH_ATTACK_EXCHANGE'; // 콘솔 등록 후 실제 코드로 교체

type ExchangeStatus = 'idle' | 'loading' | 'success' | 'error';

export function ExchangePage(): JSX.Element {
  const navigate = useNavigate();
  const { balance, refresh, isLoading: isPointsLoading } = usePoints();
  const [status, setStatus] = useState<ExchangeStatus>('idle');
  // Exchange disabled (준비 중) - keeping code for future use
  const [_errorMsg, setErrorMsg] = useState('');
  const [_lastResult, setLastResult] = useState<{
    starsSpent: number;
    tossPoints: number;
  } | null>(null);

  const canExchange = balance >= MIN_EXCHANGE_STARS;
  const exchangeUnits = Math.floor(balance / EXCHANGE_RATE.stars);
  const maxStars = exchangeUnits * EXCHANGE_RATE.stars;
  const maxTossPoints = exchangeUnits * EXCHANGE_RATE.tossPoints;

  // @ts-expect-error Exchange disabled (준비 중) - keeping for future use
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleExchange = useCallback(async (): Promise<void> => {
    if (!canExchange) return;
    setStatus('loading');
    setErrorMsg('');

    try {
      const userKey = getCachedUserId();
      if (!userKey || userKey.startsWith('local-') || userKey.startsWith('temp-')) {
        setStatus('error');
        setErrorMsg('\uD1A0\uC2A4 \uB85C\uADF8\uC778\uC774 \uD544\uC694\uD569\uB2C8\uB2E4');
        return;
      }

      const tossPoints = EXCHANGE_RATE.tossPoints;

      // 1. 프로모션 API 먼저 호출
      const result = await claimPromotion(PROMOTION_CODE, tossPoints, userKey);

      if (result.success) {
        // 2. API 성공 후에만 별 차감
        await spendPoints(userKey, EXCHANGE_RATE.stars, 'exchange', `${EXCHANGE_RATE.stars}별 -> ${tossPoints}P 교환`);

        setStatus('success');
        setLastResult({ starsSpent: EXCHANGE_RATE.stars, tossPoints });

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
        <button
          className="exchange-back-btn"
          onClick={() => navigate(-1)}
          aria-label="\uB4A4\uB85C\uAC00\uAE30"
          type="button"
        >
          &larr;
        </button>
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

      {/* 교환 버튼 (준비 중) */}
      <button
        className="exchange-btn disabled"
        disabled={true}
        type="button"
      >
        토스 포인트 교환 준비 중
      </button>
      <p className="exchange-coming-soon" style={{ textAlign: 'center', color: '#888', fontSize: '13px', margin: '12px 0' }}>
        토스 포인트 교환 기능은 곧 오픈됩니다
      </p>

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
