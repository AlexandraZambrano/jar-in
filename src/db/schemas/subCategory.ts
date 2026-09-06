import type { RxJsonSchema } from 'rxdb';

export interface SubCategory {
  id: string;
  jarId: string;
  name: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export const subCategorySchema: RxJsonSchema<SubCategory> = {
  title: 'subCategory',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    jarId: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    order: { type: 'number' },
    createdAt: { type: 'string', maxLength: 30 },
    updatedAt: { type: 'string', maxLength: 30 },
  },
  required: ['id', 'jarId', 'name', 'order', 'createdAt', 'updatedAt'],
  indexes: ['jarId'],
};
