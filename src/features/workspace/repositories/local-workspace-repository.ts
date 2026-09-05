import { snapshotSchema, stateSchema } from '../schema/workspace.schema';
import { exampleState } from '../data/example-workspace';

import type {
  AppState,
  WorkspaceRepository,
  WorkspaceSnapshot,
} from '../types/workspace.type';
import { WorkspaceConflictError } from './workspace-repository';

const STORAGE_KEY = 'saving.workspace.v1';

export class LocalWorkspaceRepository implements WorkspaceRepository {
  readonly key = STORAGE_KEY;

  constructor(private readonly storage?: Storage) {}

  async read(): Promise<WorkspaceSnapshot> {
    const raw = (this.storage ?? window.localStorage).getItem(this.key);

    if (!raw) {
      return { state: exampleState(), revision: 0 };
    }

    try {
      const value: unknown = JSON.parse(raw);
      const currentFormat = snapshotSchema.safeParse(value);

      if (currentFormat.success) {
        return currentFormat.data;
      }

      // Preserve work saved before the revision envelope was introduced.
      return { state: stateSchema.parse(value), revision: 0 };
    } catch {
      throw new Error(
        'Saved data could not be read. Your browser data has been preserved.',
      );
    }
  }

  async save(
    state: AppState,
    expectedRevision: number,
  ): Promise<WorkspaceSnapshot> {
    const persist = async () => {
      const current = await this.read();

      if (current.revision !== expectedRevision) {
        throw new WorkspaceConflictError();
      }

      const snapshot = {
        state: stateSchema.parse(state),
        revision: current.revision + 1,
      };

      (this.storage ?? window.localStorage).setItem(
        this.key,
        JSON.stringify(snapshot),
      );

      return snapshot;
    };

    if (typeof navigator !== 'undefined' && navigator.locks) {
      return navigator.locks.request(this.key, persist);
    }

    return persist();
  }
}
