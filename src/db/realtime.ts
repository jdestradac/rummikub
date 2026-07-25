import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { RealtimeGameEvent } from '@/core/types';

/**
 * Broadcasts a game event to every client subscribed to `game:{roomId}`.
 * supabase-js sends broadcasts over plain HTTP when the channel hasn't been
 * `.subscribe()`d to a websocket, which is exactly what a serverless API
 * route needs (no persistent connection required).
 */
export async function broadcastGameEvent(
  supabase: SupabaseClient<Database>,
  roomId: string,
  event: RealtimeGameEvent,
): Promise<void> {
  const channel = supabase.channel(`game:${roomId}`);
  await channel.send({
    type: 'broadcast',
    event: event.event,
    payload: event.payload,
  });
}
