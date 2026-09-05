import type { z } from 'zod';
import type { expenseSchema } from '../schema/expense.schema';
import type { Save } from '../../../lib/form-types';

export type Expense = z.infer<typeof expenseSchema>;

export interface ExpenseFormProps {
  expense?: Expense;
  start: string;
  save: Save<Expense>;
  cancel: () => void;
}
