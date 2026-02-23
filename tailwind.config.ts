import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0a0a0f',
          800: '#111118',
          700: '#1a1a24',
          600: '#242430',
          500: '#2e2e3a',
        },
        accent: {
          DEFAULT: '#e94560',
          hover: '#ff6b81',
        },
        gold: '#f5c518',
        'amber-warm': '#D4A843',
      },
      fontFamily: {
        sans: ['var(--font-inter)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'slide-in': 'slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'scale-in': 'scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'ken-burns-zoom': 'ken-burns-zoom 8s ease-out forwards',
        'ken-burns-zoom-alt': 'ken-burns-zoom-alt 8s ease-out forwards',
        'crossfade-in': 'crossfade-in 1.2s ease-in-out forwards',
        'crossfade-out': 'crossfade-out 1.2s ease-in-out forwards',
        'progress-fill': 'progress-fill 8s linear forwards',
      },
      keyframes: {
        'slide-in': {
          from: { opacity: '0', transform: 'translateX(100%) scale(0.95)' },
          to: { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(100%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'ken-burns-zoom': {
          from: { transform: 'scale(1) translate(0, 0)' },
          to: { transform: 'scale(1.08) translate(-1%, -1%)' },
        },
        'ken-burns-zoom-alt': {
          from: { transform: 'scale(1) translate(0, 0)' },
          to: { transform: 'scale(1.08) translate(1%, -0.5%)' },
        },
        'crossfade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'crossfade-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'progress-fill': {
          from: { width: '0%' },
          to: { width: '100%' },
        },
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
