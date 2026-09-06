import { Icon } from './icons';
import styles from './Keypad.module.css';

interface Props {
  value: string;
  onChange: (next: string) => void;
  /** decimal places allowed (0 for zero-decimal currencies) */
  decimals?: number;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export function Keypad({ value, onChange, decimals = 2 }: Props) {
  function press(k: string) {
    if (k === 'del') {
      onChange(value.slice(0, -1));
      return;
    }
    if (k === '.') {
      if (decimals === 0 || value.includes('.')) return;
      onChange((value === '' ? '0' : value) + '.');
      return;
    }
    // digit
    if (value === '0') {
      onChange(k);
      return;
    }
    const dot = value.indexOf('.');
    if (dot >= 0 && value.length - dot - 1 >= decimals) return;
    onChange(value + k);
  }

  return (
    <div className={styles.pad} role="group" aria-label="Amount keypad">
      {KEYS.map((k) => (
        <button key={k} type="button" className={styles.key} onClick={() => press(k)}>
          {k}
        </button>
      ))}
      <button
        type="button"
        className={styles.key}
        onClick={() => press('.')}
        disabled={decimals === 0}
        aria-label="Decimal point"
      >
        .
      </button>
      <button key="0" type="button" className={styles.key} onClick={() => press('0')}>
        0
      </button>
      <button
        type="button"
        className={styles.key}
        onClick={() => press('del')}
        aria-label="Delete last digit"
      >
        <Icon name="chevron" size={20} style={{ transform: 'scaleX(-1)' }} />
      </button>
    </div>
  );
}
