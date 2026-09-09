import { z } from 'zod';
import { moneySchema, monthSchema } from '../../../lib/validation';
import { labels } from './expense.schema';

export const recurringLabels = labels.filter((label) => label !== 'Saving');
export const recurringTermsSchema = z.object({
  name: z.string().trim().min(1, 'Enter an expense name').max(80),
  amount: moneySchema,
  day: z.number().int().min(1).max(31),
  label: z.enum(recurringLabels),
  source: z.enum(['budget', 'savings']),
});
export const recurringExpenseSchema = z
  .object({
    id: z.uuid(),
    start: monthSchema,
    schedules: z
      .array(recurringTermsSchema.extend({ month: monthSchema }))
      .min(1),
    overrides: z.record(monthSchema, recurringTermsSchema),
  })
  .refine(
    (rule) =>
      rule.schedules.some((schedule) => schedule.month === rule.start) &&
      rule.schedules.every((schedule) => schedule.month >= rule.start) &&
      new Set(rule.schedules.map((schedule) => schedule.month)).size ===
        rule.schedules.length &&
      Object.keys(rule.overrides).every((month) => month >= rule.start),
    'Recurring schedules must start with the rule and use unique valid months.',
  );
export const recurringFormSchema = recurringTermsSchema.extend({
  month: monthSchema,
  scope: z.enum(['month', 'ongoing', 'reset']),
});
