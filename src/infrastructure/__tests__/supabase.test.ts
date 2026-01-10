/**
 * Supabase Client 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// 모듈 모킹은 테스트 파일 상단에서 수행
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(),
    auth: {},
  })),
}));

describe('Supabase Client', () => {
  const originalEnv = import.meta.env;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    // 환경 복원
    vi.unstubAllEnvs();
  });

  describe('isSupabaseConfigured', () => {
    it('should return false when VITE_SUPABASE_URL is not set', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-key');

      const { isSupabaseConfigured } = await import('../supabase');
      expect(isSupabaseConfigured()).toBe(false);
    });

    it('should return false when VITE_SUPABASE_ANON_KEY is not set', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const { isSupabaseConfigured } = await import('../supabase');
      expect(isSupabaseConfigured()).toBe(false);
    });

    it('should return false when both are not set', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const { isSupabaseConfigured } = await import('../supabase');
      expect(isSupabaseConfigured()).toBe(false);
    });

    it('should return true when both are set', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

      const { isSupabaseConfigured } = await import('../supabase');
      expect(isSupabaseConfigured()).toBe(true);
    });
  });

  describe('getSupabaseClient', () => {
    it('should return null when credentials are not configured', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', '');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const { getSupabaseClient } = await import('../supabase');
      const client = getSupabaseClient();

      expect(client).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Supabase credentials not configured. Using localStorage fallback.'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should return SupabaseClient when credentials are configured', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

      const { getSupabaseClient } = await import('../supabase');
      const client = getSupabaseClient();

      expect(client).not.toBeNull();
      expect(client).toHaveProperty('from');
    });

    it('should return same instance on subsequent calls (singleton)', async () => {
      vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co');
      vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

      const { getSupabaseClient } = await import('../supabase');
      const client1 = getSupabaseClient();
      const client2 = getSupabaseClient();

      expect(client1).toBe(client2);
    });
  });

  describe('Database types', () => {
    it('should export Database interface', async () => {
      const module = await import('../supabase');
      // TypeScript 컴파일러가 타입을 확인하므로 런타임에서는 존재 여부만 확인
      expect(module).toBeDefined();
    });
  });
});
