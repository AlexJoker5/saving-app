import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { SetupForm } from './components/SetupForm';
import { useWorkspaceContext } from '../workspace/hooks/useWorkspaceContext';
import { routePaths } from '../../routes/routePaths';

export function SetupPage() {
  const { state, revision, commit } = useWorkspaceContext();
  const [expectedRevision, setExpectedRevision] = useState(revision);
  const navigate = useNavigate();

  if (!state.demo) {
    return <Navigate to={routePaths.savings} replace />;
  }

  return (
    <section className="panel setup-panel">
      <p className="eyebrow">A fresh start</p>
      <h1>Set up your savings</h1>
      <p className="muted">
        Enter your starting point. You can adjust individual months as you go.
      </p>
      <SetupForm
        cancel={() => navigate(routePaths.savings)}
        save={async (next) => {
          await commit(
            (current) => {
              if (!current.demo) {
                throw new Error(
                  'Your savings have already been set up. Reload to view them.',
                );
              }

              return next;
            },
            expectedRevision,
            setExpectedRevision,
          );
          navigate(routePaths.savings, { replace: true });
        }}
      />
    </section>
  );
}
