import { z } from 'zod';
import { moneySchema, dateSchema } from '../../../lib/validation';

export const labels = [
  'Food & drinks',
  'Transport',
  'Shopping',
  'Bills',
  'Housing',
  'Health',
  'Entertainment',
  'Other',
  'Saving',
] as const;
export const expenseSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .refine(
        (id) => !id.startsWith('recurring:'),
        'Recurring occurrences are managed through their rule.',
      ),
    amount: moneySchema.positive('Enter an amount greater than zero'),
    date: dateSchema,
    label: z.enum(labels),
    source: z.enum(['budget', 'savings']),
    note: z.string().trim().max(160),
  })
  .refine((v) => v.label !== 'Saving' || v.source === 'budget', {
    message: 'A saving contribution must come from this month’s budget.',
    path: ['source'],
  });
