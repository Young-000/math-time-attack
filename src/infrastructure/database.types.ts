/**
 * Supabase Database Types
 * 자동 생성된 타입 또는 수동 정의 타입
 * 스키마: math_attack
 */

export interface Database {
  math_attack: {
    Tables: {
      game_records: {
        Row: {
          id: string;
          odl_id: string;
          difficulty: 'easy' | 'medium' | 'hard';
          operation: 'addition' | 'multiplication' | 'mixed';
          time: number;
          nickname: string | null;
          played_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          odl_id: string;
          difficulty: 'easy' | 'medium' | 'hard';
          operation: 'addition' | 'multiplication' | 'mixed';
          time: number;
          nickname?: string | null;
          played_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          odl_id?: string;
          difficulty?: 'easy' | 'medium' | 'hard';
          operation?: 'addition' | 'multiplication' | 'mixed';
          time?: number;
          nickname?: string | null;
          played_at?: string;
          created_at?: string;
        };
      };
      user_profiles: {
        Row: {
          id: string;
          odl_id: string;
          nickname: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          odl_id: string;
          nickname: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          odl_id?: string;
          nickname?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      get_my_rank_info: {
        Args: {
          p_odl_id: string;
          p_difficulty: string;
          p_operation: string;
        };
        Returns: {
          my_rank: number | null;
          my_percentile: number | null;
          total_players: number;
        }[];
      };
      get_total_unique_players: {
        Args: {
          p_difficulty: string;
          p_operation: string;
        };
        Returns: number;
      };
      get_top_rankings: {
        Args: {
          p_difficulty: string;
          p_operation: string;
          p_limit: number;
        };
        Returns: {
          rank: number;
          odl_id: string;
          nickname: string | null;
          best_time: number;
          played_at: string;
        }[];
      };
    };
  };
  public: {
    Tables: Record<string, never>;
    Functions: {
      get_my_rank_info: {
        Args: {
          p_odl_id: string;
          p_difficulty: string;
          p_operation: string;
        };
        Returns: {
          my_rank: number | null;
          my_percentile: number | null;
          total_players: number;
          my_best_time: number | null;
        }[];
      };
      get_total_unique_players: {
        Args: {
          p_difficulty: string;
          p_operation: string;
        };
        Returns: number;
      };
      get_top_rankings: {
        Args: {
          p_difficulty: string;
          p_operation: string;
          p_limit?: number;
        };
        Returns: {
          rank: number;
          odl_id: string;
          nickname: string | null;
          best_time: number;
          played_at: string;
        }[];
      };
    };
  };
}
