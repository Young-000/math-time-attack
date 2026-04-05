/**
 * 광고 그룹 ID 상수
 * 전면/보상형/배너 광고 ID를 중앙 관리
 */

const IS_PRODUCTION = import.meta.env.PROD;

/** 보상형 광고 (하트 충전 등) */
export const REWARDED_AD_GROUP_ID = IS_PRODUCTION
  ? 'ait.v2.live.92b5c5f7d8644dc2'
  : 'ait-ad-test-rewarded-id';

/** 전면 광고 (게임 종료 후) */
export const INTERSTITIAL_AD_GROUP_ID = IS_PRODUCTION
  ? 'ait.v2.live.c3e1be11131c45f6'
  : 'ait-ad-test-interstitial-id';

/** 배너 광고 — 문구형 */
export const BANNER_TEXT_AD_GROUP_ID = IS_PRODUCTION
  ? 'ait.v2.live.6b9705f4eda1432a'
  : 'ait-ad-test-banner-id';

/** 배너 광고 — 이미지형 */
export const BANNER_IMAGE_AD_GROUP_ID = IS_PRODUCTION
  ? 'ait.v2.live.1a459115e37440a2'
  : 'ait-ad-test-native-image-id';
