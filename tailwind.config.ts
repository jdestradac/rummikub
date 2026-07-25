import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        felt: { DEFAULT: 'var(--color-felt)', light: 'var(--color-felt-light)' },
        app: { bg: 'var(--color-app-bg)', surface: 'var(--color-app-surface)', border: 'var(--color-app-border)' },
        tile: {
          red: 'var(--color-tile-red)',
          blue: 'var(--color-tile-blue)',
          black: 'var(--color-tile-black)',
          orange: 'var(--color-tile-orange)',
          joker: 'var(--color-tile-joker)',
          bg: 'var(--color-tile-bg)',
        },
      },
      boxShadow: {
        tile: '0 2px 0 #00000040, 0 4px 8px #00000030, inset 0 1px 0 #ffffff60',
        'tile-selected': '0 0 0 2px var(--color-tile-joker), 0 0 12px var(--color-tile-joker)',
        'tile-dragging': '0 8px 24px #00000060, 0 2px 0 #00000040',
      },
      keyframes: {
        'pulse-border': {
          '0%, 100%': { boxShadow: '0 0 0 2px var(--color-tile-joker), 0 0 12px var(--color-tile-joker)' },
          '50%': { boxShadow: '0 0 0 3px var(--color-tile-joker), 0 0 20px var(--color-tile-joker)' },
        },
        'slide-up': {
          from: { transform: 'translateY(8px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
      },
      animation: {
        'pulse-border': 'pulse-border 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.2s ease-out',
        shake: 'shake 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
};

export default config;
