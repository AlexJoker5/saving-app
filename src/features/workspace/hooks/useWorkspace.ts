import { useEffect } from 'react';
import useSWR from 'swr';
import type { AppState, WorkspaceRepository } from '../types/workspace.type';
import { WorkspaceConflictError } from '../repositories/workspace-repository';

export function useWorkspace(repository: WorkspaceRepository) {
  const result = useSWR(repository.key, () => repository.read(), {
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });
  const { mutate } = result;

  useEffect(() => {
    const revalidate = (event: StorageEvent) => {
      if (event.key === repository.key) {
        void mutate();
      }
    };

    window.addEventListener('storage', revalidate);

    return () => window.removeEventListener('storage', revalidate);
  }, [repository.key, mutate]);

  const commit = async (update: (state: AppState) => AppState) => {
    if (!result.data) {
      throw new Error('Wait for your workspace to finish loading.');
    }

    try {
      const next = update(result.data.state);
      const snapshot = await repository.save(next, result.data.revision);
      await mutate(snapshot, { revalidate: false });
    } catch (error) {
      if (error instanceof WorkspaceConflictError) {
        await mutate();
      }

      throw error;
    }
  };

  return { ...result, data: result.data?.state, commit };
}
