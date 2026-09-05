import type { z } from 'zod';
import type {
  entrySchema,
  moneyEntrySchema,
  adjustSchema,
} from '../schema/saving.schema';
import type { Plan } from '../../plans/types/plan.type';
import type { Save } from '../../../lib/form-types';

export type Entry = z.infer<typeof entrySchema>;

export type MoneyEntryValues = z.infer<typeof moneyEntrySchema>;

export type ContributionValues = z.infer<typeof adjustSchema>;

export interface MoneyEntryFormProps {
  entry?: Entry;
  month: string;
  start: string;
  kind: Entry['kind'];
  save: Save<Entry>;
  cancel: () => void;
}

export interface ContributionFormProps {
  plan: Plan;
  month: string;
  save: Save<ContributionValues>;
  cancel: () => void;
}

export interface MonthRow {
  month: string;
  opening: number;
  regular: number;
  scheduled: number;
  extra: number;
  withdrawals: number;
  net: number;
  closing: number;
  mode: 'Recorded' | 'Adjusted' | 'Automatic';
}
