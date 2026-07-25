import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/db/server', () => ({
  getSupabaseServiceRoleClient: () => ({}),
}));

const runGameActionMock = vi.fn();
vi.mock('@/app/api/game/_shared', () => ({
  runGameAction: (...args: unknown[]) => runGameActionMock(...args),
}));

const maybeTriggerBotTurnMock = vi.fn().mockResolvedValue(undefined);
vi.mock('@/app/api/game/_botRunner', () => ({
  maybeTriggerBotTurn: (...args: unknown[]) => maybeTriggerBotTurnMock(...args),
}));

import { POST } from '@/app/api/game/action/route';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/game/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/game/action', () => {
  beforeEach(() => {
    runGameActionMock.mockReset();
    maybeTriggerBotTurnMock.mockClear();
  });

  it('rejects a malformed body with 400', async () => {
    const res = await POST(makeRequest({ roomId: 'not-a-uuid', playerId: 'p1', action: { type: 'DRAW_TILE' } }));
    expect(res.status).toBe(400);
  });

  it('rejects an unknown action type with 400', async () => {
    const res = await POST(
      makeRequest({
        roomId: '11111111-1111-1111-1111-111111111111',
        playerId: '22222222-2222-2222-2222-222222222222',
        action: { type: 'NOT_A_REAL_ACTION' },
      }),
    );
    expect(res.status).toBe(400);
  });

  it('forwards a valid action to the game engine and returns its result', async () => {
    runGameActionMock.mockResolvedValue({
      ok: true,
      result: {
        success: true,
        newState: {
          roomId: '11111111-1111-1111-1111-111111111111',
          phase: 'playing',
          currentTurn: 1,
          board: [],
          drawPile: [],
          racks: { '22222222-2222-2222-2222-222222222222': [] },
          turnSnapshot: null,
          players: [],
          winnerId: null,
        },
      },
      myRack: [],
    });

    const res = await POST(
      makeRequest({
        roomId: '11111111-1111-1111-1111-111111111111',
        playerId: '22222222-2222-2222-2222-222222222222',
        action: { type: 'CONFIRM_TURN' },
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.publicState.currentTurn).toBe(1);
    expect(runGameActionMock).toHaveBeenCalledOnce();
    expect(maybeTriggerBotTurnMock).toHaveBeenCalledOnce();
  });

  it('propagates a failed outcome with its status code', async () => {
    runGameActionMock.mockResolvedValue({ ok: false, error: 'Game not found.', status: 404 });

    const res = await POST(
      makeRequest({
        roomId: '11111111-1111-1111-1111-111111111111',
        playerId: '22222222-2222-2222-2222-222222222222',
        action: { type: 'DRAW_TILE' },
      }),
    );
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error).toBe('Game not found.');
  });
});
