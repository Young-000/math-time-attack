/**
 * 내부 포인트("별") 시스템 상수
 *
 * 경제 모델 (v3 리밸런스, 2026-08-04):
 * 보상형 광고 실단가가 0.2원까지 하락해 v2(3원 가정)는 광고 1회당 0.8원 역마진이었다.
 * 환원율 목표 = 광고 수익의 25%.
 * - 광고 1회 = 5별 (0.05원 지급 / 0.2원 수익)
 * - 무료 경로 일 총합 ≈ 10별 (0.1원)
 * - 일일 최대 ≈ 40별 = 0.4P (광고 5회 기준), 수익 ~1.6원 → 마진 ~75%
 */

// 게임 완료 보너스 (5문제 클리어)
export const GAME_COMPLETE_STARS = 1;

// 라운드 완료 보너스
export const ROUND_BONUS_STARS = 1;

// 보상형 광고 시청 보상
export const REWARDED_AD_STARS = 5;

// 일일 출석 보너스
export const DAILY_LOGIN_STARS = 3;

// 연속 출석 보너스 (일수별, 7일 주기 반복)
export const STREAK_BONUS_STARS: Record<number, number> = {
  1: 1,
  2: 1,
  3: 2,
  4: 2,
  5: 3,
  6: 3,
  7: 5,
} as const;

// 토스 포인트 교환 (100별 = 1P)
export const EXCHANGE_RATE = {
  stars: 100,
  tossPoints: 1,
} as const;

export const MIN_EXCHANGE_STARS = 100;
export const MAX_EXCHANGE_PER_DAY = 0; // 무제한

/** 1회당 최대 교환 토스 포인트 (SDK grantPromotionReward 제한) */
export const MAX_EXCHANGE_TOSS_POINTS = 100;

/** 1회당 최대 교환 별 (= MAX_EXCHANGE_TOSS_POINTS × 교환비) */
export const MAX_EXCHANGE_STARS =
  MAX_EXCHANGE_TOSS_POINTS * EXCHANGE_RATE.stars;
