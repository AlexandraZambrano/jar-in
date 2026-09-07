import type { JarPattern } from '@/db/schemas';

export interface PaletteEntry {
  key: string;
  name: string;
  /** default "Candy" hue */
  candy: string;
  /** Okabe–Ito equivalent used in colour-blind-safe mode */
  cvd: string;
  onCandy: string;
  onCvd: string;
  pattern: JarPattern;
  icon: string;
}

/** The six default jar identities. User jars may pick any of these or a custom hue. */
export const JAR_PALETTE: PaletteEntry[] = [
  { key: 'essentials', name: 'Cherry', candy: '#e8384f', cvd: '#d55e00', onCandy: '#ffffff', onCvd: '#ffffff', pattern: 'solid', icon: 'house' },
  { key: 'investment', name: 'Cobalt', candy: '#2c63e6', cvd: '#0072b2', onCandy: '#ffffff', onCvd: '#ffffff', pattern: 'hatch', icon: 'sprout' },
  { key: 'safe', name: 'Grape', candy: '#8b44d7', cvd: '#cc79a7', onCandy: '#ffffff', onCvd: '#2b2440', pattern: 'dots', icon: 'shield' },
  { key: 'joy', name: 'Mango', candy: '#f5820a', cvd: '#e69f00', onCandy: '#2b2440', onCvd: '#2b2440', pattern: 'hline', icon: 'confetti' },
  { key: 'health', name: 'Kiwi', candy: '#1fa971', cvd: '#009e73', onCandy: '#ffffff', onCvd: '#2b2440', pattern: 'grid', icon: 'heart' },
  { key: 'other', name: 'Slate', candy: '#64708a', cvd: '#56b4e9', onCandy: '#ffffff', onCvd: '#2b2440', pattern: 'vline', icon: 'tag' },
];

const byCandy = new Map(JAR_PALETTE.map((e) => [e.candy.toLowerCase(), e]));

function toRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [
    parseInt(c.slice(0, 2), 16),
    parseInt(c.slice(2, 4), 16),
    parseInt(c.slice(4, 6), 16),
  ];
}

export function pickReadableInk(hex: string): string {
  const c = hex.replace('#', '');
  if (c.length < 6) return '#2b2440';
  const ch = (i: number) => parseInt(c.slice(i, i + 2), 16) / 255;
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const L = 0.2126 * lin(ch(0)) + 0.7152 * lin(ch(2)) + 0.0722 * lin(ch(4));
  return L > 0.45 ? '#2b2440' : '#ffffff';
}

/** Mix a hex toward a warm grey — used to dial jar colours down in Calm mode. */
export function muteHex(hex: string, t = 0.44): string {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const [r, g, b] = toRgb(hex);
  const [gr, gg, gb] = [168, 162, 154]; // #a8a29a
  const m = (a: number, c: number) => Math.round(a + (c - a) * t);
  return `#${[m(r, gr), m(g, gg), m(b, gb)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

export interface JarColorMode {
  cvd?: boolean;
  calm?: boolean;
}

/** Resolve a jar's stored hex to the fill + on-fill colour for the active modes. */
export function resolveJarColors(
  hex: string,
  mode: JarColorMode | boolean = {},
): { fill: string; on: string } {
  // `true`/`false` still accepted as a shorthand for `{ cvd }`.
  const { cvd = false, calm = false } = typeof mode === 'boolean' ? { cvd: mode } : mode;
  const entry = byCandy.get(hex.toLowerCase());
  let fill: string;
  let on: string;
  if (entry) {
    fill = cvd ? entry.cvd : entry.candy;
    on = cvd ? entry.onCvd : entry.onCandy;
  } else {
    fill = hex;
    on = pickReadableInk(hex);
  }
  if (calm) {
    fill = muteHex(fill);
    on = pickReadableInk(fill);
  }
  return { fill, on };
}

/** CSS background-image for a pattern overlay (used in colour-blind-safe mode). */
export const PATTERN_CSS: Record<JarPattern, string> = {
  solid: 'none',
  hatch:
    'repeating-linear-gradient(45deg, rgba(255,255,255,.42) 0 3px, transparent 3px 8px)',
  dots: 'radial-gradient(rgba(255,255,255,.5) 1.4px, transparent 1.8px)',
  hline:
    'repeating-linear-gradient(0deg, rgba(255,255,255,.4) 0 3px, transparent 3px 9px)',
  grid: 'repeating-linear-gradient(0deg, rgba(255,255,255,.34) 0 2px, transparent 2px 8px), repeating-linear-gradient(90deg, rgba(255,255,255,.34) 0 2px, transparent 2px 8px)',
  vline:
    'repeating-linear-gradient(90deg, rgba(255,255,255,.4) 0 3px, transparent 3px 9px)',
};

export const PATTERN_BG_SIZE: Partial<Record<JarPattern, string>> = {
  dots: '9px 9px',
};
