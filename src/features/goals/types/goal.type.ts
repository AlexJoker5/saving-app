import type { z } from 'zod';
import type { goalSchema } from '../schema/goal.schema';
import type { Save } from '../../../lib/form-types';

export type Goal = z.infer<typeof goalSchema>;

export interface GoalFormProps {
  goal?: Goal;
  save: Save<Goal>;
  cancel: () => void;
}

export type GoalEditor =
  | { mode: 'create'; revision: number }
  | { mode: 'edit' | 'delete'; goal: Goal; revision: number };
