import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const tokenColor = (name: string) => `var(--${name})`;

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: tokenColor('paper'),
        sheet: tokenColor('sheet'),
        ink: {
          DEFAULT: tokenColor('ink'),
          2: tokenColor('ink-2'),
          3: tokenColor('ink-3'),
        },
        rule: tokenColor('rule'),
        accent: { DEFAULT: tokenColor('accent'), press: tokenColor('accent-press') },
        pass: { DEFAULT: tokenColor('pass'), soft: tokenColor('pass-soft') },
        fail: { DEFAULT: tokenColor('fail'), press: tokenColor('fail-press'), soft: tokenColor('fail-soft') },
        warn: { DEFAULT: tokenColor('warn'), soft: tokenColor('warn-soft') },
        unknown: { DEFAULT: tokenColor('unknown'), soft: tokenColor('unknown-soft') },
        pending: { DEFAULT: tokenColor('pending'), soft: tokenColor('pending-soft') },
        scrim: tokenColor('scrim'),

        // shadcn/ui semantic names, mapped onto the Manifest palette.
        background: tokenColor('paper'),
        foreground: tokenColor('ink'),
        card: { DEFAULT: tokenColor('sheet'), foreground: tokenColor('ink') },
        popover: { DEFAULT: tokenColor('sheet'), foreground: tokenColor('ink') },
        primary: { DEFAULT: tokenColor('accent'), foreground: tokenColor('ink') },
        secondary: { DEFAULT: tokenColor('sheet'), foreground: tokenColor('ink') },
        muted: { DEFAULT: tokenColor('pending-soft'), foreground: tokenColor('ink-2') },
        destructive: { DEFAULT: tokenColor('fail'), foreground: tokenColor('sheet') },
        border: tokenColor('rule'),
        input: tokenColor('rule'),
        ring: tokenColor('ink'),
      },
      fontFamily: {
        // Latin first, then the latin-ext face that holds ₹, then Hindi and Tamil.
        sans: [
          'var(--font-archivo)',
          'var(--font-archivo-ext)',
          'var(--font-mukta)',
          'var(--font-mukta-malar)',
          'system-ui',
          'sans-serif',
        ],
        mono: ['var(--font-plex-mono)', 'var(--font-plex-mono-ext)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: ['28px', { lineHeight: '32px', fontWeight: '700' }],
        h1: ['22px', { lineHeight: '28px', fontWeight: '600' }],
        h2: ['17px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '22px' }],
        table: ['14px', { lineHeight: '20px' }],
        label: ['12px', { lineHeight: '16px', fontWeight: '500' }],
        money: ['20px', { lineHeight: '24px', fontWeight: '600' }],
      },
      borderRadius: {
        control: 'var(--radius-control)',
      },
      spacing: {
        ribbon: 'var(--ribbon-height)',
        sidebar: '248px',
        topbar: '64px',
      },
      maxWidth: {
        content: '1200px',
      },
      transitionDuration: {
        fast: 'var(--motion-fast)',
        base: 'var(--motion-base)',
      },
      transitionTimingFunction: {
        out: 'var(--ease-out)',
      },
      keyframes: {
        'scan-line': {
          '0%': { top: '0%' },
          '50%': { top: '100%' },
          '100%': { top: '0%' },
        },
        'check-draw': {
          from: { strokeDashoffset: '1' },
          to: { strokeDashoffset: '0' },
        },
      },
      animation: {
        'scan-line': 'scan-line var(--motion-scan) ease-in-out infinite',
        'check-draw': 'check-draw var(--motion-base) var(--ease-out) both',
      },
    },
  },
  plugins: [animate],
};

export default config;
