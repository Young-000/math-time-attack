/**
 * 배너 광고 컴포넌트
 * TossAds SDK로 DOM에 배너를 부착. 로드 실패/NoFill 시 영역 숨김.
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
        display: isAdVisible ? 'block' : 'none',
      }}
      aria-hidden={!isAdVisible}
    />
  );
}
