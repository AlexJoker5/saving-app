import { z } from 'zod';
import { moneySchema, monthSchema, dateSchema } from '../../../lib/validation';

export const entrySchema = z.object({
  id: z.string(),
  date: dateSchema,
  amount: moneySchema.positive(),
  kind: z.enum(['extra', 'withdrawal', 'contribution']),
  note: z.string().max(160),
  expenseId: z.string().optional(),
});

export const moneyEntrySchema = z.object({
  date: dateSchema,
  amount: moneySchema.positive(),
  note: z
    .string()
    .trim()
    .min(1, 'Add a reason so you can trace this record')
    .max(160),
});

export const adjustSchema = z.object({
  month: monthSchema,
  amount: moneySchema,
  scope: z.enum(['month', 'ongoing', 'reset']),
});

export const directEntrySchema = entrySchema.extend({
  ...moneyEntrySchema.shape,
  id: z.string().min(1),
  kind: z.enum(['extra', 'withdrawal']),
  expenseId: z.never().optional(),
});
