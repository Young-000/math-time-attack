/**
 * 배너 광고 컴포넌트
 * TossAds SDK로 DOM에 배너를 부착. 로드 실패/NoFill 시 영역 숨김.
 *
 * 주의: 컨테이너는 항상 DOM에 존재해야 함 (display:none 금지).
 * SDK가 요소 크기를 측정하므로 visibility+height로 숨김 처리.
 */

import { useBannerAd } from '@presentation/hooks/useBannerAd';

type BannerAdProps = {
  className?: string;
  adGroupId?: string;
};

export function BannerAd({ className, adGroupId }: BannerAdProps): JSX.Element | null {
  const { bannerRef, isAdVisible } = useBannerAd({ adGroupId });

  return (
    <div
      ref={bannerRef}
      className={className}
      style={{
        width: '100%',
        minHeight: isAdVisible ? undefined : 0,
        overflow: 'hidden',
        transition: 'min-height 0.2s ease',
      }}
      aria-hidden={!isAdVisible}
    />
  );
}
