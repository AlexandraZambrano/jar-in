import { beforeEach, describe, expect, it } from 'vitest';
import { getNotableChange, recordProjections, resetTracker } from './tracker';

beforeEach(resetTracker);

const snap = (jarId: string, jarName: string, m: number | null) => ({
  jarId,
  jarName,
  monthsRemaining: m,
});

describe('projection tracker', () => {
  it('the first record just seeds — no change reported', () => {
    recordProjections([snap('a', 'Safe fund', 12)]);
    expect(getNotableChange()).toBeNull();
  });

  it('reports a jar that now finishes sooner', () => {
    recordProjections([snap('a', 'Safe fund', 12)]);
    recordProjections([snap('a', 'Safe fund', 10)]);
    expect(getNotableChange()).toEqual({
      jarName: 'Safe fund',
      deltaMonths: 2,
      direction: 'sooner',
    });
  });

  it('reports "later" when the date slips', () => {
    recordProjections([snap('a', 'Safe fund', 10)]);
    recordProjections([snap('a', 'Safe fund', 13)]);
    expect(getNotableChange()?.direction).toBe('later');
  });

  it('picks the biggest shift across jars', () => {
    recordProjections([snap('a', 'Safe fund', 12), snap('b', 'Investment', 40)]);
    recordProjections([snap('a', 'Safe fund', 11), snap('b', 'Investment', 34)]);
    expect(getNotableChange()?.jarName).toBe('Investment');
    expect(getNotableChange()?.deltaMonths).toBe(6);
  });

  it('ignores sub-month wobble and null projections', () => {
    recordProjections([snap('a', 'Safe fund', 12.2)]);
    recordProjections([snap('a', 'Safe fund', 12.0)]);
    expect(getNotableChange()).toBeNull();

    recordProjections([snap('a', 'Safe fund', null)]);
    expect(getNotableChange()).toBeNull();
  });

  it('a transient null render does not lose the next real change', () => {
    recordProjections([snap('a', 'Safe fund', 12)]); // seed
    recordProjections([snap('a', 'Safe fund', null)]); // loading blip — keeps baseline
    recordProjections([snap('a', 'Safe fund', 20)]); // real change vs the seeded 12
    expect(getNotableChange()).toEqual({
      jarName: 'Safe fund',
      deltaMonths: 8,
      direction: 'later',
    });
  });
});
