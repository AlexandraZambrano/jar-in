import type { RxJsonSchema } from 'rxdb';

export interface WithdrawalEvent {
  id: string;
  jarId: string;
  amountMinor: number;
  currency: string;
  date: string;
  reason: string | null;
  createdAt: string;
  updatedAt: string;
}

export const withdrawalEventSchema: RxJsonSchema<WithdrawalEvent> = {
  title: 'withdrawalEvent',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    jarId: { type: 'string', maxLength: 100 },
    amountMinor: { type: 'integer' },
    currency: { type: 'string', maxLength: 3 },
    date: { type: 'string', maxLength: 30 },
    reason: { type: ['string', 'null'] },
    createdAt: { type: 'string', maxLength: 30 },
    updatedAt: { type: 'string', maxLength: 30 },
  },
  required: ['id', 'jarId', 'amountMinor', 'currency', 'date', 'createdAt', 'updatedAt'],
  indexes: ['jarId', 'date'],
};
