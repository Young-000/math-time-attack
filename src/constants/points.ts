/** 내부 포인트("별") 시스템 상수 */

// 게임 완료 보너스 (5문제 클리어)
export const GAME_COMPLETE_STARS = 5;

// 라운드 완료 보너스
export const ROUND_BONUS_STARS = 3;

// 보상형 광고 시청 보상
export const REWARDED_AD_STARS = 20;

// 일일 출석 보너스
export const DAILY_LOGIN_STARS = 10;

// 토스 포인트 교환 (10별 = 1P)
export const EXCHANGE_RATE = {
  stars: 10,
  tossPoints: 1,
} as const;

export const MIN_EXCHANGE_STARS = 10;
export const MAX_EXCHANGE_PER_DAY = 0; // 무제한
