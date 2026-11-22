/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        exo: {
          bg: "#050608",
          surface: "#0D1014",
          "surface-light": "#141920",
          "deep-blue": "#0c1e38",
          "electric-blue": "#38bdf8",
          "star-blue": "#60a5fa",
          "muted-gold": "#dfb15b",
          "pale-gold": "#f3e1b6",
          "dark-teal": "#0c2b33",
          "atmospheric-teal": "#144852",
          "off-white": "#e8eaed",
          "muted-text": "#8c94a0",
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', '"Liberation Mono"', '"Courier New"', 'monospace'],
        sans: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      letterSpacing: {
        'widest-plus': '0.25em',
        'super-wide': '0.35em',
      }
    },
  },
  plugins: [],
}
