import { useState } from 'react';
import { LocalWorkspaceRepository } from '../repositories/local-workspace-repository';
import type { WorkspaceSnapshot } from '../types/workspace.type';
const repository = new LocalWorkspaceRepository();

export function useLocalImport() {
  const [snapshot, setSnapshot] = useState<WorkspaceSnapshot | null>(null);
  const review = async () => {
    const next = await repository.read();
    if (next.state.demo) {
      setSnapshot(null);
      throw new Error(
        'There is no personal local workspace to import. Start fresh instead.',
      );
    }
    setSnapshot(next);
  };
  const readReviewed = async () => {
    if (!snapshot) {
      throw new Error('Review your local savings before importing.');
    }
    const current = await repository.read();
    if (JSON.stringify(current) !== JSON.stringify(snapshot)) {
      setSnapshot(null);
      throw new Error(
        'Local savings changed since your review. Review them again before importing.',
      );
    }

    return current.state;
  };

  return { snapshot, review, readReviewed };
}
