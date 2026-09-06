import type { RxJsonSchema } from 'rxdb';

export type TransactionSourceType = 'manual' | 'csv_import' | 'bank_sync';

export interface Transaction {
  id: string;
  jarId: string;
  subCategoryId: string | null;
  amountMinor: number;
  currency: string;
  date: string;
  note: string;
  sourceType: TransactionSourceType;
  externalAccountId: string | null;
  externalTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export const transactionSchema: RxJsonSchema<Transaction> = {
  title: 'transaction',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    jarId: { type: 'string', maxLength: 100 },
    subCategoryId: { type: ['string', 'null'], maxLength: 100 },
    amountMinor: { type: 'integer' },
    currency: { type: 'string', maxLength: 3 },
    date: { type: 'string', maxLength: 30 },
    note: { type: 'string' },
    sourceType: { type: 'string', enum: ['manual', 'csv_import', 'bank_sync'] },
    externalAccountId: { type: ['string', 'null'], maxLength: 200 },
    externalTransactionId: { type: ['string', 'null'], maxLength: 200 },
    createdAt: { type: 'string', maxLength: 30 },
    updatedAt: { type: 'string', maxLength: 30 },
  },
  required: [
    'id',
    'jarId',
    'amountMinor',
    'currency',
    'date',
    'note',
    'sourceType',
    'createdAt',
    'updatedAt',
  ],
  indexes: ['jarId', 'date'],
};
