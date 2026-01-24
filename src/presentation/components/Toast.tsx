/**
 * Toast 알림 컴포넌트
 */

import { useEffect, useRef } from 'react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export function Toast({ message, isVisible, onClose, duration = 2000 }: ToastProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isVisible) {
      // 이전 타이머 클리어
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // duration 후 닫기
      timerRef.current = setTimeout(() => {
        onClose();
      }, duration);

      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
      };
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className="toast toast-enter"
      role="alert"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
