/**
 * 유틸리티 함수
 */

/**
 * 밀리초를 "초.밀리초" 형식으로 포맷
 */
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const milliseconds = Math.floor((ms % 1000) / 10);
  return `${seconds}.${milliseconds.toString().padStart(2, '0')}초`;
}
