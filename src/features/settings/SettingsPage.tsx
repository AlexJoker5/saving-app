import { useState } from 'react';
import { useNavigate } from 'react-router';
import { BudgetForm } from './components/BudgetForm';
import { useWorkspaceContext } from '../workspace/hooks/useWorkspaceContext';
import { routePaths } from '../../routes/routePaths';

export function SettingsPage() {
  const { state, revision, commit } = useWorkspaceContext();
  const [expectedRevision, setExpectedRevision] = useState(revision);
  const navigate = useNavigate();

  return (
    <section className="panel setup-panel">
      <p className="eyebrow">Your workspace</p>
      <h1>Settings</h1>
      <p className="muted">
        Set the monthly spending budget used across your expense history.
        Changes apply to past, current, and future months.
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
  );
}
