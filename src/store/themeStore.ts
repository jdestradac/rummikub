import { create } from 'zustand';
import type { ThemeId } from '@/lib/themes';

const STORAGE_KEY = 'rummikub:theme';

interface ThemeStoreState {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

function applyThemeToDocument(theme: ThemeId) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
}

function loadInitialTheme(): ThemeId {
  if (typeof window === 'undefined') return 'classic';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'pirate' ? 'pirate' : 'classic';
}

const initialTheme = loadInitialTheme();
applyThemeToDocument(initialTheme);

export const useThemeStore = create<ThemeStoreState>((set) => ({
  theme: initialTheme,
  setTheme: (theme) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, theme);
    applyThemeToDocument(theme);
    set({ theme });
  },
}));
