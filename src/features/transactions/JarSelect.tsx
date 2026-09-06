import { usePreferences } from '@/lib/preferences';
import { Icon, type IconName } from '@/components/icons';
import { resolveJarColors } from '@/features/jars/jarPalette';
import type { Jar } from '@/db/schemas';
import styles from './JarSelect.module.css';

interface Props {
  jars: Jar[];
  value: string;
  onChange: (jarId: string) => void;
}

export function JarSelect({ jars, value, onChange }: Props) {
  const cvd = usePreferences().a11y.includes('cvd');
  return (
    <div className={styles.row} role="radiogroup" aria-label="Jar">
      {jars.map((jar) => {
        const { fill, on } = resolveJarColors(jar.color, cvd);
        const selected = jar.id === value;
        return (
          <button
            key={jar.id}
            type="button"
            role="radio"
            aria-checked={selected}
            data-selected={selected}
            className={styles.chip}
            style={{ background: fill, color: on }}
            onClick={() => onChange(jar.id)}
          >
            <Icon name={jar.icon as IconName} size={20} />
            <span>{jar.name}</span>
          </button>
        );
      })}
    </div>
  );
}
