import { useEffect } from 'react';
import useSWR from 'swr';
import type { AppState, WorkspaceRepository } from '../types/workspace.type';
import { WorkspaceConflictError } from '../repositories/workspace-repository';

export function useWorkspace(repository: WorkspaceRepository, cloud = false) {
  const result = useSWR(repository.key, () => repository.read(), {
    revalidateOnFocus: true,
    shouldRetryOnError: false,
    refreshInterval: cloud ? 30000 : 0,
    revalidateOnReconnect: true,
  });
  const { mutate } = result;

  useEffect(() => {
    const revalidate = (event: StorageEvent) => {
      if (event.key === repository.key || event.key === null) {
        void mutate().catch(() => undefined);
      }
    };

    window.addEventListener('storage', revalidate);

    return () => window.removeEventListener('storage', revalidate);
  }, [repository.key, mutate]);

  const commit = async (
    update: (state: AppState) => AppState,
    expectedRevision: number,
    onConflict: (latestRevision: number) => void,
  ) => {
    if (!result.data) {
      throw new Error('Wait for your workspace to finish loading.');
    }

    if (result.error) {
      throw new Error(
        'Reload your workspace successfully before saving changes.',
      );
    }

    try {
      const next = update(result.data.state);
      const snapshot = await repository.save(next, expectedRevision);
      await mutate(snapshot, { revalidate: false });
    } catch (error) {
      if (error instanceof WorkspaceConflictError) {
        try {
          const latest = await mutate();
          if (latest) {
            onConflict(latest.revision);
          }
        } catch {
          throw new Error(
            'Your workspace changed, but the latest data could not be loaded. Try loading it again before saving.',
          );
        }
      }

      throw error;
    }
  };

  return {
    ...result,
    data: result.data?.state,
    revision: result.data?.revision ?? 0,
    commit,
  };
}
