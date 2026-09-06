import type { RxJsonSchema } from 'rxdb';

export type IncomeFrequency = 'monthly' | 'weekly' | 'biweekly' | 'yearly' | 'once';

export interface IncomeSource {
  id: string;
  name: string;
  amountMinor: number;
  currency: string;
  frequency: IncomeFrequency;
  destinationWalletId: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export const incomeSourceSchema: RxJsonSchema<IncomeSource> = {
  title: 'incomeSource',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    amountMinor: { type: 'integer' },
    currency: { type: 'string', maxLength: 3 },
    frequency: {
      type: 'string',
      enum: ['monthly', 'weekly', 'biweekly', 'yearly', 'once'],
    },
    destinationWalletId: { type: 'string', maxLength: 100 },
    active: { type: 'boolean' },
    createdAt: { type: 'string', maxLength: 30 },
    updatedAt: { type: 'string', maxLength: 30 },
  },
  required: [
    'id',
    'name',
    'amountMinor',
    'currency',
    'frequency',
    'destinationWalletId',
    'active',
    'createdAt',
    'updatedAt',
  ],
};
