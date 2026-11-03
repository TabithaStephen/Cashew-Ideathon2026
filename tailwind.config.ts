import type { Config } from 'tailwindcss';

// All colours reference CSS variables defined in app/tokens.css (the single token file).
const v = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: v('canvas'),
        surface: v('surface'),
        ink: { DEFAULT: v('ink'), 2: v('ink-2'), 3: v('ink-3') },
        line: v('line'),
        brand: { DEFAULT: v('brand'), soft: v('brand-soft') },
        accent: { DEFAULT: v('accent'), soft: v('accent-soft') },
        success: { DEFAULT: v('success'), soft: v('success-soft') },
        warn: { DEFAULT: v('warn'), soft: v('warn-soft') },
        danger: { DEFAULT: v('danger'), soft: v('danger-soft') },
        unknown: { DEFAULT: v('unknown'), soft: v('unknown-soft') },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        h1: ['32px', { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '600' }],
        h2: ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' }],
        h3: ['18px', { lineHeight: '26px', letterSpacing: '-0.01em', fontWeight: '600' }],
        body: ['14px', '22px'],
        table: ['13px', '20px'],
        caption: ['12px', '16px'],
        mono: ['12px', '16px'],
      },
      borderRadius: { card: '14px', btn: '10px', input: '10px' },
      boxShadow: {
        sm: '0 1px 2px rgba(30,43,36,.06)',
        md: '0 8px 24px rgba(30,43,36,.08)',
      },
      spacing: { sidebar: '248px', topbar: '64px', ribbon: '24px' },
      maxWidth: { content: '1200px' },
      transitionTimingFunction: { out: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      transitionDuration: { fast: '150ms', base: '220ms' },
      keyframes: {
        shimmer: { '0%': { backgroundPosition: '-400px 0' }, '100%': { backgroundPosition: '400px 0' } },
        scan: { '0%': { top: '4%' }, '50%': { top: '88%' }, '100%': { top: '4%' } },
      },
      animation: {
        shimmer: 'shimmer 1.4s linear infinite',
        scan: 'scan 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
export default config;
