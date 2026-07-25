// Hand-written types mirroring supabase/migrations/001_initial_schema.sql.
// Regenerate with `supabase gen types typescript` once the project is linked
// if the schema drifts.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string;
          code: string;
          host_id: string;
          status: 'waiting' | 'playing' | 'finished';
          max_players: number;
          bot_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          host_id: string;
          status?: 'waiting' | 'playing' | 'finished';
          max_players?: number;
          bot_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['rooms']['Insert']>;
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          room_id: string;
          user_id: string | null;
          name: string;
          is_bot: boolean;
          seat: number;
          tile_count: number;
          has_opened: boolean;
          score: number;
          is_connected: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          room_id: string;
          user_id?: string | null;
          name: string;
          is_bot?: boolean;
          seat: number;
          tile_count?: number;
          has_opened?: boolean;
          score?: number;
          is_connected?: boolean;
          joined_at?: string;
        };
        Update: Partial<Database['public']['Tables']['players']['Insert']>;
        Relationships: [];
      };
      game_states: {
        Row: {
          room_id: string;
          current_turn: number;
          board: Json;
          draw_pile: Json;
          racks: Json;
          turn_snapshot: Json | null;
          phase: 'playing' | 'finished';
          winner_id: string | null;
          updated_at: string;
        };
        Insert: {
          room_id: string;
          current_turn?: number;
          board?: Json;
          draw_pile?: Json;
          racks?: Json;
          turn_snapshot?: Json | null;
          phase?: 'playing' | 'finished';
          winner_id?: string | null;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['game_states']['Insert']>;
        Relationships: [];
      };
      game_events: {
        Row: {
          id: number;
          room_id: string;
          player_id: string | null;
          event_type: string;
          payload: Json | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          room_id: string;
          player_id?: string | null;
          event_type: string;
          payload?: Json | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['game_events']['Insert']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_my_game_state: {
        Args: { p_room_id: string };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
  };
}
