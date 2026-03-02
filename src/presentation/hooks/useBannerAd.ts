/**
 * 배너광고 부착/정리 훅
 * TossAds.attach로 DOM 요소에 배너를 부착하고 언마운트 시 destroy
 */

import { useEffect, useRef, useState } from 'react';
import { TossAds } from '@apps-in-toss/web-framework';
import { useTossAds } from '@presentation/providers/TossAdsProvider';
import { BANNER_AD_GROUP_ID } from '@constants/ad';

type UseBannerAdOptions = {
  adGroupId?: string;
};

type UseBannerAdReturn = {
  bannerRef: React.RefObject<HTMLDivElement>;
  isAdVisible: boolean;
};

export function useBannerAd(options?: UseBannerAdOptions): UseBannerAdReturn {
  const { adGroupId = BANNER_AD_GROUP_ID } = options ?? {};
  const { isInitialized, isSupported } = useTossAds();
  const bannerRef = useRef<HTMLDivElement>(null);
  const [isAdVisible, setIsAdVisible] = useState(false);
  const attachedRef = useRef(false);

  useEffect(() => {
    if (!isSupported || !isInitialized || !bannerRef.current || attachedRef.current) {
      return;
    }

    try {
      const attachSupported = TossAds.attach.isSupported?.() === true;
      if (!attachSupported) return;
    } catch {
      return;
    }

    attachedRef.current = true;

    try {
      TossAds.attach(adGroupId, bannerRef.current, {
        theme: 'light',
        callbacks: {
          onAdRendered: () => {
            setIsAdVisible(true);
          },
          onAdFailedToRender: (payload) => {
            console.error('배너 광고 렌더링 실패:', payload.error.message);
            setIsAdVisible(false);
          },
          onNoFill: () => {
            setIsAdVisible(false);
          },
        },
      });
    } catch (error) {
      console.error('배너 광고 부착 실패:', error);
    }

    return () => {
      attachedRef.current = false;
      try {
        TossAds.destroyAll();
      } catch {
        // cleanup 실패 무시
      }
    };
  }, [isSupported, isInitialized, adGroupId]);

  return { bannerRef, isAdVisible };
}
