/** 내부 포인트("별") 시스템 상수 */

// 게임 완료 보너스
export const GAME_COMPLETE_STARS = 10;

// 주간 챌린지 보상
export const WEEKLY_REWARDS = {
  1: 100,
  2: 50,
  3: 30,
} as const;

// 월간 챌린지 보상
export const MONTHLY_REWARDS = {
  1: 1000,
  2: 500,
  3: 300,
} as const;

// 일일 출석 보너스
export const DAILY_LOGIN_STARS = 20;

// 토스 포인트 교환
export const EXCHANGE_RATE = {
  stars: 500,
  tossPoints: 100,
} as const;

export const MIN_EXCHANGE_STARS = 500;
export const MAX_EXCHANGE_PER_DAY = 3;
