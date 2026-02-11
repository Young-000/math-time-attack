/**
 * 공유 리워드 (친구 초대) Hook
 * Apps-in-Toss contactsViral API 사용
 * @see https://developers-apps-in-toss.toss.im/reward/intro.md
 * @see https://github.com/toss/apps-in-toss-examples/tree/main/with-contacts-viral
 */

import { useCallback, useRef } from 'react';
import { contactsViral, getOperationalEnvironment } from '@apps-in-toss/web-framework';

// 공유 리워드 모듈 ID - 앱인토스 콘솔에서 발급
const CONTACTS_VIRAL_MODULE_ID = '1705958b-7588-42ff-9e1c-a2afa5d3fdfc';

interface ContactsViralCallbacks {
  onRewarded: (amount: number) => void;
  onClose?: () => void;
  onError?: (error: Error) => void;
}

interface UseContactsViralReturn {
  isConfigured: boolean;
  openContactsViral: (callbacks: ContactsViralCallbacks) => void;
}

export function useContactsViral(): UseContactsViralReturn {
  const cleanupRef = useRef<(() => void) | undefined>();
  const isSandbox = getOperationalEnvironment() === 'sandbox';

  // 모듈 ID가 설정되어 있는지 확인
  const isConfigured = CONTACTS_VIRAL_MODULE_ID.trim().length > 0;

  const openContactsViral = useCallback(({ onRewarded, onClose, onError }: ContactsViralCallbacks) => {
    if (!isConfigured) {
      console.warn('공유 리워드 모듈 ID가 설정되지 않았습니다.');
      onError?.(new Error('공유 리워드 모듈 ID가 설정되지 않았습니다.'));
      return;
    }

    try {
      const cleanup = contactsViral({
        options: { moduleId: CONTACTS_VIRAL_MODULE_ID.trim() },
        onEvent: (event) => {
          switch (event.type) {
            case 'sendViral': {
              // 공유 완료 - 리워드 지급
              // 샌드박스 환경에서는 수량을 1로 고정 (테스트 용도)
              const rewardAmount = isSandbox ? 1 : event.data.rewardAmount;
              console.log('공유 리워드 지급:', rewardAmount, event.data.rewardUnit);
              onRewarded(rewardAmount);
              break;
            }
            case 'close':
              // 모듈 종료
              console.log('공유 모듈 종료:', event.data.closeReason);
              console.log('공유 완료한 친구 수:', event.data.sentRewardsCount);
              onClose?.();
              // cleanup 호출
              cleanup();
              cleanupRef.current = undefined;
              break;
          }
        },
        onError: (error) => {
          console.error('공유 리워드 에러:', error);
          onError?.(error instanceof Error ? error : new Error(String(error)));
          // 에러 시에도 cleanup 호출 (레퍼런스 패턴)
          cleanup?.();
          cleanupRef.current = undefined;
        },
      });

      cleanupRef.current = cleanup;
    } catch (error) {
      console.error('공유 리워드 실행 중 오류:', error);
      onError?.(error instanceof Error ? error : new Error('공유 리워드 실행 실패'));
    }
  }, [isConfigured, isSandbox]);

  return {
    isConfigured,
    openContactsViral,
  };
}
