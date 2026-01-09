/**
 * 유틸리티 함수
 */

/**
 * 밀리초를 "초.밀리초" 형식으로 포맷
 */
export function formatTime(ms: number): string {
  // 음수 처리
  if (ms < 0) ms = 0;

  const totalSeconds = Math.floor(ms / 1000);
  const milliseconds = Math.floor((ms % 1000) / 10);

  // 1분 이상일 때 분:초 형식
  if (totalSeconds >= 60) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(2, '0')}`;
  }

  return `${totalSeconds}.${milliseconds.toString().padStart(2, '0')}초`;
}
