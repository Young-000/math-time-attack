/**
 * AdBanner 컴포넌트
 * 앱인토스 환경에서는 TossAds 또는 빈 플레이스홀더
 * (앱인토스에서는 웹 기반 AdSense 사용 불가)
 */

interface AdBannerProps {
  className?: string;
}

/**
 * 앱인토스 환경에서는 배너 광고를 직접 표시할 수 없으므로
 * 플레이스홀더로 유지합니다.
 */
export function AdBanner({ className = '' }: AdBannerProps) {
  // 앱인토스 미니앱에서는 웹 배너 광고 미지원
  // 전면/보상형 광고만 사용 가능
  if (!className) return null;
  return null;
}
