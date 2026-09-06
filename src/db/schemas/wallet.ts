import type { RxJsonSchema } from 'rxdb';

export interface Wallet {
  id: string;
  name: string;
  currency: string;
  ownerType: 'user' | 'household';
  createdAt: string;
  updatedAt: string;
}

export const walletSchema: RxJsonSchema<Wallet> = {
  title: 'wallet',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    currency: { type: 'string', maxLength: 3 },
    ownerType: { type: 'string', enum: ['user', 'household'] },
    createdAt: { type: 'string', maxLength: 30 },
    updatedAt: { type: 'string', maxLength: 30 },
  },
  required: ['id', 'name', 'currency', 'ownerType', 'createdAt', 'updatedAt'],
};
