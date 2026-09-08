import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { routePaths } from '../../../routes/routePaths';
import { useWorkspaceContext } from '../../workspace/hooks/useWorkspaceContext';
import { Modal } from '../../../components/ui/Modal';
import { FormActions } from '../../../components/ui/FormActions';
import { MoneyEntryForm } from './MoneyEntryForm';
import {
  deleteMoneyEntry,
  isDirectEntry,
  saveMoneyEntry,
} from '../utils/saving.utils';
import { money } from '../../../lib/money';
import { monthName, today } from '../../../lib/dates';
import type {
  MoneyEntryEditor,
  SavingsEntriesProps,
} from '../types/saving.type';

export function SavingsEntries({
  plan,
  month,
  onSaved,
  actionsOnly = false,
  initialAdd = false,
}: SavingsEntriesProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const { state, revision, commit } = useWorkspaceContext();
  const [editor, setEditor] = useState<MoneyEntryEditor | null>(() =>
    initialAdd
      ? { mode: 'create', kind: 'extra', revision, planId: plan.id }
      : null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const entries = plan.entries
    .filter((entry) => entry.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const editingPlan = editor
    ? state.plans.find((item) => item.id === editor.planId)
    : undefined;
  const kind = editor?.mode === 'create' ? editor.kind : editor?.entry.kind;
  const entryToDelete =
    editor?.mode === 'delete'
      ? editingPlan?.entries.find((entry) => entry.id === editor.entry.id)
      : undefined;
  const title =
    editor?.mode === 'delete'
      ? 'Delete savings entry?'
      : `${editor?.mode === 'edit' ? 'Edit' : 'Add'} ${kind === 'extra' ? 'extra money' : 'withdrawal'}`;

  const close = () => {
    if (!busy) {
      setEditor(null);
      setError('');
    }
  };
  const finish = () => {
    setEditor(null);
    requestAnimationFrame(() => headingRef.current?.focus());
  };
  const onConflict = (latestRevision: number) => {
    setEditor((current) =>
      current ? { ...current, revision: latestRevision } : null,
    );
  };
  const open = (next: MoneyEntryEditor) => {
    setError('');
    setMessage('');
    setEditor(next);
  };

  return (
    <section
      className={actionsOnly ? 'entry-quick-panel' : 'panel'}
      aria-label="Savings entries"
    >
      <div className="section-head">
        {!actionsOnly && (
          <div>
            <p className="eyebrow">{monthName(month)}</p>
            <h2 ref={headingRef} tabIndex={-1} id="entries-heading">
              Savings entries
            </h2>
          </div>
        )}
        <div className="entry-actions">
          <button
            className="button"
            onClick={() =>
              open({ mode: 'create', kind: 'extra', revision, planId: plan.id })
            }
          >
            Add money
          </button>
          <button
            className="button secondary"
            onClick={() =>
              open({
                mode: 'create',
                kind: 'withdrawal',
                revision,
                planId: plan.id,
              })
            }
          >
            Take out
          </button>
        </div>
      </div>
      {!actionsOnly && (
        <>
          <p className="muted entries-description">
            Extra money and withdrawals change this plan’s balance. Automatic
            monthly saving appears in the breakdown above.
          </p>
          {entries.length === 0 ? (
            <p className="notice">No entries for this month yet.</p>
          ) : (
            <ul className="entry-list">
              {entries.map((entry) => (
                <li key={entry.id}>
                  <div className="entry-details">
                    <strong>
                      {entry.note ||
                        (entry.kind === 'withdrawal'
                          ? 'Withdrawal'
                          : entry.kind === 'extra'
                            ? 'Extra addition'
                            : 'Saving record')}
                    </strong>
                    <p>
                      <time dateTime={entry.date}>{entry.date}</time> ·{' '}
                      {entry.kind === 'withdrawal'
                        ? 'Withdrawal'
                        : entry.kind === 'extra'
                          ? 'Extra addition'
                          : 'Saving record'}
                      {entry.date > today() && (
                        <span className="badge">Planned</span>
                      )}
                    </p>
                    {!isDirectEntry(entry) && (
                      <small className="muted">
                        {plan.id === state.mainId
                          ? 'Managed in expenses'
                          : 'Copied expense record; current expenses update Main only'}{' '}
                        ·{' '}
                        {plan.id === state.mainId && (
                          <Link
                            to={`${routePaths.expenses}?month=${entry.date.slice(0, 7)}`}
                          >
                            View month in expenses
                          </Link>
                        )}
                      </small>
                    )}
                  </div>
                  <strong className="entry-amount">
                    {entry.kind === 'withdrawal' ? '−' : '+'}{' '}
                    {money(entry.amount)} MMK
                  </strong>
                  {isDirectEntry(entry) && (
                    <div className="entry-actions">
                      <button
                        className="button secondary"
                        aria-label={`Edit ${entry.note || 'entry'}`}
                        onClick={() =>
                          open({
                            mode: 'edit',
                            entry,
                            revision,
                            planId: plan.id,
                          })
                        }
                      >
                        Edit
                      </button>
                      <button
                        className="button secondary danger"
                        aria-label={`Delete ${entry.note || 'entry'}`}
                        onClick={() =>
                          open({
                            mode: 'delete',
                            entry,
                            revision,
                            planId: plan.id,
                          })
                        }
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {editor && (
        <Modal
          presentation={editor.mode === 'delete' ? 'dialog' : 'form'}
          title={title}
          description={editingPlan?.name}
          close={close}
        >
          {!editingPlan ? (
            <p role="alert">
              This plan no longer exists. Close the form to review your plans.
            </p>
          ) : editor.mode === 'delete' ? (
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                if (busy) {
                  return;
                }
                setError('');
                setBusy(true);
                try {
                  await commit(
                    (state) =>
                      deleteMoneyEntry(state, editor.planId, editor.entry.id),
                    editor.revision,
                    onConflict,
                  );
                  onSaved(month, editor.planId);
                  finish();
                  setMessage(
                    'Entry deleted. Balances have been recalculated and saved to your account.',
                  );
                } catch (caught) {
                  setError(
                    caught instanceof Error
                      ? caught.message
                      : 'Could not delete. Please try again.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {entryToDelete ? (
                <>
                  <p className="notice">
                    <strong>
                      {entryToDelete.note || 'Savings entry'} ·{' '}
                      {money(entryToDelete.amount)} MMK · {entryToDelete.date}
                    </strong>
                  </p>
                  <p>
                    This removes the entry from this plan and recalculates its
                    balances. This cannot be undone.
                  </p>
                </>
              ) : (
                <p role="alert">
                  This entry no longer exists. Close this dialog to review the
                  latest entries.
                </p>
              )}
              <FormActions
                busy={busy}
                disabled={!entryToDelete || !isDirectEntry(entryToDelete)}
                error={error}
                cancel={close}
                label="Delete entry"
              />
            </form>
          ) : (
            <MoneyEntryForm
              entry={editor.mode === 'edit' ? editor.entry : undefined}
              kind={editor.mode === 'create' ? editor.kind : editor.entry.kind}
              month={month}
              start={editingPlan.start}
              cancel={close}
              save={async (entry) => {
                setBusy(true);
                try {
                  await commit(
                    (state) =>
                      saveMoneyEntry(
                        state,
                        editor.planId,
                        entry,
                        editor.mode === 'edit' ? editor.entry.id : undefined,
                      ),
                    editor.revision,
                    onConflict,
                  );
                  onSaved(entry.date.slice(0, 7), editor.planId);
                  finish();
                  setMessage(
                    'Entry saved to your account. Balances have been recalculated.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
          )}
        </Modal>
      )}
    </section>
  );
}
