/**
 * TDD RED Phase: 기록 서비스 테스트
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getBestRecord,
  saveBestRecord,
  isNewRecord,
  clearAllRecords,
  STORAGE_KEY,
} from '../recordService';

describe('Record Service', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('getBestRecord', () => {
    it('should return null when no record exists', () => {
      expect(getBestRecord('easy')).toBeNull();
      expect(getBestRecord('medium')).toBeNull();
      expect(getBestRecord('hard')).toBeNull();
    });

    it('should return stored record', () => {
      const record = {
        easy: { time: 5000, achievedAt: '2026-01-08T00:00:00.000Z' },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));

      const result = getBestRecord('easy');
      expect(result).not.toBeNull();
      expect(result!.time).toBe(5000);
    });

    it('should return null for other difficulties when only one is saved', () => {
      const record = {
        easy: { time: 5000, achievedAt: '2026-01-08T00:00:00.000Z' },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));

      expect(getBestRecord('medium')).toBeNull();
      expect(getBestRecord('hard')).toBeNull();
    });
  });

  describe('saveBestRecord', () => {
    it('should save new record', () => {
      saveBestRecord('easy', 4500);

      const result = getBestRecord('easy');
      expect(result).not.toBeNull();
      expect(result!.time).toBe(4500);
      expect(result!.achievedAt).toBeDefined();
    });

    it('should save records for different difficulties independently', () => {
      saveBestRecord('easy', 3000);
      saveBestRecord('medium', 8000);
      saveBestRecord('hard', 15000);

      expect(getBestRecord('easy')!.time).toBe(3000);
      expect(getBestRecord('medium')!.time).toBe(8000);
      expect(getBestRecord('hard')!.time).toBe(15000);
    });

    it('should overwrite existing record with better time', () => {
      saveBestRecord('easy', 5000);
      saveBestRecord('easy', 3000);

      expect(getBestRecord('easy')!.time).toBe(3000);
    });

    it('should NOT overwrite existing record with worse time', () => {
      saveBestRecord('easy', 3000);
      saveBestRecord('easy', 5000);

      expect(getBestRecord('easy')!.time).toBe(3000);
    });
  });

  describe('isNewRecord', () => {
    it('should return true when no previous record exists', () => {
      expect(isNewRecord('easy', 10000)).toBe(true);
    });

    it('should return true when time is better than existing record', () => {
      saveBestRecord('easy', 5000);
      expect(isNewRecord('easy', 4000)).toBe(true);
    });

    it('should return false when time is worse than existing record', () => {
      saveBestRecord('easy', 5000);
      expect(isNewRecord('easy', 6000)).toBe(false);
    });

    it('should return false when time equals existing record', () => {
      saveBestRecord('easy', 5000);
      expect(isNewRecord('easy', 5000)).toBe(false);
    });
  });

  describe('clearAllRecords', () => {
    it('should clear all records', () => {
      saveBestRecord('easy', 3000);
      saveBestRecord('medium', 8000);

      clearAllRecords();

      expect(getBestRecord('easy')).toBeNull();
      expect(getBestRecord('medium')).toBeNull();
    });
  });

  describe('에러 처리', () => {
    it('localStorage.getItem에서 에러 발생시 빈 객체를 반환해야 한다', () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('Storage error');
      });

      expect(getBestRecord('easy')).toBeNull();

      getItemSpy.mockRestore();
    });

    it('localStorage에 잘못된 JSON이 저장되어 있을 때 빈 객체를 반환해야 한다', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json');

      expect(getBestRecord('easy')).toBeNull();
    });

    it('saveBestRecord는 기존 기록이 더 좋을 때 false를 반환해야 한다', () => {
      // 먼저 좋은 기록 저장
      saveBestRecord('easy', 3000);

      // 더 나쁜 기록으로 저장 시도 - false 반환
      const result = saveBestRecord('easy', 5000);
      expect(result).toBe(false);

      // 기존 기록 유지 확인
      expect(getBestRecord('easy')!.time).toBe(3000);
    });

    it('localStorage.setItem에서 에러 발생시 경고를 출력해야 한다', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      // 원본 localStorage 백업
      const originalLocalStorage = globalThis.localStorage;

      // 에러를 던지는 모의 localStorage 생성
      const mockLocalStorage = {
        getItem: () => '{}',
        setItem: () => {
          throw new Error('QuotaExceededError');
        },
        removeItem: () => {},
        clear: () => {},
        key: () => null,
        length: 0,
      };

      // 테스트를 위해 localStorage 재정의
      Object.defineProperty(globalThis, 'localStorage', {
        value: mockLocalStorage,
        writable: true,
        configurable: true,
      });

      try {
        // 새 기록 저장 시도 (setItem에서 에러 발생)
        saveBestRecord('easy', 3000);

        // console.warn이 호출되었는지 확인
        expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to save records to localStorage');
      } finally {
        // 복원
        Object.defineProperty(globalThis, 'localStorage', {
          value: originalLocalStorage,
          writable: true,
          configurable: true,
        });
        consoleWarnSpy.mockRestore();
      }
    });
  });
});
