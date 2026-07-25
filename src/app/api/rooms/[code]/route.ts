import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/db/server';
import { deleteRoom, getRoomByCode, updateRoomBotCount } from '@/db/queries/rooms';
import { addBotPlayer, addHumanPlayer, BOT_NAMES, getPlayersByRoom, removePlayer } from '@/db/queries/players';
import { MAX_BOTS } from '@/lib/constants';

interface RouteParams {
  params: { code: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = getSupabaseServiceRoleClient();
    const room = await getRoomByCode(supabase, params.code);
    if (!room) return NextResponse.json({ error: 'Sala no encontrada.' }, { status: 404 });

    const players = await getPlayersByRoom(supabase, room.id);

    return NextResponse.json({
      room: {
        id: room.id,
        code: room.code,
        hostId: room.host_id,
        status: room.status,
        maxPlayers: room.max_players,
        botCount: room.bot_count,
      },
      players: players.map((p) => ({
        id: p.id,
        userId: p.user_id,
        name: p.name,
        isBot: p.is_bot,
        seat: p.seat,
        tileCount: p.tile_count,
        hasOpened: p.has_opened,
        score: p.score,
        isConnected: p.is_connected,
      })),
    });
  } catch (err) {
    console.error('GET /api/rooms/[code] failed:', err);
    return NextResponse.json({ error: 'No se pudo cargar la sala.' }, { status: 500 });
  }
}

const joinSchema = z.object({ name: z.string().trim().min(1).max(24) });

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const json = await request.json();
    const parsed = joinSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Solicitud inválida.' }, { status: 400 });
    }

    const authClient = getSupabaseServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'No hay una sesión autenticada. Recarga la página e intenta de nuevo.' },
        { status: 401 },
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    const room = await getRoomByCode(supabase, params.code);
    if (!room) return NextResponse.json({ error: 'Sala no encontrada.' }, { status: 404 });
    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'Esta partida ya comenzó.' }, { status: 409 });
    }

    const players = await getPlayersByRoom(supabase, room.id);

    const existing = players.find((p) => p.user_id === user.id);
    if (existing) {
      return NextResponse.json({ roomId: room.id, playerId: existing.id, userId: user.id });
    }

    const humanCount = players.filter((p) => !p.is_bot).length;
    const botCount = players.filter((p) => p.is_bot).length;
    if (humanCount + botCount >= room.max_players) {
      return NextResponse.json({ error: 'Esta sala está llena.' }, { status: 409 });
    }

    const player = await addHumanPlayer(supabase, { roomId: room.id, userId: user.id, name: parsed.data.name });

    return NextResponse.json({ roomId: room.id, playerId: player.id, userId: user.id });
  } catch (err) {
    console.error('POST /api/rooms/[code] failed:', err);
    return NextResponse.json({ error: 'No se pudo unir a la sala.' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const authClient = getSupabaseServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

    const supabase = getSupabaseServiceRoleClient();
    const room = await getRoomByCode(supabase, params.code);
    if (!room) return NextResponse.json({ error: 'Sala no encontrada.' }, { status: 404 });
    if (room.host_id !== user.id) {
      return NextResponse.json({ error: 'Solo el anfitrión puede cerrar la sala.' }, { status: 403 });
    }

    await deleteRoom(supabase, room.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/rooms/[code] failed:', err);
    return NextResponse.json({ error: 'No se pudo cerrar la sala.' }, { status: 500 });
  }
}

const patchSchema = z.object({
  botCount: z.number().int().min(0).max(MAX_BOTS),
  hostId: z.string().min(1),
});

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const json = await request.json();
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Solicitud inválida.' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    const room = await getRoomByCode(supabase, params.code);
    if (!room) return NextResponse.json({ error: 'Sala no encontrada.' }, { status: 404 });
    if (room.status !== 'waiting') {
      return NextResponse.json({ error: 'No puedes cambiar los bots después de iniciar la partida.' }, { status: 409 });
    }

    const players = await getPlayersByRoom(supabase, room.id);
    const host = players.find((p) => p.id === parsed.data.hostId);
    if (!host || host.user_id !== room.host_id) {
      return NextResponse.json({ error: 'Solo el anfitrión puede gestionar los bots.' }, { status: 403 });
    }

    const bots = players.filter((p) => p.is_bot).sort((a, b) => a.seat - b.seat);
    const humanCount = players.length - bots.length;
    const targetCount = Math.min(parsed.data.botCount, room.max_players - humanCount);

    if (targetCount > bots.length) {
      for (let i = bots.length; i < targetCount; i++) {
        await addBotPlayer(supabase, room.id, BOT_NAMES[i] ?? `Bot ${i + 1}`);
      }
    } else if (targetCount < bots.length) {
      const toRemove = bots.slice(targetCount);
      for (const bot of toRemove) {
        await removePlayer(supabase, bot.id);
      }
    }

    await updateRoomBotCount(supabase, room.id, targetCount);

    return NextResponse.json({ success: true, botCount: targetCount });
  } catch (err) {
    console.error('PATCH /api/rooms/[code] failed:', err);
    return NextResponse.json({ error: 'No se pudieron actualizar los bots.' }, { status: 500 });
  }
}
