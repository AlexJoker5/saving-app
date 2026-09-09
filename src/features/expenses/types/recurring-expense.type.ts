import type { z } from 'zod';
import type {
  recurringExpenseSchema,
  recurringTermsSchema,
  recurringFormSchema,
} from '../schema/recurring-expense.schema';
import type { Expense } from './expense.type';

export type RecurringExpense = z.infer<typeof recurringExpenseSchema>;
export type RecurringTerms = z.infer<typeof recurringTermsSchema>;
export type RecurringValues = z.infer<typeof recurringFormSchema>;
export type MonthlyExpense = Expense & { recurringId?: string };
