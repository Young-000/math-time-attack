/**
 * Supabase Client Configuration
 * 앱인토스 환경에서 Supabase 연동
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase 설정 가져오기
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Supabase 클라이언트 생성 (싱글톤)
let supabaseClient: SupabaseClient | null = null;

/**
 * Supabase 클라이언트 인스턴스 가져오기
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not configured. Using localStorage fallback.');
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
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

/**
 * Database 타입 정의
 */
export interface Database {
  public: {
    Tables: {
      game_records: {
        Row: {
          id: string;
          odl_id: string;
          difficulty: string;
          operation: string;
          time: number;
          played_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          odl_id: string;
          difficulty: string;
          operation: string;
          time: number;
          played_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          odl_id?: string;
          difficulty?: string;
          operation?: string;
          time?: number;
          played_at?: string;
          created_at?: string;
        };
      };
    };
  };
}
