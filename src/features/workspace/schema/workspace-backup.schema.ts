import { z } from 'zod';
import { snapshotSchema } from './workspace.schema';

export const MAX_BACKUP_BYTES = 20 * 1024 * 1024;

export const workspaceBackupSchema = z.object({
  format: z.literal('saving-workspace-backup'),
  version: z.literal(1),
  exportedAt: z.iso.datetime(),
  snapshot: snapshotSchema,
});
