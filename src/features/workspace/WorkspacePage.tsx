import {
  authenticationPaths,
  workspaceAuthenticated,
} from '../auth/utils/auth-routing';
import {
  Navigate,
  Outlet,
  useNavigate,
  useLocation,
  matchPath,
} from 'react-router';
import { SWRConfig } from 'swr';
import { useAccountWorkspace } from './hooks/useAccountWorkspace';
import { useAuthContext } from '../auth/hooks/useAuthContext';
import { useAuthAction } from '../auth/hooks/useAuthAction';
import { hasSkippedEnrollment } from '../auth/data/enrollment-choice';
import { AuthGate } from '../auth/components/AuthGate';
import { CloudWorkspaceSetup } from './components/CloudWorkspaceSetup';
import { WorkspaceShell } from './components/WorkspaceShell';
import { cloudWorkspaceEnabled } from '../../lib/supabase';
import type { WorkspaceContext } from './types/workspace.type';
import { routePaths } from '../../routes/routePaths';
const isolatedCache = { provider: () => new Map() };

function WorkspaceData() {
  const {
    data,
    revision,
    error,
    isLoading,
    isValidating,
    mutate,
    commit,
    email,
  } = useAccountWorkspace();
  const auth = useAuthContext();
  const { busy, error: signOutError, act } = useAuthAction();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const setupRoute =
    matchPath({ path: routePaths.setup, end: true }, pathname) !== null;
  const setupComplete = Boolean(data && revision > 0 && !data.demo);
  const loadError = error && (
    <div role="alert" className="notice danger">
      <div>
        <strong>
          {data ? 'Could not refresh your data' : 'Could not load your account'}
        </strong>
        <p>
          {error instanceof Error ? error.message : 'Reconnect and try again.'}
        </p>
        <button
          className="button secondary"
          disabled={isValidating}
          onClick={() => void mutate().catch(() => undefined)}
        >
          {isValidating ? 'Retrying…' : 'Retry connection'}
        </button>
      </div>
    </div>
  );

  if (!data) {
    return (
      <WorkspaceShell>
        {isLoading && (
          <p role="status" className="panel">
            Loading your account…
          </p>
        )}
        {loadError}
        {signOutError && (
          <p role="alert" className="notice danger">
            {signOutError}
          </p>
        )}
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void act(auth.signOut)}
        >
          Sign out on this device
        </button>
      </WorkspaceShell>
    );
  }

  if (!setupComplete) {
    if (!setupRoute) {
      return (
        <WorkspaceShell>
          <Navigate to={routePaths.setup} replace />
        </WorkspaceShell>
      );
    }
    if (
      !error &&
      !auth.factors.some((factor) => factor.verified) &&
      !hasSkippedEnrollment(auth.user?.id ?? '')
    ) {
      return (
        <WorkspaceShell>
          <Navigate to={routePaths.twoFactorSetup} replace />
        </WorkspaceShell>
      );
    }

    return (
      <WorkspaceShell>
        {loadError}
        <CloudWorkspaceSetup
          email={email}
          save={async (next) => {
            await commit(
              () => next,
              revision,
              () => undefined,
            );
            navigate(routePaths.home, { replace: true });
          }}
        />
      </WorkspaceShell>
    );
  }

  if (setupRoute) {
    return (
      <WorkspaceShell>
        <Navigate to={routePaths.home} replace />
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell navigation>
      {loadError}
      <Outlet
        context={
          {
            state: data,
            revision,
            commit,
            destination: `Account for ${email}`,
            storage: 'cloud',
          } satisfies WorkspaceContext
        }
      />
    </WorkspaceShell>
  );
}

export function WorkspacePage() {
  const { pathname } = useLocation();
  const auth = useAuthContext();
  const { busy, error, act } = useAuthAction();
  const authenticationRoute = authenticationPaths.some(
    (path) => matchPath({ path, end: true }, pathname) !== null,
  );

  if (authenticationRoute) {
    return (
      <WorkspaceShell>
        <Outlet />
      </WorkspaceShell>
    );
  }
  if (!workspaceAuthenticated(auth)) {
    return (
      <WorkspaceShell>
        <AuthGate />
      </WorkspaceShell>
    );
  }
  if (!cloudWorkspaceEnabled) {
    return (
      <WorkspaceShell>
        <section className="panel">
          <h1>Account storage unavailable</h1>
          <p>
            Your account data is not available on this deployment. Please try
            again later.
          </p>
          {error && (
            <p role="alert" className="notice danger">
              {error}
            </p>
          )}
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => void act(auth.signOut)}
          >
            Sign out on this device
          </button>
        </section>
      </WorkspaceShell>
    );
  }

  return (
    <SWRConfig
      key={`${auth.user?.id ?? 'signed-out'}:${auth.phase}`}
      value={isolatedCache}
    >
      <WorkspaceData />
    </SWRConfig>
  );
}
