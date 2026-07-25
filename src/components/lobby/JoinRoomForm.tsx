'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { usePlayerSession } from '@/hooks/usePlayerSession';
import { toast } from '@/store/toastStore';

export function JoinRoomForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { saveSession, isReady } = usePlayerSession();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const prefill = searchParams.get('code');
    if (prefill) setCode(prefill.toUpperCase());
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      toast.error('Escribe tu nombre y el código de la sala.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${code.trim().toUpperCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo unir a la sala.');

      saveSession({
        roomId: data.roomId,
        roomCode: code.trim().toUpperCase(),
        playerId: data.playerId,
        userId: data.userId,
        name: name.trim(),
      });
      router.push(`/room/${code.trim().toUpperCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo unir a la sala.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-app-border bg-app-surface p-6">
      <h2 className="text-lg font-bold text-slate-100">Unirse a una sala</h2>

      <Input
        label="Tu nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ej. Sam"
        maxLength={24}
        required
      />

      <Input
        label="Código de la sala"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABC123"
        maxLength={6}
        className="font-mono uppercase tracking-widest"
        required
      />

      <Button type="submit" variant="secondary" size="lg" loading={loading} disabled={!isReady}>
        Unirse
      </Button>
    </form>
  );
}
