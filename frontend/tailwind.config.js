/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'morpho-green': '#22C55E',
        'morpho-emerald': '#10B981',
        'morpho-dark': '#0A0E1A',
        'morpho-card': '#111827',
        'morpho-border': '#1F2937',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
      backdropBlur: { xs: '2px' },
    },
  },
  plugins: [],
}
