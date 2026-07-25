'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/cn';

const ICONS: Record<string, string> = {
  place: '🀄',
  draw: '➕',
  invalid: '⚠️',
  win: '🏆',
  bot_play: '🤖',
  join: '👋',
  leave: '🚪',
};

export function GameLog() {
  const events = useGameStore((s) => s.events);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [events.length]);

  return (
    <div className="flex h-full flex-col rounded-xl border border-app-border bg-app-surface p-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">Game log</h3>
      <div ref={scrollRef} className="flex-1 space-y-1.5 overflow-y-auto pr-1 text-sm">
        {events.length === 0 && <p className="text-slate-500">No moves yet.</p>}
        {events.map((event) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
              'flex items-start gap-2 rounded px-2 py-1',
              event.eventType === 'invalid' && 'bg-red-500/10 text-red-300',
              event.eventType === 'win' && 'bg-amber-500/10 text-amber-300',
            )}
          >
            <span aria-hidden>{ICONS[event.eventType] ?? '•'}</span>
            <span className="text-slate-300">{event.description}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
