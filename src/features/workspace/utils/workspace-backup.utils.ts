import { snapshotSchema } from '../schema/workspace.schema';
import type { WorkspaceSnapshot } from '../types/workspace.type';

export function createWorkspaceBackup(snapshot: WorkspaceSnapshot) {
  const validated = snapshotSchema.parse(snapshot);
  const exportedAt = new Date().toISOString();
  const backup = {
    format: 'saving-workspace-backup',
    version: 1,
    exportedAt,
    snapshot: validated,
  };
  const label = validated.state.demo ? 'saving-example' : 'saving-workspace';

  return {
    filename: `${label}-${exportedAt.replace(/[:.]/g, '-')}.json`,
    contents: `${JSON.stringify(backup, null, 2)}\n`,
  };
}
