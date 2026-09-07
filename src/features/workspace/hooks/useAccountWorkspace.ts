import { useMemo } from 'react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { cloudWorkspaceEnabled } from '../../../lib/supabase';
import { CloudWorkspaceRepository } from '../repositories/cloud-workspace-repository';
import { LocalWorkspaceRepository } from '../repositories/local-workspace-repository';
import { useWorkspace } from './useWorkspace';

export function useAccountWorkspace() {
  const auth = useAuthContext();
  const userId =
    cloudWorkspaceEnabled && auth.phase === 'signed-in'
      ? auth.user?.id
      : undefined;
  const repository = useMemo(
    () =>
      userId
        ? new CloudWorkspaceRepository(userId)
        : new LocalWorkspaceRepository(),
    [userId],
  );

  return {
    ...useWorkspace(repository, Boolean(userId)),
    cloud: Boolean(userId),
    email: auth.user?.email ?? '',
  };
}
