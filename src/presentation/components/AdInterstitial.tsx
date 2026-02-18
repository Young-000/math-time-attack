/**
 * AdInterstitial 컴포넌트 (레거시)
 *
 * 앱인토스 v2 전면 광고는 useInterstitialAd 훅으로 이동했습니다.
 * 이 파일은 기존 import 호환을 위해 incrementGameCount만 re-export합니다.
 *
 * @deprecated useInterstitialAd 훅을 사용하세요.
 */

export { incrementGameCount } from '@domain/services/adFrequencyService';

/**
 * 레거시 AdInterstitial 컴포넌트 (noop)
 * @deprecated useInterstitialAd 훅을 사용하세요.
 */
export function AdInterstitial({ onClose }: { onClose: () => void; skipDelay?: number }) {
  // 앱인토스 v2에서는 네이티브 전면 광고를 사용하므로
  // 웹 기반 전면 광고 UI가 불필요합니다.
  onClose();
  return null;
}
