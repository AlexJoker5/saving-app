import { z } from 'zod';
import { moneySchema, monthSchema } from '../../../lib/validation';

export const goalSchema = z.object({
  id: z.string(),
  name: z.string().trim().min(1, 'Give your goal a name').max(60),
  amount: moneySchema.positive(),
  start: monthSchema,
  note: z.string().max(160),
});
