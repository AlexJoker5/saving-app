import { useMemo } from 'react';
import { useAuthContext } from '../../auth/hooks/useAuthContext';
import { cloudWorkspaceEnabled } from '../../../lib/supabase';
import { CloudWorkspaceRepository } from '../repositories/cloud-workspace-repository';
import {
  LocalWorkspaceRepository,
  LocalWorkspaceUnreadableError,
} from '../repositories/local-workspace-repository';
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

  const workspace = useWorkspace(repository, Boolean(userId));

  return {
    ...workspace,
    canRecoverLocal:
      !userId && workspace.error instanceof LocalWorkspaceUnreadableError,
    cloud: Boolean(userId),
    email: auth.user?.email ?? '',
  };
}
