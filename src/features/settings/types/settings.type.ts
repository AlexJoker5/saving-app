import type { z } from 'zod';
import type { AppState } from '../../workspace/types/workspace.type';
import type { Save } from '../../../lib/form-types';
import type { setupSchema, budgetSchema } from '../schema/settings.schema';

export type SetupValues = z.infer<typeof setupSchema>;

export type BudgetValues = z.infer<typeof budgetSchema>;

export interface BudgetFormProps {
  budget: number;
  save: Save<number>;
  cancel: () => void;
}

export interface SetupFormProps {
  save: Save<AppState>;
  cancel: () => void;
}
