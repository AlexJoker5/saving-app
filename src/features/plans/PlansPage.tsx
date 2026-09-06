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
import { balanceAt, timeline } from '../savings/utils/saving.utils';
import type { PlanEditor } from './types/plan.type';
import { Modal } from '../../components/ui/Modal';
import { FormActions } from '../../components/ui/FormActions';
import { currentMonth, monthName } from '../../lib/dates';
import { monthSchema } from '../../lib/validation';
import { money } from '../../lib/money';
import { routePaths } from '../../routes/routePaths';

export function PlansPage() {
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
  const accepted = acceptedRevision === revision;
  const earlierExpenses =
    selected &&
    state.expenses.some((expense) => expense.date.slice(0, 7) < selected.start);
  const mainClosing = main ? timeline(main, month).at(-1)?.closing : undefined;
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
      <div className="page-heading">
        <p className="eyebrow">Explore your possibilities</p>
        <h1 ref={heading} tabIndex={-1}>
          Your plans
        </h1>
        <p className="muted">
          Main connects to your expense records. Copies are independent, so you
          can try a different saving schedule without changing Main.
        </p>
      </div>
      <section className="panel" aria-label="Compare plans">
        <label className="field">
          <span>Compare month-end balances</span>
          <input
            type="month"
            value={month}
            min="2000-01"
            max="2099-12"
            onChange={(event) => {
              if (monthSchema.safeParse(event.target.value).success) {
                setMonth(event.target.value);
              }
            }}
          />
        </label>
        <p className="muted">
          Comparing {monthName(month)}. Projections include all records dated in
          that month.
        </p>
      </section>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <div className="plans-grid">
        {state.plans.map((plan) => {
          const isMain = plan.id === state.mainId;
          const closing = timeline(plan, month).at(-1)?.closing;
          const difference =
            closing !== undefined && mainClosing !== undefined
              ? closing - mainClosing
              : undefined;
          const source = state.plans.find((item) => item.id === plan.sourceId);
          const conflictCount = isMain
            ? 0
            : promotionConflicts(state, plan).length;

          return (
            <article className="panel plan-card" key={plan.id}>
              <div className="section-head">
                <h2>{plan.name}</h2>
                <span className="badge">
                  {isMain ? 'Main' : 'Independent plan'}
                </span>
              </div>
              <p className="muted">
                Starts {monthName(plan.start)}
                {plan.sourceId
                  ? ` · Copied from ${source?.name ?? 'a removed plan'}`
                  : ''}
              </p>
              <dl className="breakdown">
                <div>
                  <dt>
                    {plan.start > currentMonth()
                      ? 'Opening balance'
                      : 'Balance today'}
                  </dt>
                  <dd>{money(balanceAt(plan))} MMK</dd>
                </div>
                <div>
                  <dt>{monthName(month)} closing</dt>
                  <dd>
                    {closing === undefined
                      ? 'Before plan start'
                      : `${money(closing)} MMK`}
                  </dd>
                </div>
                {!isMain && difference !== undefined && (
                  <div>
                    <dt>Difference from Main</dt>
                    <dd>
                      {difference > 0 ? '+' : ''}
                      {money(difference)} MMK
                    </dd>
                  </div>
                )}
              </dl>
              {conflictCount > 0 && (
                <p className="notice">
                  {conflictCount} linked expense{' '}
                  {conflictCount === 1 ? 'difference' : 'differences'} to review
                  before making this plan Main.
                </p>
              )}
              <div className="entry-actions">
                <Link
                  className="button"
                  to={`${routePaths.savings}?plan=${encodeURIComponent(plan.id)}`}
                >
                  View / edit
                </Link>
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
                      className="button secondary"
                      onClick={() => open({ mode: 'promote', plan, revision })}
                    >
                      Make Main
                    </button>
                    <button
                      className="button secondary danger"
                      onClick={() => open({ mode: 'delete', plan, revision })}
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {editor && (
        <Modal
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
                        ? 'Independent snapshot saved in this browser.'
                        : 'Plan name saved in this browser.',
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
                      if (hasConflicts && !accepted) {
                        throw new Error(
                          'Review and accept the connected expense updates first.',
                        );
                      }

                      return promote(
                        hasConflicts
                          ? reconcilePlan(current, currentPlan.id)
                          : current,
                        currentPlan.id,
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
                      (conflicts.length > 0 && !accepted)))
                }
              />
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
