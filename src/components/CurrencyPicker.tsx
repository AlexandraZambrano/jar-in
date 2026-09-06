import { useId } from 'react';
import { COMMON_CURRENCIES, currencyLabel } from '@/lib/currencies';

interface Props {
  value: string;
  onChange: (code: string) => void;
  label?: string;
  locale?: string;
}

export function CurrencyPicker({ value, onChange, label = 'Currency', locale }: Props) {
  const id = useId();
  // Keep a value that isn't in the common list (e.g. from an older document).
  const options = COMMON_CURRENCIES.includes(value as (typeof COMMON_CURRENCIES)[number])
    ? [...COMMON_CURRENCIES]
    : [value, ...COMMON_CURRENCIES];

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((code) => (
          <option key={code} value={code}>
            {currencyLabel(code, locale)}
          </option>
        ))}
      </select>
    </div>
  );
}
