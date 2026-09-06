import type { SVGProps, ReactElement } from 'react';

/** Hand-drawn-feel icon set. 2px stroke, round joins, ~28×26 grid.
 *  No emoji, no icon font (docs/DESIGN-STICKER-SHEET.md §3.6). */

export type IconName =
  | 'house'
  | 'sprout'
  | 'shield'
  | 'confetti'
  | 'heart'
  | 'tag'
  | 'home'
  | 'jars'
  | 'plus'
  | 'insights'
  | 'more'
  | 'check'
  | 'warn'
  | 'chevron';

const PATHS: Record<IconName, ReactElement> = {
  house: (
    <>
      <path d="M4 12 L14 4 L24 12" />
      <path d="M7 11 V22 H21 V11" />
      <path d="M11 17.5 q3 2.5 6 0" />
    </>
  ),
  sprout: (
    <>
      <path d="M14 24 V12" />
      <path d="M14 15 C14 10 9 8 4.5 9 C4.5 14 9 16 14 15 Z" />
      <path d="M14 13 C14 8.5 18.5 6 23 7 C23 11.5 18.5 14 14 13 Z" />
    </>
  ),
  shield: (
    <>
      <path d="M14 3 L23 7 V13 C23 19 19 23 14 25 C9 23 5 19 5 13 V7 Z" />
      <path d="M11 15.5 q3 2.5 6 0" />
    </>
  ),
  confetti: (
    <>
      <path d="M5 24 L11 8 L23 20 Z" />
      <path d="M15 4 v3 M20 6 l-2 2 M10 5 l2 2" />
    </>
  ),
  heart: <path d="M14 23 s-9-5.4-9-12 a5 5 0 0 1 9-3 a5 5 0 0 1 9 3 c0 6.6-9 12-9 12 z" />,
  tag: (
    <>
      <path d="M4 12 L12 4 H22 V14 L14 22 Z" />
      <circle cx="17" cy="9" r="1.6" />
    </>
  ),
  home: (
    <>
      <path d="M4 11l8-7 8 7" />
      <path d="M6 10v9h12v-9" />
    </>
  ),
  jars: (
    <>
      <path d="M8 3h8" />
      <path d="M9 3v2.4C7.5 6.4 7 7.9 7 9.4V19a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V9.4c0-1.5-.5-3-2-4V3" />
      <path d="M7 12h10" />
    </>
  ),
  plus: <path d="M12 6v12M6 12h12" />,
  insights: (
    <>
      <path d="M5 20v-6M12 20V5M19 20v-9" />
      <path d="M3 20h18" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>
  ),
  check: <path d="M4 12l6 6L20 6" />,
  warn: (
    <>
      <path d="M12 3 L22 20 H2 Z" />
      <path d="M12 10v5" />
      <circle cx="12" cy="17.5" r="0.6" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
};

const GRID: Partial<Record<IconName, string>> = {
  house: '0 0 28 26',
  sprout: '0 0 28 26',
  shield: '0 0 28 26',
  confetti: '0 0 28 26',
  heart: '0 0 28 26',
  tag: '0 0 28 26',
};

export function Icon({
  name,
  size = 22,
  strokeWidth = 2,
  ...rest
}: { name: IconName; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={GRID[name] ?? '0 0 24 24'}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- static data, no HMR concern
export const JAR_ICON_NAMES: IconName[] = [
  'house',
  'sprout',
  'shield',
  'confetti',
  'heart',
  'tag',
];
