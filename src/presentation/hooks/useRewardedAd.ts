/**
 * 보상형 광고 Hook (v1 → v2 마이그레이션 래퍼)
 *
 * 기존 useRewardedAd 를 사용하는 코드의 하위 호환을 위해
 * useFullScreenAd를 그대로 re-export 합니다.
 *
 * @deprecated useFullScreenAd를 직접 사용하세요.
 */

export { useFullScreenAd as useRewardedAd } from './useFullScreenAd';
