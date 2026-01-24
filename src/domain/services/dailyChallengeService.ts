/**
 * Daily Challenge Service
 * 일일 챌린지 기능을 위한 서비스
 */

import type { DifficultyType } from '@domain/entities';

const DAILY_CHALLENGE_STORAGE_KEY = 'daily-challenge';

export interface DailyChallengeCompletion {
  date: string; // YYYY-MM-DD
  difficulty: DifficultyType;
  time: number;
  completedAt: string;
}

/**
 * 오늘 날짜를 YYYYMMDD 형식으로 반환 (UTC 기준)
 */
export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 날짜 문자열을 표시용 포맷으로 변환
 */
export function formatDateForDisplay(dateString: string): string {
  const year = dateString.slice(0, 4);
  const month = dateString.slice(4, 6);
  const day = dateString.slice(6, 8);
  return `${year}.${month}.${day}`;
}

/**
 * 날짜 기반 시드 생성
 * YYYYMMDD 형식의 날짜를 숫자로 변환
 */
export function generateDailySeed(dateString?: string): number {
  const date = dateString || getTodayDateString();
  return parseInt(date, 10);
}

/**
 * Mulberry32 시드 기반 랜덤 생성기
 * 같은 시드로 항상 같은 시퀀스 생성
 */
export function createSeededRandom(seed: number): () => number {
  let state = seed;

  return (): number => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 시드 기반 범위 내 랜덤 정수 생성
 */
export function seededRandomInt(
  random: () => number,
  min: number,
  max: number
): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

/**
 * 일일 챌린지 완료 여부 확인
 */
export function isDailyChallengeCompleted(dateString?: string): boolean {
  const date = dateString || getTodayDateString();
  try {
    const stored = localStorage.getItem(`${DAILY_CHALLENGE_STORAGE_KEY}-${date}`);
    return stored !== null;
  } catch {
    return false;
  }
}

/**
 * 일일 챌린지 완료 기록 조회
 */
export function getDailyChallengeCompletion(
  dateString?: string
): DailyChallengeCompletion | null {
  const date = dateString || getTodayDateString();
  try {
    const stored = localStorage.getItem(`${DAILY_CHALLENGE_STORAGE_KEY}-${date}`);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * 일일 챌린지 완료 기록 저장
 */
export function saveDailyChallengeCompletion(
  difficulty: DifficultyType,
  time: number,
  dateString?: string
): void {
  const date = dateString || getTodayDateString();
  const completion: DailyChallengeCompletion = {
    date,
    difficulty,
    time,
    completedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(
      `${DAILY_CHALLENGE_STORAGE_KEY}-${date}`,
      JSON.stringify(completion)
    );
  } catch {
    console.warn('Failed to save daily challenge completion');
  }
}

/**
 * 다음 일일 챌린지까지 남은 시간 (밀리초)
 */
export function getTimeUntilNextChallenge(): number {
  const now = new Date();
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0, 0, 0, 0
  ));
  return tomorrow.getTime() - now.getTime();
}

/**
 * 남은 시간을 HH:MM:SS 형식으로 변환
 */
export function formatTimeRemaining(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * 일일 챌린지 난이도 (매일 다르게)
 */
export function getDailyChallengeDifficulty(): DifficultyType {
  const seed = generateDailySeed();
  const random = createSeededRandom(seed);
  const difficulties: DifficultyType[] = ['easy', 'medium', 'hard'];
  const index = Math.floor(random() * difficulties.length);
  return difficulties[index];
}
