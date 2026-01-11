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
  isOnlineMode,
  saveGameRecordToServer,
  getRankings,
  getMyRank,
  saveRecord,
} from '../recordService';

// Supabase 모듈 모킹
vi.mock('@infrastructure/supabase', () => ({
  getSupabaseClient: vi.fn(() => null),
  isSupabaseConfigured: vi.fn(() => false),
}));

/**
 * Helper: Supabase mock에 schema() 체인 지원 추가
 * SUPABASE_RULES.md에 따라 math_attack 스키마 사용
 */
function createSupabaseMock(fromMock: ReturnType<typeof vi.fn>) {
  return {
    schema: vi.fn(() => ({ from: fromMock })),
    from: fromMock, // 하위 호환성
  };
}

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

    it('should return null for different operations when only one is saved', () => {
      expect(getBestRecord('easy', 'multiplication')).toBeNull();
      expect(getBestRecord('easy', 'addition')).toBeNull();
      expect(getBestRecord('easy', 'mixed')).toBeNull();
    });

    it('should return stored record with default operation (multiplication)', () => {
      const record = {
        'easy_multiplication': { time: 5000, achievedAt: '2026-01-08T00:00:00.000Z', operation: 'multiplication' },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));

      const result = getBestRecord('easy');
      expect(result).not.toBeNull();
      expect(result!.time).toBe(5000);
      expect(result!.operation).toBe('multiplication');
    });

    it('should return stored record for specific operation', () => {
      const record = {
        'easy_addition': { time: 3000, achievedAt: '2026-01-08T00:00:00.000Z', operation: 'addition' },
        'easy_multiplication': { time: 5000, achievedAt: '2026-01-08T00:00:00.000Z', operation: 'multiplication' },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));

      const additionResult = getBestRecord('easy', 'addition');
      expect(additionResult).not.toBeNull();
      expect(additionResult!.time).toBe(3000);
      expect(additionResult!.operation).toBe('addition');

      const multiplicationResult = getBestRecord('easy', 'multiplication');
      expect(multiplicationResult).not.toBeNull();
      expect(multiplicationResult!.time).toBe(5000);
    });

    it('should return null for other difficulties when only one is saved', () => {
      const record = {
        'easy_multiplication': { time: 5000, achievedAt: '2026-01-08T00:00:00.000Z', operation: 'multiplication' },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(record));

      expect(getBestRecord('medium')).toBeNull();
      expect(getBestRecord('hard')).toBeNull();
    });
  });

  describe('saveBestRecord', () => {
    it('should save new record with default operation', () => {
      saveBestRecord('easy', 4500);

      const result = getBestRecord('easy');
      expect(result).not.toBeNull();
      expect(result!.time).toBe(4500);
      expect(result!.operation).toBe('multiplication');
      expect(result!.achievedAt).toBeDefined();
    });

    it('should save new record with specific operation', () => {
      saveBestRecord('easy', 4500, 'addition');

      const result = getBestRecord('easy', 'addition');
      expect(result).not.toBeNull();
      expect(result!.time).toBe(4500);
      expect(result!.operation).toBe('addition');
    });

    it('should save records for different difficulties and operations independently', () => {
      saveBestRecord('easy', 3000, 'multiplication');
      saveBestRecord('easy', 2500, 'addition');
      saveBestRecord('medium', 8000, 'multiplication');
      saveBestRecord('hard', 15000, 'mixed');

      expect(getBestRecord('easy', 'multiplication')!.time).toBe(3000);
      expect(getBestRecord('easy', 'addition')!.time).toBe(2500);
      expect(getBestRecord('medium', 'multiplication')!.time).toBe(8000);
      expect(getBestRecord('hard', 'mixed')!.time).toBe(15000);
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

    it('should return true when saving new record', () => {
      const result = saveBestRecord('easy', 5000);
      expect(result).toBe(true);
    });

    it('should return true when saving better record', () => {
      saveBestRecord('easy', 5000);
      const result = saveBestRecord('easy', 3000);
      expect(result).toBe(true);
    });

    it('should return false when record is not better', () => {
      saveBestRecord('easy', 3000);
      const result = saveBestRecord('easy', 5000);
      expect(result).toBe(false);
    });
  });

  describe('isNewRecord', () => {
    it('should return true when no previous record exists', () => {
      expect(isNewRecord('easy', 10000)).toBe(true);
    });

    it('should return true when no previous record exists for specific operation', () => {
      saveBestRecord('easy', 5000, 'multiplication');
      expect(isNewRecord('easy', 10000, 'addition')).toBe(true);
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

    it('should check records per operation type', () => {
      saveBestRecord('easy', 5000, 'multiplication');
      saveBestRecord('easy', 3000, 'addition');

      expect(isNewRecord('easy', 4000, 'multiplication')).toBe(true);
      expect(isNewRecord('easy', 2000, 'addition')).toBe(true);
      expect(isNewRecord('easy', 6000, 'multiplication')).toBe(false);
    });
  });

  describe('clearAllRecords', () => {
    it('should clear all records', () => {
      saveBestRecord('easy', 3000);
      saveBestRecord('medium', 8000);
      saveBestRecord('easy', 2500, 'addition');

      clearAllRecords();

      expect(getBestRecord('easy')).toBeNull();
      expect(getBestRecord('medium')).toBeNull();
      expect(getBestRecord('easy', 'addition')).toBeNull();
    });
  });

  describe('isOnlineMode', () => {
    it('should return false when Supabase is not configured', () => {
      // 환경변수가 설정되지 않은 상태에서는 false
      expect(isOnlineMode()).toBe(false);
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

describe('Supabase 연동 함수', () => {
  // Mocked functions
  let getSupabaseClient: ReturnType<typeof vi.fn>;
  let isSupabaseConfigured: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();

    // Get mocked functions
    const supabaseModule = await import('@infrastructure/supabase');
    getSupabaseClient = vi.mocked(supabaseModule.getSupabaseClient);
    isSupabaseConfigured = vi.mocked(supabaseModule.isSupabaseConfigured);
  });

  describe('saveGameRecordToServer', () => {
    it('Supabase가 설정되지 않으면 null을 반환하고 경고를 출력해야 한다', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      getSupabaseClient.mockReturnValue(null);

      const result = await saveGameRecordToServer({
        odl_id: 'test-user',
        difficulty: 'easy',
        operation: 'multiplication',
        time: 5000,
        played_at: '2026-01-08T00:00:00.000Z',
      });

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Supabase not configured, skipping server save'
      );

      consoleWarnSpy.mockRestore();
    });

    it('Supabase 저장 성공시 기록을 반환해야 한다', async () => {
      const mockRecord = {
        id: 'test-id',
        odl_id: 'test-user',
        difficulty: 'easy',
        operation: 'multiplication',
        time: 5000,
        played_at: '2026-01-08T00:00:00.000Z',
      };

      const mockFromFn = vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockRecord, error: null })),
          })),
        })),
      }));

      const mockSupabase = createSupabaseMock(mockFromFn);

      getSupabaseClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabaseClient>);

      const result = await saveGameRecordToServer({
        odl_id: 'test-user',
        difficulty: 'easy',
        operation: 'multiplication',
        time: 5000,
        played_at: '2026-01-08T00:00:00.000Z',
      });

      expect(result).toEqual(mockRecord);
    });

    it('Supabase 에러시 null을 반환하고 에러 로그를 출력해야 한다', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = { message: 'Database error' };

      const mockFromFn = vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: mockError })),
          })),
        })),
      }));

      const mockSupabase = createSupabaseMock(mockFromFn);

      getSupabaseClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabaseClient>);

      const result = await saveGameRecordToServer({
        difficulty: 'easy',
        operation: 'multiplication',
        time: 5000,
        played_at: '2026-01-08T00:00:00.000Z',
      });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to save record to server:',
        mockError
      );

      consoleErrorSpy.mockRestore();
    });

    it('Supabase 예외 발생시 null을 반환해야 한다', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockFromFn = vi.fn(() => {
        throw new Error('Network error');
      });

      const mockSupabase = createSupabaseMock(mockFromFn);

      getSupabaseClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabaseClient>);

      const result = await saveGameRecordToServer({
        difficulty: 'easy',
        operation: 'multiplication',
        time: 5000,
        played_at: '2026-01-08T00:00:00.000Z',
      });

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getRankings', () => {
    it('Supabase가 설정되지 않으면 빈 배열을 반환해야 한다', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      getSupabaseClient.mockReturnValue(null);

      const result = await getRankings('easy', 'multiplication');

      expect(result).toEqual([]);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Supabase not configured, returning empty rankings'
      );

      consoleWarnSpy.mockRestore();
    });

    it('랭킹을 성공적으로 조회해야 한다', async () => {
      const mockData = [
        { odl_id: 'user1', time: 5000, played_at: '2026-01-08T00:00:00.000Z' },
        { odl_id: 'user2', time: 6000, played_at: '2026-01-08T00:00:00.000Z' },
      ];

      const mockFromFn = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: mockData, error: null })),
              })),
            })),
          })),
        })),
      }));

      const mockSupabase = createSupabaseMock(mockFromFn);

      getSupabaseClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabaseClient>);

      const result = await getRankings('easy', 'multiplication', 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        rank: 1,
        odl_id: 'user1',
        time: 5000,
        played_at: '2026-01-08T00:00:00.000Z',
      });
      expect(result[1].rank).toBe(2);
    });

    it('Supabase 에러시 빈 배열을 반환해야 한다', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockFromFn = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve({ data: null, error: { message: 'Error' } })),
              })),
            })),
          })),
        })),
      }));

      const mockSupabase = createSupabaseMock(mockFromFn);

      getSupabaseClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabaseClient>);

      const result = await getRankings('easy', 'multiplication');

      expect(result).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('예외 발생시 빈 배열을 반환해야 한다', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockFromFn = vi.fn(() => {
        throw new Error('Network error');
      });

      const mockSupabase = createSupabaseMock(mockFromFn);

      getSupabaseClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabaseClient>);

      const result = await getRankings('hard', 'mixed');

      expect(result).toEqual([]);

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getMyRank', () => {
    it('Supabase가 설정되지 않으면 null을 반환해야 한다', async () => {
      getSupabaseClient.mockReturnValue(null);

      const result = await getMyRank('user-id', 'easy', 'multiplication');

      expect(result).toBeNull();
    });

    it('odlId가 빈 문자열이면 null을 반환해야 한다', async () => {
      const mockSupabase = createSupabaseMock(vi.fn());
      getSupabaseClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabaseClient>);

      const result = await getMyRank('', 'easy', 'multiplication');

      expect(result).toBeNull();
    });

    it('내 기록이 없으면 null을 반환해야 한다', async () => {
      const mockFromFn = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: vi.fn(() => ({
                  limit: vi.fn(() => ({
                    single: vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } })),
                  })),
                })),
              })),
            })),
          })),
        })),
      }));

      const mockSupabase = createSupabaseMock(mockFromFn);

      getSupabaseClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabaseClient>);

      const result = await getMyRank('user-id', 'easy', 'multiplication');

      expect(result).toBeNull();
    });

    it('내 랭킹을 성공적으로 조회해야 한다', async () => {
      const mockFromFn = vi.fn(() => ({
        select: vi.fn((fields: string, options?: { count?: string; head?: boolean }) => {
          if (options?.count === 'exact') {
            // count 쿼리
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  lt: vi.fn(() => Promise.resolve({ count: 2, error: null })),
                })),
              })),
            };
          }
          // 일반 조회
          return {
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn(() => Promise.resolve({ data: { time: 5000 }, error: null })),
                    })),
                  })),
                })),
              })),
            })),
          };
        }),
      }));

      const mockSupabase = createSupabaseMock(mockFromFn);

      getSupabaseClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabaseClient>);

      const result = await getMyRank('user-id', 'easy', 'multiplication');

      expect(result).toBe(3); // 2명이 앞에 있으므로 3등
    });

    it('카운트 쿼리 에러시 null을 반환해야 한다', async () => {
      const mockFromFn = vi.fn(() => ({
        select: vi.fn((fields: string, options?: { count?: string; head?: boolean }) => {
          if (options?.count === 'exact') {
            return {
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  lt: vi.fn(() => Promise.resolve({ count: null, error: { message: 'Count error' } })),
                })),
              })),
            };
          }
          return {
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => ({
                    limit: vi.fn(() => ({
                      single: vi.fn(() => Promise.resolve({ data: { time: 5000 }, error: null })),
                    })),
                  })),
                })),
              })),
            })),
          };
        }),
      }));

      const mockSupabase = createSupabaseMock(mockFromFn);

      getSupabaseClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabaseClient>);

      const result = await getMyRank('user-id', 'easy', 'multiplication');

      expect(result).toBeNull();
    });

    it('예외 발생시 null을 반환해야 한다', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockFromFn = vi.fn(() => {
        throw new Error('Network error');
      });

      const mockSupabase = createSupabaseMock(mockFromFn);

      getSupabaseClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabaseClient>);

      const result = await getMyRank('user-id', 'medium', 'addition');

      expect(result).toBeNull();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('saveRecord (통합 저장)', () => {
    it('로컬에만 저장해야 한다 (Supabase 미설정시)', async () => {
      isSupabaseConfigured.mockReturnValue(false);

      const result = await saveRecord('easy', 5000, 'multiplication');

      expect(result.isNewLocalRecord).toBe(true);
      expect(result.serverRecord).toBeNull();
      expect(getBestRecord('easy')!.time).toBe(5000);
    });

    it('로컬과 서버 모두에 저장해야 한다 (Supabase 설정시)', async () => {
      isSupabaseConfigured.mockReturnValue(true);

      const mockRecord = {
        id: 'test-id',
        odl_id: 'test-user',
        difficulty: 'easy',
        operation: 'multiplication',
        time: 4000,
        played_at: '2026-01-08T00:00:00.000Z',
      };

      const mockFromFn = vi.fn(() => ({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: mockRecord, error: null })),
          })),
        })),
      }));

      const mockSupabase = createSupabaseMock(mockFromFn);

      getSupabaseClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof getSupabaseClient>);

      const result = await saveRecord('easy', 4000, 'multiplication', 'test-user');

      expect(result.isNewLocalRecord).toBe(true);
      expect(result.serverRecord).toEqual(mockRecord);
    });

    it('로컬 기록이 더 좋으면 isNewLocalRecord가 false여야 한다', async () => {
      saveBestRecord('easy', 3000);
      isSupabaseConfigured.mockReturnValue(false);

      const result = await saveRecord('easy', 5000, 'multiplication');

      expect(result.isNewLocalRecord).toBe(false);
      expect(result.serverRecord).toBeNull();
    });
  });
});
