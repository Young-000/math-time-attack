/**
 * 프로모션 상수
 * 콘솔에서 생성한 프로모션 코드 및 금액 관리
 */

/** 웰컴 프로모션 — 첫 게임 완료 시 자동 지급 */
const WELCOME_PROD_CODE = '01KMATK7D77QHW1PKD9B8DCZK2';
export const WELCOME_PROMO_CODE = import.meta.env.DEV ? `TEST_${WELCOME_PROD_CODE}` : WELCOME_PROD_CODE;
export const WELCOME_PROMO_AMOUNT = 500;
