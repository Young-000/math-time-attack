/**
 * Record Service
 * 최고 기록 저장/조회 (localStorage 기반)
 */

import type { DifficultyType, BestRecord } from '@domain/entities';

export const STORAGE_KEY = 'math-time-attack-records';

interface StoredRecords {
  [key: string]: {
    time: number;
    achievedAt: string;
  };
}

/**
 * localStorage에서 전체 기록 조회
 */
function getStoredRecords(): StoredRecords {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * localStorage에 기록 저장
 */
function setStoredRecords(records: StoredRecords): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

/**
 * 특정 난이도의 최고 기록 조회
 */
export function getBestRecord(difficulty: DifficultyType): BestRecord | null {
  const records = getStoredRecords();
  const record = records[difficulty];

  if (!record) return null;

  return {
    difficulty,
    time: record.time,
    achievedAt: record.achievedAt,
  };
}

/**
 * 최고 기록 저장 (기존 기록보다 좋을 때만)
 */
export function saveBestRecord(difficulty: DifficultyType, time: number): boolean {
  const existing = getBestRecord(difficulty);

  // 기존 기록이 있고, 새 기록이 더 느리면 저장하지 않음
  if (existing && time >= existing.time) {
    return false;
  }

  const records = getStoredRecords();
  records[difficulty] = {
    time,
    achievedAt: new Date().toISOString(),
  };
  setStoredRecords(records);

  return true;
}

/**
 * 신기록 여부 확인
 */
export function isNewRecord(difficulty: DifficultyType, time: number): boolean {
  const existing = getBestRecord(difficulty);

  if (!existing) return true;

  return time < existing.time;
}

/**
 * 모든 기록 삭제
 */
export function clearAllRecords(): void {
  localStorage.removeItem(STORAGE_KEY);
}
