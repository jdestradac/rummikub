'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePlayerSession } from '@/hooks/usePlayerSession';
import { toast } from '@/store/toastStore';
import { MAX_BOTS, MAX_PLAYERS, MIN_PLAYERS } from '@/lib/constants';

export function CreateRoomForm() {
  const router = useRouter();
  const { saveSession, isReady } = usePlayerSession();
  const [name, setName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [botCount, setBotCount] = useState(1);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Primero escribe un nombre.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), maxPlayers, botCount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo crear la sala.');

      saveSession({
        roomId: data.roomId,
        roomCode: data.roomCode,
        playerId: data.playerId,
        userId: data.userId,
        name: name.trim(),
      });
      router.push(`/room/${data.roomCode}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear la sala.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-2xl border border-app-border bg-app-surface p-6 shadow-lg shadow-black/10 transition-shadow hover:shadow-xl"
    >
      <h2 className="flex items-center gap-2 text-lg font-bold text-slate-100">
        <span aria-hidden>➕</span> Crear una sala
      </h2>

      <Input
        label="Tu nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ej. Jordan"
        maxLength={24}
        required
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300" htmlFor="maxPlayers">
            Máx. de jugadores
          </label>
          <select
            id="maxPlayers"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i).map((n) => (
              <option key={n} value={n}>
                {n} jugadores
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-300" htmlFor="botCount">
            Bots
          </label>
          <select
            id="botCount"
            value={botCount}
            onChange={(e) => setBotCount(Number(e.target.value))}
            className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {Array.from({ length: Math.min(MAX_BOTS, maxPlayers - 1) + 1 }, (_, i) => i).map((n) => (
              <option key={n} value={n}>
                {n} bot{n === 1 ? '' : 's'}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button type="submit" size="lg" loading={loading} disabled={!isReady}>
        Crear sala
      </Button>
    </form>
  );
}
