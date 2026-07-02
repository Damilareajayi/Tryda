/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050D1A',
          900: '#0A1628',
          800: '#0F1F38',
          700: '#162847',
        },
        surface: {
          DEFAULT: '#111827',
          hover: '#1A2333',
          border: '#1F2D40',
        },
        teal: {
          DEFAULT: '#00D4B4',
          dim: '#00B89B',
          glow: 'rgba(0,212,180,0.15)',
        },
        status: {
          healthy: '#10B981',
          warning: '#F59E0B',
          critical: '#EF4444',
          info: '#3B82F6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 8s linear infinite',
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      boxShadow: {
        'teal-glow': '0 0 20px rgba(0,212,180,0.2)',
        'card': '0 1px 3px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
};
