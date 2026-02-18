/**
 * 하트 부족 모달 컴포넌트
 * - 광고 시청으로 풀충전
 * - 공유하기로 풀충전
 */

import type { HeartInfo } from '@domain/services/heartService';
import { HeartDisplay } from './HeartDisplay';

interface NoHeartsModalProps {
  heartInfo: HeartInfo;
  isAdSupported: boolean;
  isAdLoading: boolean;
  onWatchAd: () => void;
  onShare: () => void;
  onClose: () => void;
  title?: string;
  icon?: string;
}

export function NoHeartsModal({
  heartInfo,
  isAdSupported,
  isAdLoading,
  onWatchAd,
  onShare,
  onClose,
  title = '하트가 부족해요!',
  icon = '\uD83D\uDC94',
}: NoHeartsModalProps) {
  return (
    <div className="no-hearts-modal-overlay">
      <div className="no-hearts-modal">
        <div className="no-hearts-icon">{icon}</div>
        <h2 className="no-hearts-title">{title}</h2>
        <p className="no-hearts-desc">
          게임을 시작하려면 하트가 필요해요.
        </p>

        <div className="no-hearts-status">
          <HeartDisplay heartInfo={heartInfo} size="large" />
          <span className="hearts-timer">
            {'\u23F1\uFE0F'} {heartInfo.timeUntilNextFormatted} 후 +1
          </span>
        </div>

        <div className="no-hearts-actions">
          {isAdSupported && (
            <button
              className="no-hearts-btn primary"
              onClick={onWatchAd}
              disabled={isAdLoading}
            >
              {isAdLoading ? (
                '광고 준비 중...'
              ) : (
                <>
                  <span className="btn-icon">{'\uD83D\uDCFA'}</span>
                  광고 보고 +1 충전
                </>
              )}
            </button>
          )}

          <button
            className="no-hearts-btn secondary"
            onClick={onShare}
          >
            <span className="btn-icon">{'\uD83D\uDCE4'}</span>
            공유하고 +2 충전
          </button>

          <button
            className="no-hearts-btn tertiary"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
