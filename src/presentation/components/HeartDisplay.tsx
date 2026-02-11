/**
 * 하트 아이콘 표시 컴포넌트
 * 여러 페이지에서 공통으로 사용
 */

import { MAX_HEARTS, type HeartInfo } from '@domain/services/heartService';

interface HeartDisplayProps {
  heartInfo: HeartInfo;
  size?: 'small' | 'mini' | 'large';
  showCount?: boolean;
  showTimer?: boolean;
}

export function HeartDisplay({
  heartInfo,
  size = 'small',
  showCount = false,
  showTimer = false,
}: HeartDisplayProps) {
  const sizeClass = size === 'mini' ? 'heart-mini' : size === 'large' ? 'heart-icon-large' : 'heart-icon-small';

  return (
    <>
      <div className={size === 'large' ? 'hearts-display-large' : 'hearts-display'}>
        {Array.from({ length: MAX_HEARTS }, (_, i) => (
          <span
            key={i}
            className={`${sizeClass} ${i < heartInfo.count ? 'filled' : 'empty'}`}
          >
            {i < heartInfo.count ? '\u2764\uFE0F' : '\uD83E\uDD0D'}
          </span>
        ))}
      </div>
      {showCount && (
        <span className="hearts-count">{heartInfo.count}/{MAX_HEARTS}</span>
      )}
      {showTimer && !heartInfo.isFull && (
        <span className="hearts-timer-small">
          {heartInfo.timeUntilNextFormatted} 후 +1
        </span>
      )}
    </>
  );
}
