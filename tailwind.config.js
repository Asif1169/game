/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Spec design tokens
        base: {
          bg: '#0a0a14',
          blue: '#0052FF',
          accent: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        pulseBtn: {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(0,82,255,0.6)' },
          '50%': { transform: 'scale(1.03)', boxShadow: '0 0 0 10px rgba(0,82,255,0)' },
        },
      },
      animation: {
        'pulse-btn': 'pulseBtn 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
