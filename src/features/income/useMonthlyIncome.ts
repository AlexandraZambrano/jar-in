import { useMemo } from 'react';
import { useDb } from '@/db/RxdbProvider';
import { DEFAULT_CURRENCY } from '@/db/constants';
import type { FxRate, IncomeSource, Jar } from '@/db/schemas';
import { useRxQuery } from '@/lib/useRxQuery';
import { monthlyIncome, type MonthlyIncome } from '@/features/dashboard/compute';
import { ratesFor } from './fxRepo';

/** Live monthly income in the home currency (the jars' currency), with
 *  foreign sources converted at the cached rates. Re-renders when income,
 *  jars or rates change. */
export function useMonthlyIncome(): { inc: MonthlyIncome; home: string; income: IncomeSource[] } {
  const db = useDb();
  const { data: jars } = useRxQuery<Jar>(() => db.jars.find(), [db]);
  const home = jars[0]?.currency ?? DEFAULT_CURRENCY;
  const { data: income } = useRxQuery<IncomeSource>(() => db.incomeSources.find(), [db]);
  const { data: fx } = useRxQuery<FxRate>(
    () => db.fxRates.find({ selector: { baseCurrency: home } }),
    [db, home],
  );
  const inc = useMemo(() => monthlyIncome(income, home, ratesFor(fx, home)), [income, home, fx]);
  return { inc, home, income };
}
