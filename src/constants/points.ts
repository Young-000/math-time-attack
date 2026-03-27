/**
 * 내부 포인트("별") 시스템 상수
 *
 * 경제 모델 (v2 리밸런스):
 * - 무료: 최대 2P/일 = 200별
 *   - 출석 30 + 게임 15x3 + 라운드 5x3 + 스트릭 ~20 + 미션(무료분) ~70 = ~180
 * - 광고 5회: 추가 8P = 800별
 *   - 100x5 = 500 + 추가 게임/미션(광고분) ~300 = ~800
 * - 총합: 최대 10P/일 = 1000별
 */

// 게임 완료 보너스 (5문제 클리어)
export const GAME_COMPLETE_STARS = 15;

// 라운드 완료 보너스
export const ROUND_BONUS_STARS = 5;

// 보상형 광고 시청 보상
export const REWARDED_AD_STARS = 100;

// 일일 출석 보너스
export const DAILY_LOGIN_STARS = 30;

// 연속 출석 보너스 (일수별, 7일 주기 반복)
export const STREAK_BONUS_STARS: Record<number, number> = {
  1: 15,
  2: 20,
  3: 25,
  4: 30,
  5: 35,
  6: 40,
  7: 50,
} as const;

// 토스 포인트 교환 (100별 = 1P)
export const EXCHANGE_RATE = {
  stars: 100,
  tossPoints: 1,
} as const;

export const MIN_EXCHANGE_STARS = 100;
export const MAX_EXCHANGE_PER_DAY = 0; // 무제한
