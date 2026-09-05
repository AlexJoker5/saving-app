import { Link, NavLink, Outlet } from 'react-router';
import { useWorkspace } from './hooks/useWorkspace';
import type { WorkspaceContext } from './types/workspace.type';
import { routePaths } from '../../routes/routePaths';

export function WorkspacePage() {
  const { data, revision, error, isLoading, isValidating, mutate, commit } =
    useWorkspace();

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
          {data?.demo && (
            <NavLink to={routePaths.setup}>Set up my savings</NavLink>
          )}
        </nav>
      </header>
      <main id="main-content">
        {isLoading && !data && (
          <p role="status" className="panel">
            Loading your workspace…
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
                : 'Browser storage is unavailable. Please try again.'}
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
        {data && (
          <>
            {data.demo ? (
              <aside className="demo-banner">
                <div>
                  <strong>Example workspace</strong>
                  <p>Explore sample numbers, or start with your own savings.</p>
                </div>
                <Link className="button secondary" to={routePaths.setup}>
                  Set up my savings
                </Link>
              </aside>
            ) : (
              <p className="storage-note">
                Stored in this browser · Local workspace
              </p>
            )}
            <Outlet
              context={
                { state: data, revision, commit } satisfies WorkspaceContext
              }
            />
          </>
        )}
      </main>
      <footer>Amounts in MMK · Dates use Myanmar time</footer>
    </div>
  );
}
