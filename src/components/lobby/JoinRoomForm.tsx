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
      toast.error('Enter your name and a room code.');
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
      if (!res.ok) throw new Error(data.error ?? 'Failed to join room.');

      saveSession({
        roomId: data.roomId,
        roomCode: code.trim().toUpperCase(),
        playerId: data.playerId,
        userId: data.userId,
        name: name.trim(),
      });
      router.push(`/room/${code.trim().toUpperCase()}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to join room.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-app-border bg-app-surface p-6">
      <h2 className="text-lg font-bold text-slate-100">Join a room</h2>

      <Input
        label="Your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Sam"
        maxLength={24}
        required
      />

      <Input
        label="Room code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="ABC123"
        maxLength={6}
        className="font-mono uppercase tracking-widest"
        required
      />

      <Button type="submit" variant="secondary" size="lg" loading={loading} disabled={!isReady}>
        Join room
      </Button>
    </form>
  );
}
