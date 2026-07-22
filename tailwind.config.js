/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Self-hosted via @fontsource; full niqqud support.
        hebrew: ['"Noto Sans Hebrew"', 'David Libre', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Warm "story hour" sky + chalk-pastel palette (PRD §9).
        sky: {
          light: '#eaf4ff',
          soft: '#d6ebff',
        },
        chalk: {
          pink: '#ffd6e0',
          yellow: '#fff3c4',
          green: '#d6f5d6',
          blue: '#d6e4ff',
          purple: '#e8d6ff',
        },
      },
      lineHeight: {
        niqqud: '2',
      },
    },
  },
  plugins: [],
};
