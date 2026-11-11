import localFont from 'next/font/local';

// All fonts are bundled so the demo makes no network calls at runtime.
//
// The ₹ glyph is only in each Latin font's latin-ext file and the digits are only in its latin file,
// so each font is two faces, stacked in tailwind.config.ts. adjustFontFallback must stay off:
// the generated metric fallback would otherwise catch ₹ before the latin-ext face gets a chance.
// A later face in the stack downloads only if a glyph needs it, so English never fetches Mukta.


export const archivo = localFont({
  src: [
    { path: './fonts/archivo-latin-400-normal.woff2', weight: '400' },
    { path: './fonts/archivo-latin-500-normal.woff2', weight: '500' },
    { path: './fonts/archivo-latin-600-normal.woff2', weight: '600' },
    { path: './fonts/archivo-latin-700-normal.woff2', weight: '700' },
  ],
  variable: '--font-archivo',
  display: 'swap',
  adjustFontFallback: false,
  preload: false,
});

export const archivoExt = localFont({
  src: [
    { path: './fonts/archivo-latin-ext-400-normal.woff2', weight: '400' },
    { path: './fonts/archivo-latin-ext-500-normal.woff2', weight: '500' },
    { path: './fonts/archivo-latin-ext-600-normal.woff2', weight: '600' },
    { path: './fonts/archivo-latin-ext-700-normal.woff2', weight: '700' },
  ],
  variable: '--font-archivo-ext',
  display: 'swap',
  adjustFontFallback: false,
  preload: false,
});

export const plexMono = localFont({
  src: [
    { path: './fonts/ibm-plex-mono-latin-400-normal.woff2', weight: '400' },
    { path: './fonts/ibm-plex-mono-latin-500-normal.woff2', weight: '500' },
  ],
  variable: '--font-plex-mono',
  display: 'swap',
  adjustFontFallback: false,
  preload: false,
});

export const plexMonoExt = localFont({
  src: [
    { path: './fonts/ibm-plex-mono-latin-ext-400-normal.woff2', weight: '400' },
    { path: './fonts/ibm-plex-mono-latin-ext-500-normal.woff2', weight: '500' },
  ],
  variable: '--font-plex-mono-ext',
  display: 'swap',
  adjustFontFallback: false,
  preload: false,
});

export const mukta = localFont({
  src: [
    { path: './fonts/mukta-devanagari-400-normal.woff2', weight: '400' },
    { path: './fonts/mukta-devanagari-600-normal.woff2', weight: '600' },
  ],
  variable: '--font-mukta',
  display: 'swap',
  adjustFontFallback: false,
  preload: false,
});

export const muktaMalar = localFont({
  src: [
    { path: './fonts/mukta-malar-tamil-400-normal.woff2', weight: '400' },
    { path: './fonts/mukta-malar-tamil-600-normal.woff2', weight: '600' },
  ],
  variable: '--font-mukta-malar',
  display: 'swap',
  adjustFontFallback: false,
  preload: false,
});

export const fontVariables = [archivo, archivoExt, plexMono, plexMonoExt, mukta, muktaMalar]
  .map((font) => font.variable)
  .join(' ');
