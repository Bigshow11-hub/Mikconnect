/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        accent: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        ink: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Helvetica', 'Arial', 'sans-serif'],
      },
      // Custom spacing for icon-size nice values that Tailwind doesn't ship.
      spacing: {
        4.5: '1.125rem',
        18: '4.5rem',
      },
      animation: {
        'fade-in': 'fade-in 0.6s ease-out both',
        'slide-up': 'slide-up 0.5s ease-out both',
        'scale-in': 'scale-in 0.4s ease-out both',
        'slide-right': 'slide-right 0.3s cubic-bezier(0.22,1,0.36,1) both',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16,1,0.3,1)',
        'in-out-expo': 'cubic-bezier(0.87,0,0.13,1)',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-right': {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(0)' },
        },
      },
      boxShadow: {
        'glow': '0 0 0 1px rgb(0 0 0 / 0.04), 0 8px 32px -8px rgb(59 130 246 / 0.18)',
        'glow-dark': '0 0 0 1px rgb(255 255 255 / 0.06), 0 8px 32px -8px rgb(59 130 246 / 0.3)',
      },
    },
  },
  plugins: [],
};
