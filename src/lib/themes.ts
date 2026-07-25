export type ThemeId = 'classic' | 'pirate';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  description: string;
  emoji: string;
}

/**
 * "pirate" is an original treasure-hunt ambiance (parchment tiles, ship's
 * timber table, lantern-gold accents) — not affiliated with, and doesn't
 * reproduce any art, names, or logos from, any copyrighted pirate-themed
 * media franchise.
 */
export const THEMES: ThemeMeta[] = [
  { id: 'classic', name: 'Clásico', description: 'El tapete verde de siempre.', emoji: '🀄' },
  { id: 'pirate', name: 'Caza del Tesoro', description: 'Pergamino, madera y oro de bucanero.', emoji: '🏴‍☠️' },
];
