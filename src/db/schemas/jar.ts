import type { RxJsonSchema } from 'rxdb';

export type JarType = 'flow' | 'accumulation';
export type JarVisibility = 'personal' | 'shared';
export type JarPattern = 'solid' | 'hatch' | 'dots' | 'hline' | 'grid' | 'vline';

export interface Jar {
  id: string;
  name: string;
  type: JarType;
  percentage: number;
  visibility: JarVisibility;
  targetAmountMinor: number | null;
  openingBalanceMinor: number;
  startedAt: string;
  currency: string;
  color: string;
  pattern: JarPattern;
  icon: string;
  ownerType: 'user' | 'household';
  order: number;
  createdAt: string;
  updatedAt: string;
}

export const jarSchema: RxJsonSchema<Jar> = {
  title: 'jar',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    type: { type: 'string', enum: ['flow', 'accumulation'] },
    percentage: { type: 'number', minimum: 0, maximum: 100 },
    visibility: { type: 'string', enum: ['personal', 'shared'] },
    targetAmountMinor: { type: ['integer', 'null'] },
    openingBalanceMinor: { type: 'integer' },
    startedAt: { type: 'string', maxLength: 30 },
    currency: { type: 'string', maxLength: 3 },
    color: { type: 'string', maxLength: 9 },
    pattern: { type: 'string', enum: ['solid', 'hatch', 'dots', 'hline', 'grid', 'vline'] },
    icon: { type: 'string', maxLength: 40 },
    ownerType: { type: 'string', enum: ['user', 'household'] },
    order: { type: 'number' },
    createdAt: { type: 'string', maxLength: 30 },
    updatedAt: { type: 'string', maxLength: 30 },
  },
  required: [
    'id',
    'name',
    'type',
    'percentage',
    'visibility',
    'openingBalanceMinor',
    'startedAt',
    'currency',
    'color',
    'pattern',
    'icon',
    'ownerType',
    'order',
    'createdAt',
    'updatedAt',
  ],
};
