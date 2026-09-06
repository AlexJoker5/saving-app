import type { z } from 'zod';
import type { expenseSchema } from '../schema/expense.schema';
import type { Save } from '../../../lib/form-types';

export type Expense = z.infer<typeof expenseSchema>;

export interface ExpenseFormProps {
  expense?: Expense;
  start: string;
  month: string;
  save: Save<Expense>;
  cancel: () => void;
}

export type ExpenseEditor = { revision: number; mainId: string } & (
  { mode: 'create' } | { mode: 'edit' | 'delete'; expense: Expense }
);
