import { useMemo, useState } from 'react';
import { Sticker } from '@/components/Sticker';
import { Icon, type IconName } from '@/components/icons';
import { formatMoney } from '@/lib/money';
import { resolveJarColors } from '@/features/jars/jarPalette';
import type { OnboardingAnswers, ProposedJar } from './proposeJars';
import { proposeJars, proposalTotal } from './proposeJars';
import styles from './Onboarding.module.css';

interface Props {
  answers: OnboardingAnswers;
  onBack: () => void;
  onConfirm: (jars: ProposedJar[]) => Promise<void>;
}

export function ReviewProposal({ answers, onBack, onConfirm }: Props) {
  const initial = useMemo(() => proposeJars(answers), [answers]);
  const [jars, setJars] = useState<ProposedJar[]>(initial);
  const [busy, setBusy] = useState(false);

  const total = proposalTotal(jars);
  const currency = answers.currency;

  const setPct = (key: string, raw: string) => {
    const v = Math.max(0, Math.min(100, Number(raw) || 0));
    setJars((js) => js.map((j) => (j.key === key ? { ...j, percentage: v } : j)));
  };
  const setName = (key: string, name: string) =>
    setJars((js) => js.map((j) => (j.key === key ? { ...j, name } : j)));
  const remove = (key: string) =>
    setJars((js) => js.filter((j) => j.key !== key));

  return (
    <div className={styles.inner}>
      <span className={styles.brand}>Your starting jars</span>
      <p className={styles.hint} style={{ margin: 0 }}>
        Based on your answers. Nudge the percentages, rename anything, or drop a
        jar — you can fine-tune colours, icons and sub-categories later from Jars.
      </p>

      <div className={styles.reviewList}>
        {jars.map((j) => {
          const { fill, on } = resolveJarColors(j.color);
          return (
            <Sticker key={j.key} fill={fill} on={on} tiltSeed={j.key.length}>
              <div className={styles.reviewRow} style={{ color: on }}>
                <Icon name={j.icon as IconName} size={18} />
                <input
                  className={styles.rname}
                  value={j.name}
                  aria-label={`${j.key} jar name`}
                  onChange={(e) => setName(j.key, e.target.value)}
                />
                <input
                  className={styles.rpct}
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={j.percentage}
                  aria-label={`${j.name} percentage`}
                  onChange={(e) => setPct(j.key, e.target.value)}
                />
                <span aria-hidden="true">%</span>
                <button
                  type="button"
                  className={styles.rdel}
                  aria-label={`Remove ${j.name}`}
                  onClick={() => remove(j.key)}
                >
                  <Icon name="plus" size={14} style={{ transform: 'rotate(45deg)' }} />
                </button>
              </div>
            </Sticker>
          );
        })}
      </div>

      <p
        className={styles.hint}
        style={{ margin: 0, color: total === 100 ? 'var(--ok)' : 'var(--danger)', fontWeight: 700 }}
      >
        {total === 100
          ? 'Adds up to 100%.'
          : `Adds up to ${total}% — ${total > 100 ? 'trim' : 'add'} ${Math.abs(100 - total)}% before you start.`}
      </p>

      {answers.incomeMajor != null && answers.incomeMajor > 0 && (
        <p className={styles.hint} style={{ margin: 0 }}>
          At {formatMoney(answers.incomeMajor * 100, currency)} / month, that funds
          each jar automatically.
        </p>
      )}

      <div className={styles.nav}>
        <button type="button" className={styles['btn--ghost']} onClick={onBack}>
          Back
        </button>
        <button
          type="button"
          className={`${styles.btn} ${styles.grow}`}
          disabled={busy || total !== 100 || jars.length === 0}
          onClick={async () => {
            setBusy(true);
            await onConfirm(jars);
          }}
        >
          {busy ? 'Setting up…' : 'Looks good, start'}
        </button>
      </div>
    </div>
  );
}
