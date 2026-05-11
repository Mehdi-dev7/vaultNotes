/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Cascadia Code', 'monospace'],
      },
      colors: {
        vault: {
          bg:           '#0a0b0d',
          surface:      '#0f1117',
          border:       '#1a1f2e',
          muted:        '#141820',
          // Accent orange — identité visuelle VaultNotes
          accent:       '#e8820c',
          'accent-dim': '#c06b08',
          'accent-glow':'#e8820c22',
          danger:       '#ff4757',
          warning:      '#ffa502',
          success:      '#4ade80',
          text:         '#c8d0e0',
          'text-dim':   '#5a6480',
          'text-bright':'#e8edf5',
        }
      },
      animation: {
        'cursor-blink': 'blink 1s step-end infinite',
        'fade-in':      'fadeIn 0.2s ease-out',
        'slide-in':     'slideIn 0.15s ease-out',
        'glow-pulse':   'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-8px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 0px #e8820c00' },
          '50%':      { boxShadow: '0 0 12px #e8820c44' },
        }
      }
    },
  },
  plugins: [],
}
