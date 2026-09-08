import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { BudgetForm } from './components/BudgetForm';
import { WorkspaceBackup } from '../workspace/components/WorkspaceBackup';
import { WorkspaceRestore } from '../workspace/components/WorkspaceRestore';
import { LocalRecoveryCopies } from '../workspace/components/LocalRecoveryCopies';
import { useWorkspaceContext } from '../workspace/hooks/useWorkspaceContext';
import { routePaths } from '../../routes/routePaths';

export function SettingsPage() {
  const workspace = useWorkspaceContext();
  const { state, revision, commit } = workspace;
  const [expectedRevision, setExpectedRevision] = useState(revision);
  const navigate = useNavigate();

  return (
    <>
      <section className="panel setup-panel">
        <p className="eyebrow">Your workspace</p>
        <h1>Settings</h1>
        <p className="muted">
          Set the monthly spending budget used across your expense history.
          Changes apply to past, current, and future months.
        </p>
        <p>
          <Link to={routePaths.account}>
            Account and Google Authenticator settings
          </Link>
        </p>
        <BudgetForm
          budget={state.budget}
          cancel={() => navigate(routePaths.expenses)}
          save={async (budget) => {
            await commit(
              (current) => ({ ...current, budget }),
              expectedRevision,
              setExpectedRevision,
            );
            navigate(routePaths.expenses);
          }}
        />
      </section>
      {workspace.storage === 'local' && <LocalRecoveryCopies />}
      <WorkspaceBackup />
      <WorkspaceRestore
        workspace={workspace}
        onRestored={() => navigate(routePaths.savings, { replace: true })}
      />
    </>
  );
}
