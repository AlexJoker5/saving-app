import { useMemo } from 'react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { CloudWorkspaceRepository } from '../repositories/cloud-workspace-repository';
import { useWorkspace } from './useWorkspace';
export function useAccountWorkspace() {
  const auth = useAuthContext();
  const userId = auth.user?.id ?? '';
  const repository = useMemo(
    () => new CloudWorkspaceRepository(userId),
    [userId],
  );
  const workspace = useWorkspace(repository, true);

  return { ...workspace, cloud: true, email: auth.user?.email ?? '' };
}
