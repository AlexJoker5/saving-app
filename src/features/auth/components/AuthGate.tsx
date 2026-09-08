import { Navigate, Outlet, useOutletContext } from 'react-router';
import { useAuthContext } from '../hooks/useAuthContext';
import type { WorkspaceContext } from '../../workspace/types/workspace.type';
import { routePaths } from '../../../routes/routePaths';
export function AuthGate() {
  const auth = useAuthContext();
  const workspace = useOutletContext<WorkspaceContext>();
  if (auth.phase === 'loading') {
    return (
      <p role="status" className="panel">
        Checking your account…
      </p>
    );
  }
  if (
    auth.phase !== 'signed-in' ||
    auth.recovery ||
    !auth.factors.some((factor) => factor.verified)
  ) {
    return <Navigate to={routePaths.account} replace />;
  }

  return <Outlet context={workspace} />;
}
