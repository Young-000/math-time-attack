/**
 * Share Service
 * 소셜 공유 기능을 위한 서비스
 */

import { DIFFICULTY_CONFIG } from '@domain/entities';
import type { DifficultyType, OperationType } from '@domain/entities';
import { formatTime } from '@lib/utils';

const APP_URL = 'https://math-time-attack.vercel.app';
const APP_NAME = '구구단 챌린지';

export interface ShareOptions {
  difficulty: DifficultyType;
  time: number;
  operation?: OperationType;
  rank?: number | null;
  totalPlayers?: number;
}

/**
 * 공유 텍스트 생성
 */
export function generateShareText(options: ShareOptions): string {
  const { difficulty, time, rank, totalPlayers } = options;
  const difficultyLabel = DIFFICULTY_CONFIG[difficulty].label;
  const timeStr = formatTime(time);

  let text = `${APP_NAME}에서 ${difficultyLabel}을 ${timeStr}에 클리어! 🔥`;

  if (rank && totalPlayers) {
    text += `\n🏆 ${totalPlayers}명 중 ${rank}위!`;
  }

  text += `\n\n나보다 빠르게 풀 수 있어? 도전해봐!`;
  text += `\n👉 ${APP_URL}`;

  return text;
}

/**
 * 챌린지 URL 생성
 */
export function generateChallengeUrl(difficulty?: DifficultyType): string {
  if (difficulty) {
    return `${APP_URL}?d=${difficulty}`;
  }
  return APP_URL;
}

/**
 * Web Share API 사용 가능 여부 확인
 */
export function canUseNativeShare(): boolean {
  return typeof navigator !== 'undefined' && 'share' in navigator;
}

/**
 * 클립보드에 텍스트 복사
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    textArea.style.top = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    console.error('Failed to copy to clipboard');
    return false;
  }
}

/**
 * 결과 공유하기
 * - 모바일: Web Share API 사용
 * - 데스크탑: 클립보드 복사
 */
export async function shareResult(options: ShareOptions): Promise<{
  success: boolean;
  method: 'native' | 'clipboard';
}> {
  const shareText = generateShareText(options);

  // 네이티브 공유 시도 (모바일)
  if (canUseNativeShare()) {
    try {
      await navigator.share({
        title: APP_NAME,
        text: shareText,
        url: generateChallengeUrl(options.difficulty),
      });
      return { success: true, method: 'native' };
    } catch (err) {
      // 사용자가 공유 취소한 경우
      if (err instanceof Error && err.name === 'AbortError') {
        return { success: false, method: 'native' };
      }
      // 다른 에러는 클립보드 폴백으로
    }
  }

  // 클립보드 복사 (데스크탑 또는 네이티브 공유 실패 시)
  const copied = await copyToClipboard(shareText);
  return { success: copied, method: 'clipboard' };
}
