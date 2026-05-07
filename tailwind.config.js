/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // ── Brand accent colours ────────────────────────────────
        // "ember" = the warm amber/orange accent used throughout the UI
        // (streaks, highlights, warnings, energetic CTAs)
        ember: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',  // ember-600 — primary warm accent
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // violet — co-primary with indigo (hero gradients, active states)
        violet: {
          50:  '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',  // violet-600 — gradient mid / active accent
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
        },
        // Extended emerald for success states
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
      borderRadius: {
        'none': '0',
        'sm': '0.125rem',      // 2px
        DEFAULT: '0.25rem',     // 4px
        'md': '0.375rem',       // 6px
        'lg': '0.5rem',         // 8px
        'xl': '0.75rem',        // 12px — standard button radius
        '2xl': '1rem',          // 16px — standard card radius
        'full': '9999px',
      },
      animation: {
        'fade-up':    'fadeUp 0.7s cubic-bezier(.16,1,.3,1) both',
        'fade-in':    'fadeIn 0.6s ease both',
        'float-a':    'floatA 6s ease-in-out infinite',
        'float-b':    'floatB 8s ease-in-out infinite',
        'pulse-ring': 'pulseRing 2.5s ease-out infinite',
        'auth-in':    'authIn 0.25s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-up':   'slideUp 0.3s cubic-bezier(.16,1,.3,1) both',
        'scale-in':   'scaleIn 0.2s cubic-bezier(.16,1,.3,1) both',
        'shimmer':    'shimmer 1.6s linear infinite',
        'bounce-once':'bounceOnce 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'toast-in':   'toastIn 0.25s cubic-bezier(.16,1,.3,1) both',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(28px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        floatA: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%':      { transform: 'translateY(-12px) rotate(2deg)' },
        },
        floatB: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%':      { transform: 'translateY(-8px) rotate(-1.5deg)' },
        },
        pulseRing: {
          '0%':   { boxShadow: '0 0 0 0 rgba(99,102,241,0.4)' },
          '70%':  { boxShadow: '0 0 0 16px rgba(99,102,241,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(99,102,241,0)' },
        },
        authIn: {
          from: { opacity: '0', transform: 'scale(0.97) translateY(8px)' },
          to:   { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceOnce: {
          '0%, 100%': { transform: 'scale(1)' },
          '40%':      { transform: 'scale(1.15)' },
          '60%':      { transform: 'scale(0.95)' },
        },
        toastIn: {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.97)' },
          to:   { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

