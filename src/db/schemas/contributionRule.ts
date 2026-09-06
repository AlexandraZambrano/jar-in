import type { RxJsonSchema } from 'rxdb';

export type ContributionMode =
  | 'fixed_percent'
  | 'proportional_to_income'
  | 'fixed_amount';

export interface ContributionRule {
  id: string;
  jarId: string;
  walletId: string;
  mode: ContributionMode;
  value: number;
  createdAt: string;
  updatedAt: string;
}

export const contributionRuleSchema: RxJsonSchema<ContributionRule> = {
  title: 'contributionRule',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    jarId: { type: 'string', maxLength: 100 },
    walletId: { type: 'string', maxLength: 100 },
    mode: {
      type: 'string',
      enum: ['fixed_percent', 'proportional_to_income', 'fixed_amount'],
    },
    value: { type: 'number' },
    createdAt: { type: 'string', maxLength: 30 },
    updatedAt: { type: 'string', maxLength: 30 },
  },
  required: ['id', 'jarId', 'walletId', 'mode', 'value', 'createdAt', 'updatedAt'],
  indexes: ['jarId', 'walletId'],
};
