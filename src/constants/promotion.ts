/**
 * 프로모션 상수
 * 콘솔에서 생성한 프로모션 코드 및 금액 관리
 */

/** 웰컴 프로모션 — 첫 게임 완료 시 자동 지급 */
const WELCOME_PROD_CODE = '01KMATK7D77QHW1PKD9B8DCZK2';
export const WELCOME_PROMO_CODE = import.meta.env.DEV ? `TEST_${WELCOME_PROD_CODE}` : WELCOME_PROD_CODE;

/**
 * 웰컴 지급 토스포인트 (1P = 1원, 프로모션 예산에서 직접 차감).
 *
 * v3 하향 (2026-08-04): 500P → 10P.
 * 500P는 신규 유저 1인당 500원 지출로, 프로모션 예산 125만원을 약 2,330명 만에
 * 소진시킨 원인이었다(실소진 1,164,343원). 보상형 광고 실단가가 0.2원까지
 * 떨어진 환경에서 유저 1인당 회수에 2,500회 시청이 필요해 회수가 불가능하다.
 */
export const WELCOME_PROMO_AMOUNT = 10;
