/** 내부 포인트("별") 시스템 상수 */

// 게임 완료 보너스 (5문제 클리어)
export const GAME_COMPLETE_STARS = 10;

// 라운드 완료 보너스
export const ROUND_BONUS_STARS = 5;

// 보상형 광고 시청 보상
export const REWARDED_AD_STARS = 100;

// 일일 출석 보너스
export const DAILY_LOGIN_STARS = 50;

// 연속 출석 보너스 (일수별, 7일 주기 반복)
export const STREAK_BONUS_STARS: Record<number, number> = {
  1: 30,
  2: 40,
  3: 50,
  4: 60,
  5: 70,
  6: 80,
  7: 100,
} as const;

// 토스 포인트 교환 (100별 = 1P)
export const EXCHANGE_RATE = {
  stars: 100,
  tossPoints: 1,
} as const;

export const MIN_EXCHANGE_STARS = 100;
export const MAX_EXCHANGE_PER_DAY = 0; // 무제한
