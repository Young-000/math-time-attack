/**
 * 하트 충전소 컴포넌트
 * - 현재 하트 표시
 * - 다음 충전까지 남은 시간
 * - 광고 시청으로 풀충전
 * - 공유하기로 풀충전
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getHeartInfo,
  refillHearts,
  MAX_HEARTS,
  type HeartInfo,
} from '@domain/services/heartService';
import { useRewardedAd } from '@presentation/hooks/useRewardedAd';

interface HeartStationProps {
  onClose?: () => void;
}

export function HeartStation({ onClose }: HeartStationProps) {
  const [heartInfo, setHeartInfo] = useState<HeartInfo>(getHeartInfo());
  const [isSharing, setIsSharing] = useState(false);
  const [showShareSuccess, setShowShareSuccess] = useState(false);

  const { isAdSupported, isAdLoaded, isAdLoading, loadAd, showAd } = useRewardedAd();

  // 하트 정보 주기적 업데이트
  useEffect(() => {
    const updateHeartInfo = () => {
      setHeartInfo(getHeartInfo());
    };

    updateHeartInfo();
    const interval = setInterval(updateHeartInfo, 1000);

    return () => clearInterval(interval);
  }, []);

  // 광고 미리 로드
  useEffect(() => {
    if (isAdSupported && !isAdLoaded && !isAdLoading) {
      loadAd();
    }
  }, [isAdSupported, isAdLoaded, isAdLoading, loadAd]);

  // 광고 시청으로 풀충전
  const handleWatchAd = useCallback(() => {
    showAd({
      onRewarded: () => {
        refillHearts();
        setHeartInfo(getHeartInfo());
        loadAd(); // 다음 광고 로드
      },
      onDismiss: () => {
        // 광고 닫힘
      },
      onError: (error) => {
        console.error('Ad error:', error);
      },
    });
  }, [showAd, loadAd]);

  // 공유하기로 풀충전
  const handleShare = useCallback(async () => {
    setIsSharing(true);

    try {
      if (navigator.share) {
        await navigator.share({
          title: '구구단 챌린지',
          text: '구구단 실력을 테스트해보세요! 타임어택 모드에서 나와 대결해요 🔥',
          url: window.location.origin,
        });

        // 공유 성공 시 풀충전
        refillHearts();
        setHeartInfo(getHeartInfo());
        setShowShareSuccess(true);
        setTimeout(() => setShowShareSuccess(false), 2000);
      } else {
        // Web Share API 미지원 시 클립보드 복사
        await navigator.clipboard.writeText(
          `구구단 챌린지 - 타임어택 모드에서 나와 대결해요! 🔥\n${window.location.origin}`
        );

        // 복사 성공 시 풀충전
        refillHearts();
        setHeartInfo(getHeartInfo());
        setShowShareSuccess(true);
        setTimeout(() => setShowShareSuccess(false), 2000);
      }
    } catch (error) {
      // 사용자가 공유 취소한 경우 등
      console.log('Share cancelled or failed:', error);
    } finally {
      setIsSharing(false);
    }
  }, []);

  // 하트 아이콘 렌더링
  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < MAX_HEARTS; i++) {
      hearts.push(
        <span
          key={i}
          className={`heart-station-icon ${i < heartInfo.count ? 'filled' : 'empty'}`}
        >
          {i < heartInfo.count ? '❤️' : '🤍'}
        </span>
      );
    }
    return hearts;
  };

  return (
    <div className="heart-station">
      <div className="heart-station-header">
        <h3 className="heart-station-title">❤️ 하트 충전소</h3>
        {onClose && (
          <button className="heart-station-close" onClick={onClose} aria-label="닫기">
            ✕
          </button>
        )}
      </div>

      <div className="heart-station-display">
        <div className="heart-station-hearts">{renderHearts()}</div>
        <div className="heart-station-count">
          {heartInfo.count} / {heartInfo.maxHearts}
        </div>
        {!heartInfo.isFull && (
          <div className="heart-station-timer">
            ⏱️ {heartInfo.timeUntilNextFormatted} 후 +1
          </div>
        )}
        {heartInfo.isFull && (
          <div className="heart-station-full">충전 완료!</div>
        )}
      </div>

      <div className="heart-station-actions">
        {isAdSupported && (
          <button
            className="heart-station-btn ad-btn"
            onClick={handleWatchAd}
            disabled={isAdLoading || heartInfo.isFull}
          >
            {isAdLoading ? (
              '광고 준비 중...'
            ) : heartInfo.isFull ? (
              '이미 가득 찼어요!'
            ) : (
              <>
                <span className="btn-icon">📺</span>
                광고 보고 풀충전
              </>
            )}
          </button>
        )}

        <button
          className="heart-station-btn share-btn"
          onClick={handleShare}
          disabled={isSharing || heartInfo.isFull}
        >
          {isSharing ? (
            '공유 중...'
          ) : showShareSuccess ? (
            '✅ 충전 완료!'
          ) : heartInfo.isFull ? (
            '이미 가득 찼어요!'
          ) : (
            <>
              <span className="btn-icon">📤</span>
              공유하고 풀충전
            </>
          )}
        </button>
      </div>
    </div>
  );
}
