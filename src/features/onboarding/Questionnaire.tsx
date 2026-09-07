import { useState } from 'react';
import { CurrencyPicker } from '@/components/CurrencyPicker';
import { defaultCurrencyForLocale } from '@/lib/currencies';
import { deviceLocale } from '@/lib/locale';
import { parseAmountInput } from '@/lib/money';
import type { OnboardingAnswers, SavesAlready } from './proposeJars';
import styles from './Onboarding.module.css';

type MoneyKey = 'income' | 'rent' | 'utilities' | 'groceries' | 'debt';

interface Step {
  key: MoneyKey | 'saves';
  kind: 'money' | 'choice';
  q: string;
  hint?: string;
  withCurrency?: boolean;
}

const STEPS: Step[] = [
  { key: 'income', kind: 'money', q: 'What’s your monthly take-home pay?', hint: 'After tax — what actually lands in your account.', withCurrency: true },
  { key: 'rent', kind: 'money', q: 'Roughly, rent or mortgage each month?' },
  { key: 'utilities', kind: 'money', q: 'And monthly utilities?', hint: 'Power, water, internet, phone.' },
  { key: 'groceries', kind: 'money', q: 'Monthly groceries?' },
  { key: 'debt', kind: 'money', q: 'Any monthly debt repayments?', hint: 'Loans, credit cards. Leave blank if none.' },
  {
    key: 'saves',
    kind: 'choice',
    q: 'Do you set money aside each month already?',
  },
];

const CHOICES: [SavesAlready, string][] = [
  ['yes-a-lot', 'Yes, a good chunk'],
  ['yes-a-bit', 'A little'],
  ['not-yet', 'Not yet'],
];

interface Props {
  onDone: (answers: OnboardingAnswers) => void;
  onExit: () => void;
}

export function Questionnaire({ onDone, onExit }: Props) {
  const [i, setI] = useState(0);
  const [currency, setCurrency] = useState(defaultCurrencyForLocale(deviceLocale()));
  const [money, setMoney] = useState<Record<MoneyKey, string>>({
    income: '',
    rent: '',
    utilities: '',
    groceries: '',
    debt: '',
  });
  const [saves, setSaves] = useState<SavesAlready | null>(null);

  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  function finish() {
    const num = (k: MoneyKey) => parseAmountInput(money[k]);
    onDone({
      incomeMajor: num('income'),
      currency,
      rentMajor: num('rent'),
      utilitiesMajor: num('utilities'),
      groceriesMajor: num('groceries'),
      debtMajor: num('debt'),
      savesAlready: saves,
    });
  }

  function next() {
    if (last) finish();
    else setI((n) => n + 1);
  }

  return (
    <div className={styles.inner}>
      <span className={styles.brand}>A few questions</span>
      <div className={styles.progress} aria-hidden="true">
        {STEPS.map((s, n) => (
          <span key={s.key} className={`${styles.pip} ${n <= i ? styles.on : ''}`} />
        ))}
      </div>

      <div className={styles.card}>
        <span className={styles.q}>{step.q}</span>
        {step.hint && <span className={styles.hint}>{step.hint}</span>}

        {step.kind === 'money' ? (
          <>
            <div className={styles.amountRow}>
              <span className={styles.cur}>{currency}</span>
              <input
                type="text"
                inputMode="decimal"
                aria-label={step.q}
                value={money[step.key as MoneyKey]}
                onChange={(e) =>
                  setMoney((m) => ({ ...m, [step.key]: e.target.value }))
                }
                placeholder="0"
              />
            </div>
            {step.withCurrency && (
              <CurrencyPicker value={currency} onChange={setCurrency} />
            )}
          </>
        ) : (
          <div className={styles.choices}>
            {CHOICES.map(([val, label]) => (
              <button
                key={val}
                type="button"
                className={styles.choice}
                aria-pressed={saves === val}
                onClick={() => setSaves(val)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className={styles.nav}>
          {i > 0 ? (
            <button
              type="button"
              className={styles['btn--ghost']}
              onClick={() => setI((n) => n - 1)}
            >
              Back
            </button>
          ) : (
            <button type="button" className={styles['btn--ghost']} onClick={onExit}>
              Back
            </button>
          )}
          <button type="button" className={`${styles.btn} ${styles.grow}`} onClick={next}>
            {last ? 'See my jars' : 'Next'}
          </button>
        </div>

        {step.kind === 'money' && (
          <button
            type="button"
            className={styles.link}
            onClick={() => {
              setMoney((m) => ({ ...m, [step.key]: '' }));
              next();
            }}
          >
            Skip this one
          </button>
        )}
      </div>
    </div>
  );
}
