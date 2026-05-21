import type { Config } from 'tailwindcss';

/*
 * Brand colours and type are defined once as CSS variables in app/globals.css
 * (:root) and exposed here as named Tailwind utilities. Components reference
 * the names — bg-forest-800, text-gold, font-display — never raw hex.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: {
          50: 'var(--g50)',
          100: 'var(--g100)',
          200: 'var(--g200)',
          600: 'var(--g600)',
          700: 'var(--g700)',
          800: 'var(--g800)',
          900: 'var(--g900)',
        },
        gold: {
          DEFAULT: 'var(--gold)',
          light: 'var(--gold-l)',
        },
        stone: {
          DEFAULT: 'var(--stone)',
          light: 'var(--stone-l)',
        },
        cream: 'var(--cream)',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Georgia', 'serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
