import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

export type PlayerRow = Database['public']['Tables']['players']['Row'];
type Client = SupabaseClient<Database>;

export const BOT_NAMES = ['Bot Alpha', 'Bot Beta', 'Bot Gamma'];

export async function getPlayersByRoom(supabase: Client, roomId: string): Promise<PlayerRow[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .order('seat', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getPlayerById(supabase: Client, playerId: string): Promise<PlayerRow | null> {
  const { data, error } = await supabase.from('players').select('*').eq('id', playerId).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function getPlayerByUser(
  supabase: Client,
  roomId: string,
  userId: string,
): Promise<PlayerRow | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

async function nextAvailableSeat(supabase: Client, roomId: string): Promise<number> {
  const players = await getPlayersByRoom(supabase, roomId);
  const takenSeats = new Set(players.map((p) => p.seat));
  for (let seat = 0; seat < 4; seat++) {
    if (!takenSeats.has(seat)) return seat;
  }
  throw new Error('Room is full.');
}

export async function addHumanPlayer(
  supabase: Client,
  params: { roomId: string; userId: string; name: string },
): Promise<PlayerRow> {
  const seat = await nextAvailableSeat(supabase, params.roomId);
  const { data, error } = await supabase
    .from('players')
    .insert({
      room_id: params.roomId,
      user_id: params.userId,
      name: params.name,
      is_bot: false,
      seat,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function addBotPlayer(supabase: Client, roomId: string, name: string): Promise<PlayerRow> {
  const seat = await nextAvailableSeat(supabase, roomId);
  const { data, error } = await supabase
    .from('players')
    .insert({
      room_id: roomId,
      user_id: null,
      name,
      is_bot: true,
      seat,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function removePlayer(supabase: Client, playerId: string): Promise<void> {
  const { error } = await supabase.from('players').delete().eq('id', playerId);
  if (error) throw error;
}

export async function setPlayerConnection(
  supabase: Client,
  playerId: string,
  isConnected: boolean,
): Promise<void> {
  const { error } = await supabase.from('players').update({ is_connected: isConnected }).eq('id', playerId);
  if (error) throw error;
}
