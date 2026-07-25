'use client';

import { useCallback, useEffect, useState } from 'react';
import { getSupabaseBrowserClient } from '@/db/client';
import { PLAYER_SESSION_STORAGE_KEY } from '@/lib/constants';

export interface PlayerSession {
  roomId: string;
  roomCode: string;
  playerId: string;
  userId: string;
  name: string;
}

interface UsePlayerSessionResult {
  session: PlayerSession | null;
  authUserId: string | null;
  isReady: boolean;
  saveSession: (session: PlayerSession) => void;
  clearSession: () => void;
}

/**
 * Ensures the browser has a Supabase anonymous auth session (creating one on
 * first visit) and manages the locally persisted "which room/player am I"
 * record so a refresh doesn't boot the player out of their game.
 */
export function usePlayerSession(): UsePlayerSessionResult {
  const [session, setSession] = useState<PlayerSession | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    ensureAnonymousAuth().then((userId) => {
      if (cancelled) return;
      setAuthUserId(userId);
      setSession(loadStoredSession());
      setIsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const saveSession = useCallback((next: PlayerSession) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PLAYER_SESSION_STORAGE_KEY, JSON.stringify(next));
    }
    setSession(next);
  }, []);

  const clearSession = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(PLAYER_SESSION_STORAGE_KEY);
    }
    setSession(null);
  }, []);

  return { session, authUserId, isReady, saveSession, clearSession };
}

async function ensureAnonymousAuth(): Promise<string | null> {
  const supabase = getSupabaseBrowserClient();

  const { data: existing } = await supabase.auth.getSession();
  if (existing.session?.user) return existing.session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error('Failed to create anonymous Supabase session:', error.message);
    return null;
  }
  return data.user?.id ?? null;
}

function loadStoredSession(): PlayerSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PLAYER_SESSION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PlayerSession) : null;
  } catch {
    return null;
  }
}
