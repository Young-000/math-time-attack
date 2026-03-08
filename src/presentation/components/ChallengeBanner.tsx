/**
 * 챌린지 배너 -- 현재 진행 중인 주간/월간 챌린지 안내
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCurrentChallengeInfo,
  getTimeRemaining,
  type ChallengeType,
} from '@domain/services/challengeService';
import { WEEKLY_REWARDS, MONTHLY_REWARDS } from '@constants/points';

export function ChallengeBanner(): JSX.Element {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ChallengeType>('weekly');
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  const info = getCurrentChallengeInfo(activeTab);
  const rewards = activeTab === 'weekly' ? WEEKLY_REWARDS : MONTHLY_REWARDS;

  useEffect(() => {
    const update = (): void => setTimeLeft(getTimeRemaining(info.endsAt));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [info.endsAt]);

  const timeText = timeLeft.days > 0
    ? `${timeLeft.days}일 ${timeLeft.hours}시간`
    : `${timeLeft.hours}시간 ${timeLeft.minutes}분`;

  return (
    <div className="challenge-banner">
      <div className="challenge-tabs">
        <button
          className={`challenge-tab ${activeTab === 'weekly' ? 'active' : ''}`}
          onClick={() => setActiveTab('weekly')}
          type="button"
        >
          주간 챌린지
        </button>
        <button
          className={`challenge-tab ${activeTab === 'monthly' ? 'active' : ''}`}
          onClick={() => setActiveTab('monthly')}
          type="button"
        >
          월간 챌린지
        </button>
      </div>

      <div className="challenge-info">
        <div className="challenge-period">{info.periodLabel}</div>
        <div className="challenge-timer">마감까지 {timeText}</div>
        <div className="challenge-rewards">
          <span className="reward-item">{'\uD83E\uDD47'} {rewards[1]}별</span>
          <span className="reward-item">{'\uD83E\uDD48'} {rewards[2]}별</span>
          <span className="reward-item">{'\uD83E\uDD49'} {rewards[3]}별</span>
        </div>
      </div>

      <button
        className="challenge-hall-link"
        onClick={() => navigate('/hall-of-fame')}
        type="button"
      >
        {'\uD83C\uDFC6'} 명예의 전당
      </button>
    </div>
  );
}
