import { z } from 'zod';
import { moneySchema, monthSchema } from '../../../lib/validation';

export const setupSchema = z.object({
  start: monthSchema,
  opening: moneySchema,
  monthly: moneySchema,
  budget: moneySchema,
});

export const budgetSchema = z.object({ budget: moneySchema });
