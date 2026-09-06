import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useWorkspaceContext } from '../workspace/hooks/useWorkspaceContext';
import { ExpenseForm } from './components/ExpenseForm';
import { labels } from './schema/expense.schema';
import {
  deleteExpense,
  expenseTotals,
  saveExpense,
} from './utils/expense.utils';
import type { ExpenseEditor } from './types/expense.type';
import { Modal } from '../../components/ui/Modal';
import { FormActions } from '../../components/ui/FormActions';
import { addMonths, currentMonth, monthName, today } from '../../lib/dates';
import { money } from '../../lib/money';
import { monthSchema } from '../../lib/validation';

export function ExpensesPage() {
  const { state, revision, commit } = useWorkspaceContext();
  const [search, setSearch] = useSearchParams();
  const [editor, setEditor] = useState<ExpenseEditor | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const main = state.plans.find((plan) => plan.id === state.mainId);

  if (!main) {
    return <p role="alert">Your Main savings plan is missing.</p>;
  }

  const parsedMonth = monthSchema.safeParse(search.get('month'));
  const selectedMonth = parsedMonth.success ? parsedMonth.data : currentMonth();
  const month = selectedMonth < main.start ? main.start : selectedMonth;
  const expenses = state.expenses
    .filter((expense) => expense.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
  const totals = expenseTotals(expenses);
  const label = labels.find((value) => value === search.get('label')) ?? '';
  const requestedSource = search.get('source');
  const source =
    requestedSource === 'budget' || requestedSource === 'savings'
      ? requestedSource
      : '';
  const hasFilters = label !== '' || source !== '';
  const visibleExpenses = expenses.filter(
    (expense) =>
      (!label || expense.label === label) &&
      (!source || expense.source === source),
  );
  const updateSearch = (changes: Record<string, string | null>) => {
    setSearch((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) {
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      }

      return next;
    });
  };
  const deleting =
    editor?.mode === 'delete'
      ? state.expenses.find((expense) => expense.id === editor.expense.id)
      : undefined;
  const selectMonth = (next: string) => {
    if (monthSchema.safeParse(next).success && next >= main.start) {
      updateSearch({ month: next });
      setMessage('');
    }
  };
  const open = (next: ExpenseEditor) => {
    setEditor(next);
    setError('');
    setMessage('');
  };
  const close = () => {
    if (!busy) {
      setEditor(null);
      setError('');
    }
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
        <p className="eyebrow">Everyday spending and saving</p>
        <h1>Expenses</h1>
      </div>
      <section className="panel" aria-labelledby="expense-month-heading">
        <div className="section-head">
          <h2 id="expense-month-heading">{monthName(month)}</h2>
          <div className="month-navigation">
            <button
              className="icon-button"
              aria-label="Previous month"
              disabled={month <= main.start}
              onClick={() => selectMonth(addMonths(month, -1))}
            >
              ←
            </button>
            <label className="sr-only" htmlFor="expense-month">
              View expense month
            </label>
            <input
              id="expense-month"
              type="month"
              min={main.start}
              max="2099-12"
              value={month}
              onChange={(event) => selectMonth(event.target.value)}
            />
            <button
              className="icon-button"
              aria-label="Next month"
              disabled={month >= '2099-12'}
              onClick={() => selectMonth(addMonths(month, 1))}
            >
              →
            </button>
          </div>
        </div>
        <dl className="breakdown">
          <div>
            <dt>Spending from budget</dt>
            <dd>{money(totals.budgetSpending)} MMK</dd>
          </div>
          <div>
            <dt>Spending from savings</dt>
            <dd>{money(totals.savingsSpending)} MMK</dd>
          </div>
          <div>
            <dt>Recorded saving</dt>
            <dd>{money(totals.recordedSaving)} MMK</dd>
          </div>
        </dl>
        <p className="muted">
          Spending budget: {money(state.budget)} MMK per month. Going over
          budget never withdraws savings automatically. Totals include planned
          records for this month; Saving records are shown separately from
          spending. These totals cover the full month, including records hidden
          by the filters below.
        </p>
      </section>
      <section className="panel" aria-labelledby="expense-records-heading">
        <div className="section-head">
          <h2 id="expense-records-heading" ref={heading} tabIndex={-1}>
            Expense records
          </h2>
          <button
            className="button"
            onClick={() =>
              open({ mode: 'create', revision, mainId: state.mainId })
            }
          >
            Add record
          </button>
        </div>
        <div
          className="form-grid"
          role="group"
          aria-label="Filter expense records"
        >
          <label className="field">
            <span>Label</span>
            <select
              value={label}
              onChange={(event) => {
                updateSearch({ label: event.target.value });
                setMessage('');
              }}
            >
              <option value="">All labels</option>
              {labels.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Paid from</span>
            <select
              value={source}
              onChange={(event) => {
                updateSearch({ source: event.target.value });
                setMessage('');
              }}
            >
              <option value="">All sources</option>
              <option value="budget">This month’s budget</option>
              <option value="savings">Savings</option>
            </select>
          </label>
        </div>
        <div className="section-head">
          <p role="status" className="muted">
            Showing {visibleExpenses.length} of {expenses.length} records for{' '}
            {monthName(month)}.
          </p>
          {hasFilters && (
            <button
              className="button secondary"
              onClick={() => {
                updateSearch({ label: null, source: null });
                setMessage('');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
        {expenses.length === 0 ? (
          <p className="notice">No records for this month yet.</p>
        ) : visibleExpenses.length === 0 ? (
          <p className="notice">
            No records match these filters. Change a filter or clear filters to
            see all records for this month.
          </p>
        ) : (
          <ul className="entry-list expense-list">
            {visibleExpenses.map((expense) => (
              <li key={expense.id}>
                <div className="entry-details">
                  <strong>{expense.note || expense.label}</strong>
                  <p>
                    <time dateTime={expense.date}>{expense.date}</time> ·{' '}
                    {expense.label}
                    {expense.date > today() && (
                      <span className="badge">Planned</span>
                    )}
                  </p>
                  <small className="muted">
                    {expense.label === 'Saving'
                      ? 'Saving contribution · From budget · Linked to Main savings'
                      : expense.source === 'savings'
                        ? 'Paid from savings · Linked to Main savings'
                        : 'Paid from budget'}
                  </small>
                </div>
                <strong className="entry-amount">
                  {money(expense.amount)} MMK
                </strong>
                <div className="entry-actions">
                  <button
                    className="button secondary"
                    aria-label={`Edit ${expense.note || expense.label} on ${expense.date}`}
                    onClick={() =>
                      open({
                        mode: 'edit',
                        expense,
                        revision,
                        mainId: state.mainId,
                      })
                    }
                  >
                    Edit
                  </button>
                  <button
                    className="button secondary danger"
                    aria-label={`Delete ${expense.note || expense.label} on ${expense.date}`}
                    onClick={() =>
                      open({
                        mode: 'delete',
                        expense,
                        revision,
                        mainId: state.mainId,
                      })
                    }
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
      </section>
      {editor && (
        <Modal
          title={
            editor.mode === 'delete'
              ? 'Delete expense record?'
              : editor.mode === 'edit'
                ? 'Edit record'
                : 'Add record'
          }
          close={close}
        >
          {editor.mode === 'delete' ? (
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
                      if (current.mainId !== editor.mainId) {
                        throw new Error(
                          'Main changed while this dialog was open. Close it and review the current plan before deleting.',
                        );
                      }

                      return deleteExpense(current, editor.expense.id);
                    },
                    editor.revision,
                    onConflict,
                  );
                  finish(
                    'Record deleted. Expenses and linked Main savings have been saved in this browser.',
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
              {deleting ? (
                <>
                  <p className="notice">
                    <strong>
                      {deleting.note || deleting.label} ·{' '}
                      {money(deleting.amount)} MMK · {deleting.date}
                    </strong>
                  </p>
                  <p>
                    {deleting.label === 'Saving'
                      ? 'This removes the record and its connected contribution. If this is the last Saving record for the month, the month adjustment or scheduled saving applies again.'
                      : deleting.source === 'savings'
                        ? 'This removes the expense and its connected Main savings withdrawal, then recalculates the balances.'
                        : 'This removes the expense from your budget spending records.'}{' '}
                    This cannot be undone.
                  </p>
                </>
              ) : (
                <p role="alert">
                  This record no longer exists. Close this dialog to review the
                  latest records.
                </p>
              )}
              <FormActions
                busy={busy}
                disabled={!deleting}
                error={error}
                cancel={close}
                label="Delete record"
              />
            </form>
          ) : (
            <ExpenseForm
              expense={editor.mode === 'edit' ? editor.expense : undefined}
              start={main.start}
              month={month}
              cancel={close}
              save={async (expense) => {
                setBusy(true);
                try {
                  await commit(
                    (current) => {
                      if (current.mainId !== editor.mainId) {
                        throw new Error(
                          'Main changed while this form was open. Close it and review the current plan before saving.',
                        );
                      }

                      return saveExpense(
                        current,
                        expense,
                        editor.mode === 'edit' ? editor.expense.id : undefined,
                      );
                    },
                    editor.revision,
                    onConflict,
                  );
                  const hiddenByFilters =
                    (label !== '' && expense.label !== label) ||
                    (source !== '' && expense.source !== source);
                  updateSearch({
                    month: expense.date.slice(0, 7),
                    ...(hiddenByFilters ? { label: null, source: null } : {}),
                  });
                  finish(
                    'Record saved in this browser. Expenses and linked Main savings are up to date.' +
                      (hiddenByFilters
                        ? ' Filters cleared to show the saved record.'
                        : ''),
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
