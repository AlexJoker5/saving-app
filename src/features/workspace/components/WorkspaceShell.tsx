import type { ReactNode } from 'react';
import { Link, NavLink, useMatch } from 'react-router';
import {
  Cloud,
  House,
  Wallet,
  Receipt,
  Flag,
  Layers,
  Settings2,
} from 'lucide-react';
import { routePaths } from '../../../routes/routePaths';

export function WorkspaceShell({
  children,
  navigation = false,
}: {
  children: ReactNode;
  navigation?: boolean;
}) {
  const accountRoute = useMatch('/account/*');
  const items = [
    [routePaths.home, House, 'Home'],
    [routePaths.savings, Wallet, 'Saving'],
    [routePaths.expenses, Receipt, 'Expenses'],
    [routePaths.goals, Flag, 'Goals'],
    [routePaths.plans, Layers, 'Plans'],
    [routePaths.settings, Settings2, 'Settings'],
  ] as const;

  return (
    <div className={`app-shell ${navigation ? '' : 'auth-shell'}`}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="app-header">
        {navigation ? (
          <Link className="brand" to={routePaths.home}>
            <Wallet size={19} /> Saving
          </Link>
        ) : (
          <span className="brand">
            <Wallet size={19} /> Saving
          </span>
        )}
        {navigation && (
          <Link
            className="connection-link"
            to={`${routePaths.settings}?section=data`}
            aria-label="Data and connection"
          >
            <Cloud size={21} />
          </Link>
        )}
      </header>
      <main id="main-content">{children}</main>
      {navigation && (
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
