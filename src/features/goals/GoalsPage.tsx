import { useRef, useState } from 'react';
import { useWorkspaceContext } from '../workspace/hooks/useWorkspaceContext';
import { GoalForm } from './components/GoalForm';
import { GoalCard } from './components/GoalCard';
import { deleteGoal, saveGoal } from './utils/goal.utils';
import type { GoalEditor } from './types/goal.type';
import { Modal } from '../../components/ui/Modal';
import { FormActions } from '../../components/ui/FormActions';
import { money } from '../../lib/money';

export function GoalsPage() {
  const { state, revision, commit } = useWorkspaceContext();
  const [planId, setPlanId] = useState<string | null>(null);
  const [editor, setEditor] = useState<GoalEditor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const selectedPlanId =
    state.plans.find((plan) => plan.id === planId)?.id ?? state.mainId;
  const selectedGoal =
    editor && editor.mode !== 'create'
      ? state.goals.find((goal) => goal.id === editor.goal.id)
      : undefined;
  const close = () => {
    if (!busy) {
      setEditor(null);
      setError('');
    }
  };
  const open = (next: GoalEditor) => {
    setEditor(next);
    setError('');
    setMessage('');
  };
  const finish = (text: string) => {
    setEditor(null);
    setMessage(text);
    requestAnimationFrame(() => heading.current?.focus());
  };
  const onConflict = (latestRevision: number) => {
    setEditor((current) =>
      current ? { ...current, revision: latestRevision } : null,
    );
  };

  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Make room for what matters</p>
        <h1 ref={heading} tabIndex={-1}>
          Your goals
        </h1>
        <p className="muted">
          See when each plan’s monthly closing balance could cover your target.
          Goals are independent: they do not reserve or deduct money.
        </p>
      </div>
      <section className="panel" aria-label="Goal forecast options">
        <div className="section-head">
          <label className="field">
            <span>Forecast using</span>
            <select
              value={selectedPlanId}
              onChange={(event) => setPlanId(event.target.value)}
            >
              {state.plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                  {plan.id === state.mainId ? ' · Main' : ''}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button"
            onClick={() => open({ mode: 'create', revision })}
          >
            Create goal
          </button>
        </div>
        {planId !== null && planId !== selectedPlanId && (
          <p role="status" className="notice">
            The selected plan was removed. Showing Main instead.
          </p>
        )}
        <p className="muted">
          Each forecast starts at the later of the goal or plan start and looks
          ahead up to 120 months, within the plan’s 100-year timeline. Existing
          savings count toward the target. Past qualifying dates do not confirm
          today’s available balance, and later withdrawals can change
          affordability.
        </p>
      </section>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {state.goals.length === 0 ? (
        <section className="panel">
          <h2>What would you like to save for?</h2>
          <p className="muted">
            Create your first goal with a target amount and start month to
            compare your plans.
          </p>
        </section>
      ) : (
        <div className="plans-grid">
          {state.goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              plans={state.plans}
              selectedPlanId={selectedPlanId}
              mainId={state.mainId}
              edit={() => open({ mode: 'edit', goal, revision })}
              remove={() => open({ mode: 'delete', goal, revision })}
            />
          ))}
        </div>
      )}
      {editor && (
        <Modal
          title={
            editor.mode === 'create'
              ? 'Create goal'
              : editor.mode === 'edit'
                ? 'Edit goal'
                : 'Delete goal?'
          }
          close={close}
        >
          {editor.mode !== 'create' && !selectedGoal ? (
            <p role="alert">
              This goal no longer exists. Close this dialog to review your
              goals.
            </p>
          ) : editor.mode === 'delete' ? (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (busy) {
                  return;
                }
                setBusy(true);
                setError('');
                try {
                  await commit(
                    (latest) => deleteGoal(latest, editor.goal.id),
                    editor.revision,
                    onConflict,
                  );
                  finish('Goal deleted.');
                } catch (failure) {
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : 'Could not delete this goal. Try again.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              <p>
                Delete “{selectedGoal?.name}” (
                {money(selectedGoal?.amount ?? 0)} MMK)? This removes the goal.
                Your plans and savings stay as they are.
              </p>
              <FormActions
                busy={busy}
                error={error}
                cancel={close}
                label="Delete goal"
              />
            </form>
          ) : (
            <GoalForm
              goal={editor.mode === 'edit' ? editor.goal : undefined}
              cancel={close}
              save={async (goal) => {
                setBusy(true);
                try {
                  await commit(
                    (latest) =>
                      saveGoal(
                        latest,
                        goal,
                        editor.mode === 'edit' ? editor.goal.id : undefined,
                      ),
                    editor.revision,
                    onConflict,
                  );
                  finish(
                    editor.mode === 'edit' ? 'Goal updated.' : 'Goal created.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}
        </Modal>
      )}
    </>
  );
}
