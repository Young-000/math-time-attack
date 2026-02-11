/**
 * 연속 출석 배너 컴포넌트
 */

import { useState } from 'react';
import {
  getStreakData,
  getWeekAttendance,
  getDayName,
  isCheckedInToday,
} from '@domain/services/streakService';

export function StreakBanner() {
  const [streak] = useState(() => getStreakData().currentStreak);
  const [weekAttendance] = useState(() => getWeekAttendance());
  const [checkedToday] = useState(() => isCheckedInToday());

  const todayIndex = new Date().getDay();

  return (
    <div className="streak-banner">
      <div className="streak-header">
        <div className="streak-info">
          <span className="streak-icon">🔥</span>
          <span className="streak-count">{streak}일 연속</span>
        </div>
        {checkedToday && (
          <span className="streak-today-badge">오늘 완료!</span>
        )}
      </div>

      <div className="streak-calendar">
        {weekAttendance.map((attended, index) => (
          <div
            key={index}
            className={`streak-day ${attended ? 'attended' : ''} ${index === todayIndex ? 'today' : ''}`}
          >
            <span className="streak-day-name">{getDayName(index)}</span>
            <span className="streak-day-icon">
              {attended ? '✓' : index === todayIndex && !checkedToday ? '○' : '·'}
            </span>
          </div>
        ))}
      </div>

      {!checkedToday && (
        <p className="streak-prompt">게임을 완료하면 출석 체크됩니다!</p>
      )}
    </div>
  );
}
