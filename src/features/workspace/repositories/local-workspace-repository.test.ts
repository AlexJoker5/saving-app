import { beforeEach, describe, expect, it } from 'vitest';
import { LocalWorkspaceRepository } from './local-workspace-repository';
import { WorkspaceConflictError } from './workspace-repository';

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>();

  get length() {
    return this.values.size;
  }

  clear() {
    this.values.clear();
  }

  getItem(key: string) {
    return this.values.get(key) ?? null;
  }

  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.values.delete(key);
  }

  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
}

describe('local workspace persistence', () => {
  let storage: MemoryStorage;
  let repository: LocalWorkspaceRepository;

  beforeEach(() => {
    storage = new MemoryStorage();
    repository = new LocalWorkspaceRepository(storage);
  });

  it('loads labelled example data without writing it', async () => {
    const result = await repository.read();

    expect(result.state.demo).toBe(true);
    expect(result.revision).toBe(0);
    expect(storage.length).toBe(0);
  });

  it('persists a whole workspace and advances its revision', async () => {
    const initial = await repository.read();
    const state = { ...initial.state, budget: 800000 };

    await repository.save(state, initial.revision);

    expect(await repository.read()).toEqual({ state, revision: 1 });
  });

  it('rejects a stale write without overwriting the newer record', async () => {
    const initial = await repository.read();
    await repository.save({ ...initial.state, budget: 800000 }, 0);

    await expect(repository.save(initial.state, 0)).rejects.toBeInstanceOf(
      WorkspaceConflictError,
    );
    expect((await repository.read()).state.budget).toBe(800000);
  });

  it('preserves corrupt data and returns an actionable error', async () => {
    storage.setItem(repository.key, '{invalid data');

    await expect(repository.read()).rejects.toThrow('preserved');
    expect(storage.getItem(repository.key)).toBe('{invalid data');
  });

  it('can read data saved before the revision envelope existed', async () => {
    const initial = await repository.read();
    storage.setItem(repository.key, JSON.stringify(initial.state));

    expect(await repository.read()).toEqual(initial);
  });
});
