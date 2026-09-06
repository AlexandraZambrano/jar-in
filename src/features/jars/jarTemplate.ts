import type { JarPattern, JarType } from '@/db/schemas';

export interface JarTemplateEntry {
  key: string;
  name: string;
  type: JarType;
  percentage: number;
  color: string;
  pattern: JarPattern;
  icon: string;
  /** Major units; converted to minor on seed. Accumulation jars only. */
  targetMajor?: number;
  subCategories?: string[];
}

/** The fully-editable default jar set (SPEC.md §4). */
export const DEFAULT_JAR_TEMPLATE: JarTemplateEntry[] = [
  {
    key: 'essentials',
    name: 'Essentials',
    type: 'flow',
    percentage: 50,
    color: '#E8384F',
    pattern: 'solid',
    icon: 'house',
    subCategories: ['Rent', 'Energy', 'Water', 'Groceries'],
  },
  {
    key: 'investment',
    name: 'Investment',
    type: 'accumulation',
    percentage: 25,
    color: '#2C63E6',
    pattern: 'hatch',
    icon: 'sprout',
    targetMajor: 10000,
  },
  {
    key: 'safe',
    name: 'Safe fund',
    type: 'accumulation',
    percentage: 15,
    color: '#8B44D7',
    pattern: 'dots',
    icon: 'shield',
    targetMajor: 5000,
  },
  {
    key: 'joy',
    name: 'Joy-jar',
    type: 'flow',
    percentage: 10,
    color: '#F5820A',
    pattern: 'hline',
    icon: 'confetti',
  },
];
