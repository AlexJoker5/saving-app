import type { z } from 'zod';
import type { planSchema, nameSchema } from '../schema/plan.schema';
import type { Save } from '../../../lib/form-types';

export type Plan = z.infer<typeof planSchema>;

export type SnapshotValues = z.infer<typeof nameSchema>;

export interface SnapshotFormProps {
  save: Save<string>;
  cancel: () => void;
}
