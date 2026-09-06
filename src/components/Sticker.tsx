import type { CSSProperties, ElementType, ReactNode } from 'react';
import styles from './Sticker.module.css';

interface StickerProps {
  as?: ElementType;
  children: ReactNode;
  /** integer; the decorative tilt is `(seed % 5 - 2) * --tilt-unit` (0 in Calm) */
  tiltSeed?: number;
  gloss?: boolean;
  /** background fill; defaults to --surface */
  fill?: string;
  /** text/icon colour on the fill */
  on?: string;
  radius?: number | string;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  type?: 'button' | 'submit';
  'aria-label'?: string;
}

export function Sticker({
  as,
  children,
  tiltSeed = 0,
  gloss = false,
  fill,
  on,
  radius,
  className = '',
  style,
  ...rest
}: StickerProps) {
  const Tag = (as ?? 'div') as ElementType;
  const tiltSteps = ((((tiltSeed % 5) + 5) % 5) - 2);
  const vars = {
    '--_tilt': `calc(var(--tilt-unit) * ${tiltSteps})`,
    ...(fill ? { '--_fill': fill } : {}),
    ...(on ? { '--_on': on } : {}),
    ...(radius != null ? { borderRadius: typeof radius === 'number' ? `${radius}px` : radius } : {}),
  } as CSSProperties;

  return (
    <Tag
      className={`${styles.sticker} ${gloss ? styles.gloss : ''} ${className}`}
      style={{ ...vars, ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}
