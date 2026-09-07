import { Link, Navigate, Outlet, useOutletContext } from 'react-router';
import { useAuthContext } from '../hooks/useAuthContext';
import type { WorkspaceContext } from '../../workspace/types/workspace.type';
import { cloudWorkspaceEnabled } from '../../../lib/supabase';
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
    auth.phase === 'mfa-required' ||
    auth.recovery ||
    (cloudWorkspaceEnabled &&
      auth.phase === 'signed-in' &&
      !auth.factors.some((factor) => factor.verified))
  ) {
    return <Navigate to={routePaths.account} replace />;
  }
  if (auth.phase === 'error') {
    return (
      <section className="panel">
        <h1>Account check unavailable</h1>
        <p role="alert">{auth.error}</p>
        <Link className="button" to={routePaths.account}>
          Review account
        </Link>
      </section>
    );
  }

  return <Outlet context={workspace} />;
}
