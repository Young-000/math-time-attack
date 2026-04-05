/**
 * AIT 푸시 알림 토글 컴포넌트
 *
 * 사용법: HomePage에 <NotificationToggle appId="attendance-king" /> 추가
 * 의존성: getCachedUserId() (기존 userIdentity에서 import)
 */
import { useState, useEffect, useCallback } from 'react';

const PUSH_SERVICE_URL = 'https://gtnqsbdlybrkbsgtecvy.supabase.co/functions/v1/send-push';
const STORAGE_PREFIX = 'push_sub_';

type NotificationToggleProps = {
  appId: string;
  userKey: string | null;
};

async function callPushApi(
  action: 'subscribe' | 'unsubscribe',
  appId: string,
  userKey: string,
): Promise<boolean> {
  try {
    const res = await fetch(PUSH_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, appId, userKey }),
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

export function NotificationToggle({ appId, userKey }: NotificationToggleProps): React.ReactElement | null {
  const storageKey = `${STORAGE_PREFIX}${appId}`;
  const [isOn, setIsOn] = useState(() => localStorage.getItem(storageKey) === 'true');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    localStorage.setItem(storageKey, String(isOn));
  }, [isOn, storageKey]);

  const toggle = useCallback(async (): Promise<void> => {
    if (!userKey || busy) return;
    setBusy(true);
    const action = isOn ? 'unsubscribe' : 'subscribe';
    const ok = await callPushApi(action, appId, userKey);
    if (ok) setIsOn(!isOn);
    setBusy(false);
  }, [appId, userKey, isOn, busy]);

  if (!userKey) return null;

  return (
    <button
      onClick={toggle}
      disabled={busy}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 14px',
        border: 'none',
        borderRadius: '20px',
        backgroundColor: isOn ? '#E8F3FF' : '#F4F4F4',
        color: isOn ? '#3182F6' : '#8B8B8B',
        fontSize: '13px',
        fontWeight: 500,
        cursor: busy ? 'not-allowed' : 'pointer',
        opacity: busy ? 0.6 : 1,
        transition: 'all 0.2s',
      }}
    >
      <span style={{ fontSize: '16px' }}>{isOn ? '\uD83D\uDD14' : '\uD83D\uDD15'}</span>
      {isOn ? '알림 ON' : '알림 OFF'}
    </button>
  );
}
