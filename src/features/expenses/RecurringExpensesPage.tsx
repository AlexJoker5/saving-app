import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, Plus, Repeat2 } from 'lucide-react';
import { Modal } from '../../components/ui/Modal';
import { MonthNavigation } from '../../components/ui/MonthNavigation';
import { currentMonth, monthName } from '../../lib/dates';
import { isDisplayMonth } from '../../lib/display-month';
import { monthSchema } from '../../lib/validation';
import { money } from '../../lib/money';
import { id } from '../../lib/id';
import { useWorkspaceContext } from '../workspace/hooks/useWorkspaceContext';
import { RecurringExpenseForm } from './components/RecurringExpenseForm';
import { RecurringRuleHistory } from './components/RecurringRuleHistory';
import {
  recurringTerms,
  saveRecurringExpense,
} from './utils/recurring-expense.utils';
import type { RecurringExpense } from './types/recurring-expense.type';

type Editor = {
  rule?: RecurringExpense;
  ruleId: string;
  month: string;
  planId: string;
  mainId: string;
  revision: number;
};
export function RecurringExpensesPage() {
  const { state, revision, commit } = useWorkspaceContext();
  const { planId } = useParams();
  const [search, setSearch] = useSearchParams();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const plan = state.plans.find(
    (item) => item.id === (planId ?? search.get('plan') ?? state.mainId),
  );
  const editingPlan = state.plans.find((item) => item.id === editor?.planId);
  if (!plan) {
    return (
      <section className="panel">
        <h1>Plan unavailable</h1>
        <Link to="/plans">Back to Plans</Link>
      </section>
    );
  }
  const requested = search.get('month') ?? currentMonth();
  const month =
    isDisplayMonth(requested) && requested >= plan.start
      ? requested
      : plan.start;
  const writable = monthSchema.safeParse(month).success;
  const rules = plan.recurringExpenses ?? [];
  const fromSavings = search.get('from') === 'savings';
  const back = fromSavings
    ? `/savings?plan=${encodeURIComponent(plan.id)}&month=${month}`
    : Boolean(planId) || search.has('plan')
      ? `/plans/${encodeURIComponent(plan.id)}?month=${month}`
      : `/expenses?month=${month}`;
  const open = (rule?: RecurringExpense) => {
    setMessage('');
    setEditor({
      rule,
      ruleId: rule?.id ?? id(),
      month,
      planId: plan.id,
      mainId: state.mainId,
      revision,
    });
  };
  const close = () => {
    if (!busy) {
      setEditor(null);
    }
  };

  return (
    <>
      <Link className="back-link" to={back}>
        <ArrowLeft size={19} />
        {fromSavings
          ? 'Saving'
          : Boolean(planId) || search.has('plan')
            ? 'Plan details'
            : 'Expenses'}
      </Link>
      <div className="page-heading">
        <h1>Recurring expenses</h1>
        <p className="muted">
          {plan.name} · Monthly defaults for rent, bills, and more.
        </p>
      </div>
      <MonthNavigation
        month={month}
        min={plan.start}
        onChange={(month) => {
          setSearch((current) => {
            const next = new URLSearchParams(current);
            next.set('month', month);

            return next;
          });
          setMessage('');
        }}
      />
      <p className="notice">
        {plan.id === state.mainId
          ? 'Applied automatically to each month’s expenses. Savings-funded rules also update Main’s balance.'
          : 'These rules belong to this independent plan. Main expenses stay unchanged.'}{' '}
        Future dates are planned amounts, not payment confirmations.
      </p>
      {rules.length === 0 && (
        <section className="panel empty-panel">
          <span className="icon-tile">
            <Repeat2 size={24} />
          </span>
          <h2>Make room for your regular expenses</h2>
          <p className="muted">
            Set a monthly amount once, then adjust one month or change the
            defaults going forward.
          </p>
        </section>
      )}
      {rules.map((rule) => {
        const terms =
          recurringTerms(rule, month) ?? recurringTerms(rule, rule.start);
        const future = month < rule.start;
        const adjusted = Object.hasOwn(rule.overrides, month);

        return (
          <section className="panel" key={rule.id}>
            <div className="section-head">
              <h2>{terms?.name}</h2>
              <span className="badge">
                {future
                  ? 'Not started'
                  : terms?.amount === 0
                    ? adjusted
                      ? 'Skipped'
                      : 'Paused'
                    : adjusted
                      ? 'Adjusted'
                      : 'Monthly'}
              </span>
            </div>
            <p className="large-money">
              {money(terms?.amount ?? 0)} <small>MMK</small>
            </p>
            <p className="muted">
              {future ? `Starts ${monthName(rule.start)}` : monthName(month)} ·{' '}
              {terms?.source === 'savings' ? 'Savings' : 'Budget'} ·{' '}
              {terms?.label} · Day {terms?.day}
            </p>
            <div className="stack-actions">
              <button
                className="button secondary full-width"
                disabled={!writable}
                onClick={() => open(rule)}
              >
                Adjust recurring expense
              </button>
            </div>
            <RecurringRuleHistory rule={rule} />
          </section>
        );
      })}
      <button
        className="button full-width"
        disabled={!writable}
        onClick={() => open()}
      >
        <Plus size={18} />
        Add recurring expense
      </button>
      {!writable && (
        <p className="muted">
          You can view future months here. Editing dates outside 2000–2099 is
          not supported yet.
        </p>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {editor && (
        <Modal
          title={
            editor.rule ? 'Adjust recurring expense' : 'New recurring expense'
          }
          presentation="form"
          close={close}
        >
          {editingPlan ? (
            <RecurringExpenseForm
              plan={editingPlan}
              rule={
                editingPlan.recurringExpenses?.find(
                  (rule) => rule.id === editor.ruleId,
                ) ?? editor.rule
              }
              ruleId={editor.ruleId}
              month={editor.month}
              cancel={close}
              save={async (values) => {
                setBusy(true);
                try {
                  await commit(
                    (current) => {
                      if (current.mainId !== editor.mainId) {
                        throw new Error(
                          'Main changed while this form was open. Close it and review the current plan before saving.',
                        );
                      }

                      return saveRecurringExpense(
                        current,
                        editor.planId,
                        editor.ruleId,
                        values,
                        Boolean(editor.rule),
                      );
                    },
                    editor.revision,
                    (revision) =>
                      setEditor((current) =>
                        current ? { ...current, revision } : null,
                      ),
                  );
                  setEditor(null);
                  setSearch((current) => {
                    const next = new URLSearchParams(current);
                    next.set('month', values.month);

                    return next;
                  });
                  setMessage(
                    'Recurring expense saved to your account. Monthly totals and plan balances have been recalculated.',
                  );
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : (
            <p role="alert">
              This plan no longer exists. Close this form and review your plans.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
