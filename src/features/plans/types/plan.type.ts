import type { z } from 'zod';
import type { planSchema, nameSchema } from '../schema/plan.schema';
import type { AppState } from '../../workspace/types/workspace.type';
import type { Save } from '../../../lib/form-types';

export type Plan = z.infer<typeof planSchema>;

export type SnapshotValues = z.infer<typeof nameSchema>;

export interface SnapshotFormProps {
  mode?: 'snapshot' | 'rename';
  initialName?: string;
  save: Save<string>;
  cancel: () => void;
}

export interface PlanEditor {
  mode: 'snapshot' | 'rename' | 'delete' | 'promote';
  plan: Plan;
  revision: number;
}

export interface PromotionReviewProps {
  plan: Plan;
  state: AppState;
  accepted: boolean;
  setAccepted: (accepted: boolean) => void;
  disabled: boolean;
}
