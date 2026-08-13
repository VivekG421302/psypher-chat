/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A0D11',
          900: '#0C1014',
          800: '#12171D',
          700: '#1A2129',
          600: '#242D37',
          500: '#3A4552',
        },
        signal: {
          DEFAULT: '#E8A33D',
          50: '#FDF3E3',
          100: '#FBE7C7',
          300: '#F0C57D',
          500: '#E8A33D',
          600: '#C7822A',
          700: '#9C6520',
        },
        cipher: {
          DEFAULT: '#3DD9C4',
          300: '#8FEBE0',
          500: '#3DD9C4',
          600: '#22B39F',
          700: '#178C7C',
        },
        mist: {
          100: '#EDEFF2',
          300: '#C4CBD4',
          500: '#8B95A1',
          700: '#5C6672',
        },
        danger: '#E85D5D',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(232,163,61,0.15), 0 8px 30px -8px rgba(232,163,61,0.25)',
        cipherglow: '0 0 0 1px rgba(61,217,196,0.15), 0 8px 30px -8px rgba(61,217,196,0.25)',
      },
      animation: {
        'pulse-soft': 'pulseSoft 2.4s ease-in-out infinite',
        scanline: 'scanline 8s linear infinite',
        'spin-slow': 'spin 0.9s linear infinite',
        shimmer: 'shimmer 1.6s ease-in-out infinite',
        'pop-in': 'popIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
        'float-up': 'floatUp 0.35s cubic-bezier(0.16,1,0.3,1)',
        'bounce-sm': 'bounceSm 0.6s ease-in-out',
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: 0.6 },
          '50%': { opacity: 1 },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        popIn: {
          '0%': { opacity: 0, transform: 'scale(0.85)' },
          '100%': { opacity: 1, transform: 'scale(1)' },
        },
        floatUp: {
          '0%': { opacity: 0, transform: 'translateY(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        bounceSm: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-3px)' },
        },
      },
    },
  },
  plugins: [],
};
