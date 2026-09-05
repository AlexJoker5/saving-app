import { z } from 'zod';
import { moneySchema } from '../../../lib/validation';
import { expenseSchema } from '../../expenses/schema/expense.schema';
import { planSchema } from '../../plans/schema/plan.schema';
import { goalSchema } from '../../goals/schema/goal.schema';

export const stateSchema = z
  .object({
    version: z.literal(1),
    demo: z.boolean(),
    mainId: z.string(),
    budget: moneySchema,
    plans: z.array(planSchema).min(1),
    expenses: z.array(expenseSchema),
    goals: z.array(goalSchema),
  })
  .refine(
    (s) => s.plans.some((p) => p.id === s.mainId),
    'Main plan is missing',
  );

export const snapshotSchema = z.object({
  state: stateSchema,
  revision: z.number().int().nonnegative(),
});
