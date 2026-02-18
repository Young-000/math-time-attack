/**
 * Supabase Client Configuration
 * 앱인토스 환경에서 Supabase 연동
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 타입이 적용된 Supabase 클라이언트 타입
export type TypedSupabaseClient = SupabaseClient<Database, 'math_attack'>;

// Supabase 클라이언트 생성 (싱글톤)
let supabaseClient: TypedSupabaseClient | null = null;

/**
 * Supabase 클라이언트 인스턴스 가져오기
 * Database 타입이 적용되어 타입 안전성 보장
 */
export function getSupabaseClient(): TypedSupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Using localStorage fallback.');
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient<Database, 'math_attack'>(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: 'math_attack',
      },
      auth: {
        persistSession: false, // 앱인토스에서는 세션 저장 불필요
      },
    });
  }

  return supabaseClient;
}

/**
 * Supabase 연결 상태 확인
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

// Database 타입 re-export (하위 호환성)
export type { Database } from './database.types';
