/**
 * TossAds SDK 초기화 Provider
 * 앱 최상단에서 1회만 초기화하고, isInitialized 상태를 하위에 전파
 */

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { TossAds } from '@apps-in-toss/web-framework';

type TossAdsContextValue = {
  isInitialized: boolean;
  isSupported: boolean;
};

const TossAdsContext = createContext<TossAdsContextValue>({
  isInitialized: false,
  isSupported: false,
});

export function useTossAds(): TossAdsContextValue {
  return useContext(TossAdsContext);
}

type TossAdsProviderProps = {
  children: ReactNode;
};

export function TossAdsProvider({ children }: TossAdsProviderProps): JSX.Element {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported] = useState(() => {
    try {
      return TossAds.initialize.isSupported?.() === true;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!isSupported) return;

    TossAds.initialize({
      callbacks: {
        onInitialized: () => {
          setIsInitialized(true);
        },
        onInitializationFailed: (error) => {
          console.error('TossAds 초기화 실패:', error);
        },
      },
    });
  }, [isSupported]);

  return (
    <TossAdsContext.Provider value={{ isInitialized, isSupported }}>
      {children}
    </TossAdsContext.Provider>
  );
}
