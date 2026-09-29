import type { RxJsonSchema } from 'rxdb';

/** One real "this much income landed in this jar" post, created by
 *  `allocationsRepo.syncAllocationEvents` — one per jar per whole month
 *  elapsed, valued at the planned amount when it posted (never rewritten
 *  later). Replaces the old `wholeMonthsSince × plannedPerMonth` guess. */
export interface AllocationEvent {
  id: string;
  jarId: string;
  amountMinor: number;
  currency: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export const allocationEventSchema: RxJsonSchema<AllocationEvent> = {
  title: 'allocationEvent',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    jarId: { type: 'string', maxLength: 100 },
    amountMinor: { type: 'integer' },
    currency: { type: 'string', maxLength: 3 },
    date: { type: 'string', maxLength: 30 },
    createdAt: { type: 'string', maxLength: 30 },
    updatedAt: { type: 'string', maxLength: 30 },
  },
  required: ['id', 'jarId', 'amountMinor', 'currency', 'date', 'createdAt', 'updatedAt'],
  indexes: ['jarId', 'date'],
};
