import { SetupForm } from '../../settings/components/SetupForm';
import type { AppState } from '../types/workspace.type';
import { Link, useNavigate } from 'react-router';
import { routePaths } from '../../../routes/routePaths';
export function CloudWorkspaceSetup({
  email,
  save,
}: {
  email: string;
  save: (state: AppState) => Promise<void>;
}) {
  const navigate = useNavigate();

  return (
    <section className="panel setup-panel">
      <p className="eyebrow">Make room for tomorrow</p>
      <h1>Set up your savings</h1>
      <p className="muted">
        Choose your starting balance and monthly saving. Your data will be saved
        to {email}.
      </p>
      <SetupForm cancel={() => navigate(routePaths.account)} save={save} />
      <Link className="text-link" to={routePaths.account}>
        Account settings
      </Link>
    </section>
  );
}
