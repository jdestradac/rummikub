'use client';

import { motion } from 'framer-motion';
import { Tile } from '@/components/game/Tile/Tile';
import type { Tile as TileType } from '@/core/types';

const SAMPLE_TILES: Array<{ tile: TileType; rotate: number; y: number }> = [
  { tile: { id: 'hero-1', color: 'blue', number: 11, isJoker: false }, rotate: -14, y: 6 },
  { tile: { id: 'hero-2', color: 'red', number: 12, isJoker: false }, rotate: -6, y: -2 },
  { tile: { id: 'hero-3', color: 'joker', number: null, isJoker: true }, rotate: 2, y: -8 },
  { tile: { id: 'hero-4', color: 'orange', number: 13, isJoker: false }, rotate: 8, y: -2 },
  { tile: { id: 'hero-5', color: 'black', number: 1, isJoker: false }, rotate: 15, y: 6 },
];

/** Purely decorative fan of tiles above the Rummikub wordmark on the landing page. */
export function HeroTiles() {
  return (
    <div className="mb-2 flex items-end justify-center" aria-hidden>
      {SAMPLE_TILES.map((item, index) => (
        <motion.div
          key={item.tile.id}
          initial={{ opacity: 0, y: 24, rotate: 0 }}
          animate={{ opacity: 1, y: item.y, rotate: item.rotate }}
          transition={{ delay: index * 0.05, duration: 0.35, ease: 'easeOut' }}
          style={{ marginLeft: index === 0 ? 0 : -10, zIndex: index }}
        >
          <Tile tile={item.tile} size="lg" />
        </motion.div>
      ))}
    </div>
  );
}
