import type { RxJsonSchema } from 'rxdb';

/** Reserved for Phase 2 (display-currency rollup). Unused in v1. */
export interface FxRate {
  id: string; // `${baseCurrency}_${quoteCurrency}`
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  fetchedAt: string;
}

export const fxRateSchema: RxJsonSchema<FxRate> = {
  title: 'fxRate',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 20 },
    baseCurrency: { type: 'string', maxLength: 3 },
    quoteCurrency: { type: 'string', maxLength: 3 },
    rate: { type: 'number' },
    fetchedAt: { type: 'string', maxLength: 30 },
  },
  required: ['id', 'baseCurrency', 'quoteCurrency', 'rate', 'fetchedAt'],
};
