/**
 * 챌린지 카운트다운 -- 인라인으로 남은 시간 표시
 */

import { useState, useEffect } from 'react';
import { getTimeRemaining } from '@domain/services/challengeService';

type ChallengeCountdownProps = {
  endsAt: Date;
  label?: string;
};

export function ChallengeCountdown({ endsAt, label = '마감' }: ChallengeCountdownProps): JSX.Element {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(endsAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(endsAt));
    }, 60_000);
    return () => clearInterval(timer);
  }, [endsAt]);

  const text = timeLeft.days > 0
    ? `${timeLeft.days}일 ${timeLeft.hours}시간`
    : timeLeft.hours > 0
      ? `${timeLeft.hours}시간 ${timeLeft.minutes}분`
      : `${timeLeft.minutes}분`;

  return (
    <span className="challenge-countdown">
      {label} {text} 남음
    </span>
  );
}
