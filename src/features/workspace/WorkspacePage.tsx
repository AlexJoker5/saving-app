import { Link, NavLink, Outlet, useMatch, useNavigate } from 'react-router';
import { SWRConfig } from 'swr';
import { useAccountWorkspace } from './hooks/useAccountWorkspace';
import { useAuthContext } from '../auth/hooks/useAuthContext';
import { AuthGate } from '../auth/components/AuthGate';
import { CloudWorkspaceSetup } from './components/CloudWorkspaceSetup';
import { WorkspaceRestore } from './components/WorkspaceRestore';
import { LocalWorkspaceRecovery } from './components/LocalWorkspaceRecovery';
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
    cloud,
    email,
    canRecoverLocal,
  } = useAccountWorkspace();
  const navigate = useNavigate();
  const storage = cloud ? 'cloud' : 'local';
  const destination = cloud
    ? `Cloud workspace for ${email}`
    : 'Local workspace in this browser';

  return (
    <>
      {isLoading && !data && (
        <p role="status" className="panel">
          Loading your {cloud ? 'cloud ' : ''}workspace…
        </p>
      )}
      {error && (
        <div role="alert" className="panel danger">
          <h1>
            {data
              ? 'Could not refresh your workspace'
              : 'Could not load your workspace'}
          </h1>
          <p>
            {error instanceof Error
              ? error.message
              : 'Storage is unavailable. Please try again.'}
          </p>
          <button
            className="button"
            disabled={isValidating}
            onClick={() => void mutate().catch(() => undefined)}
          >
            {isValidating ? 'Retrying…' : 'Try again'}
          </button>
        </div>
      )}
      {!cloud && (
        <LocalWorkspaceRecovery
          available={canRecoverLocal}
          onRecovered={async (snapshot) => {
            await mutate(snapshot, { revalidate: false });
            navigate(routePaths.savings, { replace: true });
          }}
        />
      )}
      {data &&
        !canRecoverLocal &&
        (cloud && revision === 0 ? (
          <>
            <CloudWorkspaceSetup
              email={email}
              save={async (next) => {
                await commit(
                  () => next,
                  0,
                  () => undefined,
                );
                navigate(routePaths.savings, { replace: true });
              }}
            />
            <WorkspaceRestore
              empty
              workspace={{
                state: data,
                revision,
                commit,
                destination,
                storage,
              }}
              onRestored={() => navigate(routePaths.savings, { replace: true })}
            />
          </>
        ) : (
          <>
            <p className="storage-note">
              {cloud
                ? `Cloud workspace · ${email} · Internet required to save`
                : 'Stored in this browser · Local workspace'}
            </p>
            {cloud && (
              <p className="muted">
                Checks for changes every 30 seconds while visible, and when you
                return or reconnect.
              </p>
            )}
            {data.demo && (
              <aside className="demo-banner">
                <div>
                  <strong>Example workspace</strong>
                  <p>Explore sample numbers, or start with your own savings.</p>
                </div>
                <Link className="button secondary" to={routePaths.setup}>
                  Set up my savings
                </Link>
              </aside>
            )}
            <Outlet
              context={
                {
                  state: data,
                  revision,
                  commit,
                  destination,
                  storage,
                } satisfies WorkspaceContext
              }
            />
          </>
        ))}
    </>
  );
}

export function WorkspacePage() {
  const accountRoute = useMatch(routePaths.account);
  const auth = useAuthContext();
  const blocked =
    auth.phase === 'loading' ||
    auth.phase === 'error' ||
    auth.phase === 'mfa-required' ||
    auth.recovery ||
    (cloudWorkspaceEnabled &&
      auth.phase === 'signed-in' &&
      !auth.factors.some((factor) => factor.verified));

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <Link className="brand" to={routePaths.home}>
          Saving<span>Make room for tomorrow</span>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to={routePaths.savings}>Savings</NavLink>
          <NavLink to={routePaths.expenses}>Expenses</NavLink>
          <NavLink to={routePaths.plans}>Plans</NavLink>
          <NavLink to={routePaths.goals}>Goals</NavLink>
          <NavLink to={routePaths.settings}>Settings</NavLink>
          <NavLink to={routePaths.account}>Account</NavLink>
        </nav>
      </header>
      <main id="main-content">
        <SWRConfig
          key={`${auth.user?.id ?? 'local'}:${auth.phase}`}
          value={isolatedCache}
        >
          {accountRoute ? (
            <Outlet />
          ) : blocked ? (
            <AuthGate />
          ) : (
            <WorkspaceData />
          )}
        </SWRConfig>
      </main>
      <footer>Amounts in MMK · Dates use Myanmar time</footer>
    </div>
  );
}
