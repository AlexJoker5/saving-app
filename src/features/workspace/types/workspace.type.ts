import type { z } from 'zod';
import type { stateSchema } from '../schema/workspace.schema';

export type AppState = z.infer<typeof stateSchema>;

export interface WorkspaceSnapshot {
  state: AppState;
  revision: number;
}

export interface WorkspaceRepository {
  readonly key: string;
  read(): Promise<WorkspaceSnapshot>;
  save(state: AppState, expectedRevision: number): Promise<WorkspaceSnapshot>;
}

export interface WorkspaceContext {
  state: AppState;
  revision: number;
  commit: (
    update: (state: AppState) => AppState,
    expectedRevision: number,
    onConflict: (latestRevision: number) => void,
  ) => Promise<void>;
}
