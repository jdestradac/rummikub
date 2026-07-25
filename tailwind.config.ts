import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        felt: { DEFAULT: '#1B4332', light: '#2D6A4F' },
        app: { bg: '#0F172A', surface: '#1E293B', border: '#334155' },
        tile: {
          red: '#E63946',
          blue: '#457B9D',
          black: '#1E293B',
          orange: '#F4A261',
          joker: '#F59E0B',
          bg: '#FFF8F0',
        },
      },
      boxShadow: {
        tile: '0 2px 0 #00000040, 0 4px 8px #00000030, inset 0 1px 0 #ffffff60',
        'tile-selected': '0 0 0 2px #F59E0B, 0 0 12px #F59E0B60',
        'tile-dragging': '0 8px 24px #00000060, 0 2px 0 #00000040',
      },
      keyframes: {
        'pulse-border': {
          '0%, 100%': { boxShadow: '0 0 0 2px #F59E0B80, 0 0 12px #F59E0B40' },
          '50%': { boxShadow: '0 0 0 3px #F59E0B, 0 0 20px #F59E0B80' },
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
