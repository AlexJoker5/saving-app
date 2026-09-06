import type { z } from 'zod';
import type {
  entrySchema,
  directEntrySchema,
  moneyEntrySchema,
  adjustSchema,
} from '../schema/saving.schema';
import type { Plan } from '../../plans/types/plan.type';
import type { Save } from '../../../lib/form-types';

export type Entry = z.infer<typeof entrySchema>;

export type MoneyEntryValues = z.infer<typeof moneyEntrySchema>;

export type ContributionValues = z.infer<typeof adjustSchema>;

export interface MoneyEntryFormProps {
  entry?: DirectEntry;
  month: string;
  start: string;
  kind: DirectEntry['kind'];
  save: Save<DirectEntry>;
  cancel: () => void;
}

export interface ContributionFormProps {
  initialScope: 'month' | 'ongoing';
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

export interface ContributionEditor {
  planId: string;
  scope: 'month' | 'ongoing';
  month: string;
  revision: number;
}

export type DirectEntry = z.infer<typeof directEntrySchema>;

export interface SavingsEntriesProps {
  plan: Plan;
  month: string;
  onSaved: (month: string, planId: string) => void;
}

export type MoneyEntryEditor = { revision: number; planId: string } & (
  | { mode: 'create'; kind: DirectEntry['kind'] }
  | { mode: 'edit' | 'delete'; entry: DirectEntry }
);
