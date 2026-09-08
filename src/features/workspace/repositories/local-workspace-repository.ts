import { snapshotSchema, stateSchema } from '../schema/workspace.schema';
import { exampleState } from '../data/example-workspace';

import type {
  AppState,
  WorkspaceRepository,
  WorkspaceSnapshot,
} from '../types/workspace.type';
import { WorkspaceConflictError } from './workspace-repository';

const STORAGE_KEY = 'saving.workspace.v1';
const RECOVERY_PREFIX = `${STORAGE_KEY}.recovery.`;

export class LocalWorkspaceUnreadableError extends Error {
  constructor() {
    super(
      'Saved data could not be read. Your browser data has been preserved.',
    );
    this.name = 'LocalWorkspaceUnreadableError';
  }
}

export class LocalRecoveryConflictError extends Error {
  constructor() {
    super(
      'The local data changed. Review the current unreadable data again before recovering.',
    );
    this.name = 'LocalRecoveryConflictError';
  }
}

function decode(raw: string): WorkspaceSnapshot {
  const value: unknown = JSON.parse(raw);
  const currentFormat = snapshotSchema.safeParse(value);
  if (currentFormat.success) {
    return currentFormat.data;
  }

  // Preserve work saved before the revision envelope was introduced.
  return { state: stateSchema.parse(value), revision: 0 };
}

function recoveryRevision(raw: string) {
  let previous = 0;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      'revision' in value &&
      typeof value.revision === 'number' &&
      Number.isSafeInteger(value.revision) &&
      value.revision >= 0
    ) {
      previous = value.revision;
    }
  } catch {
    // Invalid JSON has no trustworthy revision counter.
  }
  const next = Math.max(Date.now(), previous + 1);
  if (!Number.isSafeInteger(next)) {
    throw new Error(
      'The saved revision is out of range. The original data has not been replaced.',
    );
  }

  return next;
}

export class LocalWorkspaceRepository implements WorkspaceRepository {
  readonly key = STORAGE_KEY;

  constructor(private readonly storage?: Storage) {}

  async read(): Promise<WorkspaceSnapshot> {
    const raw = (this.storage ?? window.localStorage).getItem(this.key);

    if (raw === null) {
      return { state: exampleState(), revision: 0 };
    }

    try {
      return decode(raw);
    } catch {
      throw new LocalWorkspaceUnreadableError();
    }
  }

  readUnreadable(): string {
    const raw = (this.storage ?? window.localStorage).getItem(this.key);
    if (raw === null) {
      throw new Error(
        'Local data is no longer present. Use Try again to load the workspace.',
      );
    }
    try {
      decode(raw);
    } catch {
      return raw;
    }

    throw new Error(
      'Local savings are readable now. Use Try again and restore through Settings.',
    );
  }

  listRecoveryCopies() {
    const storage = this.storage ?? window.localStorage;
    const copies: { key: string; createdAt: string }[] = [];
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(RECOVERY_PREFIX)) {
        copies.push({
          key,
          createdAt: key.slice(
            RECOVERY_PREFIX.length,
            RECOVERY_PREFIX.length + 24,
          ),
        });
      }
    }

    return copies.sort((left, right) => right.key.localeCompare(left.key));
  }

  readRecoveryCopy(key: string): string {
    if (!key.startsWith(RECOVERY_PREFIX)) {
      throw new Error('Choose a preserved local recovery copy.');
    }
    const raw = (this.storage ?? window.localStorage).getItem(key);
    if (raw === null) {
      throw new Error(
        'This preserved copy is no longer available in this browser.',
      );
    }

    return raw;
  }

  async recover(state: AppState, expectedRaw: string, signal: AbortSignal) {
    const next = stateSchema.parse(state);
    if (typeof navigator === 'undefined' || !navigator.locks) {
      throw new Error(
        'Recovery requires a browser with Web Locks support. Download the original data before switching browsers.',
      );
    }

    return navigator.locks.request(this.key, () => {
      if (signal.aborted) {
        throw new Error('Recovery was cancelled before saving.');
      }
      const storage = this.storage ?? window.localStorage;
      if (storage.getItem(this.key) !== expectedRaw) {
        throw new LocalRecoveryConflictError();
      }
      this.readUnreadable();
      const snapshot = { state: next, revision: recoveryRevision(expectedRaw) };
      const serialized = JSON.stringify(snapshot);
      const existingCopy = this.listRecoveryCopies().find(
        (copy) => storage.getItem(copy.key) === expectedRaw,
      );
      const archiveKey =
        existingCopy?.key ??
        `${RECOVERY_PREFIX}${new Date().toISOString()}.${crypto.randomUUID()}`;
      try {
        if (!existingCopy) {
          storage.setItem(archiveKey, expectedRaw);
        }
        if (storage.getItem(archiveKey) !== expectedRaw) {
          throw new Error('Preserved copy verification failed.');
        }
      } catch {
        throw new Error(
          'The original data could not be preserved. Nothing was replaced. Download the original and make browser storage space before retrying.',
        );
      }
      if (storage.getItem(this.key) !== expectedRaw) {
        throw new LocalRecoveryConflictError();
      }
      try {
        storage.setItem(this.key, serialized);
      } catch {
        throw new Error(
          'The replacement could not be saved. The original remains in place and its preserved copy has been kept.',
        );
      }

      return { snapshot, archiveKey };
    });
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
