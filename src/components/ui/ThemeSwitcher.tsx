'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useThemeStore } from '@/store/themeStore';
import { THEMES } from '@/lib/themes';
import { cn } from '@/lib/cn';

interface ThemeSwitcherProps {
  className?: string;
}

export function ThemeSwitcher({ className }: ThemeSwitcherProps) {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [open, setOpen] = useState(false);

  const current = THEMES.find((t) => t.id === theme) ?? THEMES[0]!;

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-app-border bg-app-surface px-3 py-1.5 text-sm text-slate-200 transition-colors hover:bg-slate-700"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span aria-hidden>{current.emoji}</span>
        <span className="hidden sm:inline">{current.name}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              transition={{ duration: 0.14 }}
              className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-xl border border-app-border bg-app-surface shadow-2xl"
            >
              {THEMES.map((t) => (
                <li key={t.id}>
                  <button
                    role="option"
                    aria-selected={t.id === theme}
                    onClick={() => {
                      setTheme(t.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/5',
                      t.id === theme ? 'bg-white/5 text-amber-300' : 'text-slate-200',
                    )}
                  >
                    <span className="text-lg" aria-hidden>
                      {t.emoji}
                    </span>
                    <span className="flex-1">
                      <span className="block font-medium">{t.name}</span>
                      <span className="block text-xs text-slate-400">{t.description}</span>
                    </span>
                    {t.id === theme && <span aria-hidden>✓</span>}
                  </button>
                </li>
              ))}
            </motion.ul>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
