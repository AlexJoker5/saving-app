import { recurringRulesDiffer } from '../expenses/utils/recurring-expense.utils';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useWorkspaceContext } from '../workspace/hooks/useWorkspaceContext';
import { SnapshotForm } from './components/SnapshotForm';
import { PromotionReview } from './components/PromotionReview';
import {
  deletePlan,
  promote,
  promotionConflicts,
  reconcilePlan,
  renamePlan,
  snapshot,
} from './utils/plan.utils';
import { projectedMonth } from './utils/projection.utils';
import { MonthNavigation } from '../../components/ui/MonthNavigation';
import { ArrowRight, Columns2 } from 'lucide-react';
import type { PlanEditor } from './types/plan.type';
import { Modal } from '../../components/ui/Modal';
import { FormActions } from '../../components/ui/FormActions';
import { currentMonth, monthName } from '../../lib/dates';
import { money } from '../../lib/money';
import { routePaths } from '../../routes/routePaths';

export function PlansPage({ managePlanId }: { managePlanId?: string }) {
  const { state, revision, commit } = useWorkspaceContext();
  const [month, setMonth] = useState(currentMonth);
  const [editor, setEditor] = useState<PlanEditor | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptedRevision, setAcceptedRevision] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const main = state.plans.find((plan) => plan.id === state.mainId);
  const selected = editor
    ? state.plans.find((plan) => plan.id === editor.plan.id)
    : undefined;
  const conflicts = selected ? promotionConflicts(state, selected) : [];
  const recurringChanged = selected
    ? recurringRulesDiffer(state, selected)
    : false;
  const accepted = acceptedRevision === revision;
  const earlierExpenses =
    selected &&
    state.expenses.some((expense) => expense.date.slice(0, 7) < selected.start);
  const mainClosing = main ? projectedMonth(main, month)?.closing : undefined;
  const close = () => {
    if (!busy) {
      setEditor(null);
      setError('');
    }
  };
  const open = (next: PlanEditor) => {
    setEditor(next);
    setAcceptedRevision(null);
    setError('');
    setMessage('');
  };
  const finish = (text: string) => {
    setEditor(null);
    setMessage(text);
    requestAnimationFrame(() => heading.current?.focus());
  };
  const onConflict = (latestRevision: number) => {
    setAcceptedRevision(null);
    setEditor((current) =>
      current ? { ...current, revision: latestRevision } : null,
    );
  };

  return (
    <>
      {!managePlanId && (
        <>
          <div className="page-heading">
            <p className="eyebrow">Make room for tomorrow</p>
            <h1 ref={heading} tabIndex={-1}>
              Plans
            </h1>
            <p className="muted">Explore a different way to reach tomorrow.</p>
          </div>
          <Link
            className="button full-width"
            to={`${routePaths.plans}/compare`}
          >
            <Columns2 size={18} />
            Compare timelines
          </Link>
          <h2>Closing balances</h2>
          <MonthNavigation
            month={month}
            min={
              state.plans.map((plan) => plan.start).sort()[0] ?? currentMonth()
            }
            onChange={setMonth}
          />
        </>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <div className="plans-grid">
        {state.plans
          .filter((plan) => !managePlanId || plan.id === managePlanId)
          .map((plan) => {
            const isMain = plan.id === state.mainId;
            const closing = projectedMonth(plan, month)?.closing;
            const difference =
              closing !== undefined && mainClosing !== undefined
                ? closing - mainClosing
                : undefined;

            return (
              <article className="panel plan-card" key={plan.id}>
                <div className="section-head">
                  <h2>{plan.name}</h2>
                  <span className="badge">
                    {isMain ? 'Main' : 'Independent plan'}
                  </span>
                </div>
                {!managePlanId && (
                  <>
                    <p className="large-money">
                      {closing === undefined
                        ? 'Before plan start'
                        : money(closing)}{' '}
                      {closing !== undefined && <small>MMK</small>}
                    </p>
                    <p className="muted">
                      {isMain
                        ? 'Your active expense-linked plan'
                        : difference === undefined
                          ? `Starts ${monthName(plan.start)}`
                          : `${money(Math.abs(difference))} MMK ${difference < 0 ? 'below' : 'above'} Main`}
                    </p>
                    <Link
                      className="button secondary full-width plan-open"
                      to={`${routePaths.plans}/${encodeURIComponent(plan.id)}?month=${month}`}
                    >
                      View plan <ArrowRight size={18} />
                    </Link>
                  </>
                )}
                {managePlanId && (
                  <div className="entry-actions plan-management">
                    <button
                      className="button secondary"
                      onClick={() => open({ mode: 'snapshot', plan, revision })}
                    >
                      Create snapshot
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => open({ mode: 'rename', plan, revision })}
                    >
                      Rename
                    </button>
                    {!isMain && (
                      <>
                        <button
                          className="button secondary danger"
                          onClick={() =>
                            open({ mode: 'delete', plan, revision })
                          }
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
                {managePlanId && !isMain && (
                  <section className="plan-promotion">
                    <h3>Make this your Main plan</h3>
                    <p className="muted">
                      Review how this plan will connect to your expenses before
                      switching. Your current Main will remain an independent
                      plan.
                    </p>
                    <button
                      className="button full-width"
                      onClick={() => open({ mode: 'promote', plan, revision })}
                    >
                      Review making this Main
                    </button>
                  </section>
                )}
              </article>
            );
          })}
      </div>
      {!managePlanId && main && (
        <button
          className="button full-width"
          onClick={() => open({ mode: 'snapshot', plan: main, revision })}
        >
          Create a plan
        </button>
      )}
      {editor && (
        <Modal
          presentation={
            editor.mode === 'snapshot' || editor.mode === 'rename'
              ? 'form'
              : 'dialog'
          }
          title={
            editor.mode === 'snapshot'
              ? 'Create independent snapshot'
              : editor.mode === 'rename'
                ? 'Rename plan'
                : editor.mode === 'delete'
                  ? 'Delete plan?'
                  : 'Review Main plan change'
          }
          close={close}
        >
          {!selected ? (
            <p role="alert">
              This plan no longer exists. Close the dialog to review your plans.
            </p>
          ) : editor.mode === 'snapshot' || editor.mode === 'rename' ? (
            <>
              <p className="muted">Selected plan: {selected.name}</p>
              <SnapshotForm
                mode={editor.mode}
                initialName={editor.mode === 'rename' ? editor.plan.name : ''}
                cancel={close}
                save={async (name) => {
                  setBusy(true);
                  try {
                    await commit(
                      (current) =>
                        editor.mode === 'snapshot'
                          ? snapshot(current, editor.plan.id, name)
                          : renamePlan(current, editor.plan.id, name),
                      editor.revision,
                      onConflict,
                    );
                    finish(
                      editor.mode === 'snapshot'
                        ? 'Independent snapshot saved to your account.'
                        : 'Plan name saved to your account.',
                    );
                  } finally {
                    setBusy(false);
                  }
                }}
              />
            </>
          ) : (
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
                    (current) => {
                      if (editor.mode === 'delete') {
                        return deletePlan(current, editor.plan.id);
                      }
                      const currentPlan = current.plans.find(
                        (plan) => plan.id === editor.plan.id,
                      );
                      if (!currentPlan) {
                        throw new Error('This plan no longer exists.');
                      }
                      const hasConflicts =
                        promotionConflicts(current, currentPlan).length > 0;
                      if (
                        (hasConflicts ||
                          recurringRulesDiffer(current, currentPlan)) &&
                        !accepted
                      ) {
                        throw new Error(
                          'Review and accept the connected expense updates first.',
                        );
                      }

                      return promote(
                        hasConflicts
                          ? reconcilePlan(current, currentPlan.id)
                          : current,
                        currentPlan.id,
                        accepted,
                      );
                    },
                    editor.revision,
                    onConflict,
                  );
                  finish(
                    editor.mode === 'delete'
                      ? 'Plan deleted. Main and your expense records are unchanged.'
                      : 'Main plan changed. The previous Main remains as an independent plan.',
                  );
                } catch (caught) {
                  setError(
                    caught instanceof Error
                      ? caught.message
                      : 'Could not save. Please try again.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {editor.mode === 'delete' ? (
                <p>
                  Delete <strong>{selected.name}</strong> and its copied
                  timeline? Other plans and expense records stay in place. This
                  cannot be undone.
                </p>
              ) : (
                <>
                  <PromotionReview
                    plan={selected}
                    state={state}
                    accepted={accepted}
                    setAccepted={(value) =>
                      setAcceptedRevision(value ? revision : null)
                    }
                    disabled={busy}
                  />
                  {earlierExpenses && (
                    <p role="alert" className="notice danger">
                      This plan starts after existing expense records and cannot
                      become Main.
                    </p>
                  )}
                </>
              )}
              {selected.id === state.mainId && (
                <p role="alert" className="notice">
                  This plan is already Main. Close this dialog and review your
                  plans.
                </p>
              )}
              <FormActions
                busy={busy}
                error={error}
                cancel={close}
                label={editor.mode === 'delete' ? 'Delete plan' : 'Make Main'}
                disabled={
                  selected.id === state.mainId ||
                  (editor.mode === 'promote' &&
                    (Boolean(earlierExpenses) ||
                      ((conflicts.length > 0 || recurringChanged) &&
                        !accepted)))
                }
              />
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
