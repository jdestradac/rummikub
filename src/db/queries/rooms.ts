import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type RoomRow = Database['public']['Tables']['rooms']['Row'];
type Client = SupabaseClient<Database>;

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid ambiguity
const CODE_LENGTH = 6;
const MAX_CODE_ATTEMPTS = 10;

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export async function createRoom(
  supabase: Client,
  params: { hostId: string; maxPlayers: number; botCount: number },
): Promise<RoomRow> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        code,
        host_id: params.hostId,
        max_players: params.maxPlayers,
        bot_count: params.botCount,
        status: 'waiting',
      })
      .select('*')
      .single();

    if (!error && data) return data;

    // 23505 = unique_violation (code collision) - retry with a new code.
    if (error && (error as { code?: string }).code !== '23505') {
      throw error;
    }
    lastError = error;
  }

  throw lastError ?? new Error('Failed to generate a unique room code.');
}

export async function getRoomByCode(supabase: Client, code: string): Promise<RoomRow | null> {
  const { data, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', code.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function getRoomById(supabase: Client, id: string): Promise<RoomRow | null> {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function updateRoomStatus(
  supabase: Client,
  roomId: string,
  status: RoomRow['status'],
): Promise<void> {
  const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId);
  if (error) throw error;
}

export async function updateRoomBotCount(supabase: Client, roomId: string, botCount: number): Promise<void> {
  const { error } = await supabase.from('rooms').update({ bot_count: botCount }).eq('id', roomId);
  if (error) throw error;
}

export async function deleteRoom(supabase: Client, roomId: string): Promise<void> {
  const { error } = await supabase.from('rooms').delete().eq('id', roomId);
  if (error) throw error;
}
