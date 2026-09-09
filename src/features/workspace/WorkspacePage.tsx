import {
  authenticationPaths,
  workspaceAuthenticated,
} from '../auth/utils/auth-routing';
import {
  Link,
  NavLink,
  Outlet,
  useMatch,
  useNavigate,
  useLocation,
  matchPath,
} from 'react-router';
import {
  Cloud,
  House,
  Wallet,
  Receipt,
  Flag,
  Layers,
  Settings2,
} from 'lucide-react';
import { SWRConfig } from 'swr';
import { useAccountWorkspace } from './hooks/useAccountWorkspace';
import { useAuthContext } from '../auth/hooks/useAuthContext';
import { AuthGate } from '../auth/components/AuthGate';
import { CloudWorkspaceSetup } from './components/CloudWorkspaceSetup';
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
  const navigate = useNavigate();

  return (
    <>
      {isLoading && !data && (
        <p role="status" className="panel">
          Loading your account…
        </p>
      )}
      {error && (
        <div role="alert" className="notice danger">
          <div>
            <strong>
              {data
                ? 'Could not refresh your data'
                : 'Could not load your account'}
            </strong>
            <p>
              {error instanceof Error
                ? error.message
                : 'Reconnect and try again.'}
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
      )}
      {data &&
        (revision === 0 ? (
          <CloudWorkspaceSetup
            email={email}
            save={async (next) => {
              await commit(
                () => next,
                0,
                () => undefined,
              );
              navigate(routePaths.home, { replace: true });
            }}
          />
        ) : (
          <>
            {data.demo && (
              <aside className="demo-banner">
                <div>
                  <strong>Example workspace</strong>
                  <p>Start with your own savings when you’re ready.</p>
                </div>
                <Link className="button secondary" to={routePaths.setup}>
                  Set up savings
                </Link>
              </aside>
            )}
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
          </>
        ))}
    </>
  );
}

export function WorkspacePage() {
  const accountRoute = useMatch('/account/*');
  const { pathname } = useLocation();
  const authenticationRoute = authenticationPaths.some(
    (path) => matchPath({ path, end: true }, pathname) !== null,
  );
  const auth = useAuthContext();
  const ready = workspaceAuthenticated(auth);
  const showNavigation = ready && !authenticationRoute;
  const items = [
    [routePaths.home, House, 'Home'],
    [routePaths.savings, Wallet, 'Saving'],
    [routePaths.expenses, Receipt, 'Expenses'],
    [routePaths.goals, Flag, 'Goals'],
    [routePaths.plans, Layers, 'Plans'],
    [routePaths.settings, Settings2, 'Settings'],
  ] as const;

  return (
    <div className={`app-shell ${showNavigation ? '' : 'auth-shell'}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        <Link className="brand" to={ready ? routePaths.home : routePaths.login}>
          <Wallet size={19} /> Saving
        </Link>
        {showNavigation && (
          <Link
            className="connection-link"
            to={`${routePaths.settings}?section=data`}
            aria-label="Data and connection"
          >
            <Cloud size={21} />
          </Link>
        )}
      </header>
      <main id="main-content">
        <SWRConfig
          key={`${auth.user?.id ?? 'signed-out'}:${auth.phase}`}
          value={isolatedCache}
        >
          {accountRoute || authenticationRoute ? (
            <Outlet />
          ) : !ready ? (
            <AuthGate />
          ) : !cloudWorkspaceEnabled ? (
            <section className="panel">
              <h1>Account storage unavailable</h1>
              <p>
                Your account data is not available on this deployment. Please
                try again later.
              </p>
              <Link to={routePaths.account}>Account settings</Link>
            </section>
          ) : (
            <WorkspaceData />
          )}
        </SWRConfig>
      </main>
      {showNavigation && (
        <nav className="bottom-navigation" aria-label="Main navigation">
          {items.map(([to, Icon, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === routePaths.home}
              className={({ isActive }) =>
                isActive || (to === routePaths.settings && accountRoute)
                  ? 'active'
                  : ''
              }
            >
              <span>
                <Icon size={21} aria-hidden="true" />
              </span>
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
