import { z } from 'zod';
import { moneySchema, monthSchema } from '../../../lib/validation';
import { entrySchema } from '../../savings/schema/saving.schema';

import { recurringExpenseSchema } from '../../expenses/schema/recurring-expense.schema';

export const planSchema = z
  .object({
    id: z.string(),
    name: z.string().trim().min(1).max(40),
    sourceId: z.string().optional(),
    start: monthSchema,
    opening: moneySchema,
    schedules: z.array(z.object({ month: monthSchema, amount: moneySchema })),
    overrides: z.record(z.string(), moneySchema),
    entries: z.array(entrySchema),
    recurringExpenses: z.array(recurringExpenseSchema).optional(),
  })
  .refine((plan) => {
    const rules = plan.recurringExpenses ?? [];

    return (
      rules.every((rule) => rule.start >= plan.start) &&
      new Set(rules.map((rule) => rule.id)).size === rules.length
    );
  }, 'Recurring expenses must have unique identities and start on or after the plan.');

export const nameSchema = z.object({
  name: z.string().trim().min(1, 'Give your plan a name').max(40),
});
