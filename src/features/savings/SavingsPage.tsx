import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { routePaths } from '../../routes/routePaths';
import { useWorkspaceContext } from '../workspace/hooks/useWorkspaceContext';
import { SavingsEntries } from './components/SavingsEntries';
import { ContributionForm } from './components/ContributionForm';
import { Modal } from '../../components/ui/Modal';
import { addMonths, currentMonth, monthName, today } from '../../lib/dates';
import { money } from '../../lib/money';
import {
  balanceAt,
  changeContribution,
  nextSchedule,
  timeline,
} from './utils/saving.utils';
import type { ContributionEditor } from './types/saving.type';

export function SavingsPage() {
  const { state, revision, commit } = useWorkspaceContext();
  const [search, setSearch] = useSearchParams();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [editing, setEditing] = useState<ContributionEditor | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const plan = state.plans.find(
    (item) => item.id === (search.get('plan') ?? state.mainId),
  );
  const editingPlan = editing
    ? state.plans.find((item) => item.id === editing.planId)
    : undefined;

  if (!plan) {
    return (
      <p role="alert">
        This savings plan is unavailable.{' '}
        <Link to={routePaths.plans}>View your plans.</Link>
      </p>
    );
  }

  const month = selectedMonth < plan.start ? plan.start : selectedMonth;
  const row = timeline(plan, month).at(-1);
  const upcoming = nextSchedule(plan, month);
  const period =
    month < currentMonth()
      ? 'Past month'
      : month === currentMonth()
        ? 'Current month'
        : 'Projected month';

  if (!row) {
    return <p role="alert">This month is outside your savings timeline.</p>;
  }

  const closeEditor = () => {
    if (!saving) {
      setEditing(null);
    }
  };

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            {plan.id === state.mainId ? 'Main plan' : 'Independent plan'} ·{' '}
            {plan.name}
          </p>
          <h1>Your savings</h1>
        </div>
      </div>
      {plan.id !== state.mainId && (
        <p className="notice">
          You’re editing an independent plan. These changes do not change Main
          or your expense records.{' '}
          <Link to={routePaths.plans}>Compare plans</Link>
        </p>
      )}
      <section className="balance-card" aria-label="Current savings">
        <p>
          {plan.start > currentMonth()
            ? 'Opening balance for your future start'
            : 'Balance today'}
        </p>
        <strong>
          {money(balanceAt(plan))} <span>MMK</span>
        </strong>
        <p>
          {plan.start > currentMonth()
            ? `Starts ${monthName(plan.start)}`
            : `As of ${today()} · excludes later-dated records`}
        </p>
      </section>
      <section className="panel" aria-labelledby="month-heading">
        <div className="section-head">
          <div>
            <p className="eyebrow">{period}</p>
            <h2 id="month-heading">{monthName(month)}</h2>
          </div>
          <div className="month-navigation">
            <button
              className="icon-button"
              aria-label="Previous month"
              disabled={month <= plan.start}
              onClick={() => {
                setSelectedMonth(addMonths(month, -1));
                setMessage('');
              }}
            >
              ←
            </button>
            <label className="sr-only" htmlFor="saving-month">
              View month
            </label>
            <input
              id="saving-month"
              type="month"
              min={plan.start}
              max="2099-12"
              value={month}
              onChange={(event) => {
                const value = event.target.value;
                if (
                  /^20\d{2}-(0[1-9]|1[0-2])$/.test(value) &&
                  value >= plan.start
                ) {
                  setSelectedMonth(value);
                  setMessage('');
                }
              }}
            />
            <button
              className="icon-button"
              aria-label="Next month"
              disabled={month >= '2099-12'}
              onClick={() => {
                setSelectedMonth(addMonths(month, 1));
                setMessage('');
              }}
            >
              →
            </button>
          </div>
        </div>
        <dl className="breakdown">
          <div>
            <dt>Opening balance</dt>
            <dd>{money(row.opening)} MMK</dd>
          </div>
          <div>
            <dt>
              Regular saving <span className="badge">{row.mode}</span>
            </dt>
            <dd>+ {money(row.regular)} MMK</dd>
          </div>
          <div>
            <dt>Extra additions</dt>
            <dd>+ {money(row.extra)} MMK</dd>
          </div>
          <div>
            <dt>Withdrawals</dt>
            <dd>− {money(row.withdrawals)} MMK</dd>
          </div>
          <div className="closing">
            <dt>Month-end balance</dt>
            <dd>{money(row.closing)} MMK</dd>
          </div>
        </dl>
        <p className="muted">
          Month-end totals include all records dated in this month. Automatic
          savings apply at the start of the month.
        </p>
        {row.mode === 'Recorded' ? (
          <p className="notice">
            {plan.id === state.mainId ? (
              <>
                Saving records determine this month’s contribution.{' '}
                <Link to={`${routePaths.expenses}?month=${month}`}>
                  Manage this month’s records in Expenses.
                </Link>
              </>
            ) : (
              <>
                Copied Saving records determine this month’s contribution.
                Current expenses update Main only.{' '}
                <Link to={routePaths.plans}>
                  Review connected records when making this plan Main.
                </Link>
              </>
            )}
          </p>
        ) : (
          <button
            className="button"
            onClick={() => {
              setMessage('');
              setEditing({ month, revision, scope: 'month', planId: plan.id });
            }}
          >
            Adjust this month
          </button>
        )}
        <p className="muted">
          Scheduled saving: {money(row.scheduled)} MMK per month.
          {upcoming
            ? ` Next change: ${money(upcoming.amount)} MMK from ${monthName(upcoming.month)}.`
            : ' No later schedule change is set.'}
        </p>
        <button
          className="button secondary"
          onClick={() => {
            setMessage('');
            setEditing({ month, revision, scope: 'ongoing', planId: plan.id });
          }}
        >
          Change ongoing saving
        </button>
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
      </section>
      <SavingsEntries
        plan={plan}
        month={month}
        onSaved={(savedMonth, savedPlanId) => {
          setSearch({ plan: savedPlanId });
          setSelectedMonth(savedMonth);
          setMessage('');
        }}
      />
      {editing && (
        <Modal
          title={
            editing.scope === 'ongoing'
              ? 'Change ongoing saving'
              : 'Adjust monthly saving'
          }
          close={closeEditor}
        >
          {editingPlan ? (
            <ContributionForm
              plan={editingPlan}
              initialScope={editing.scope}
              month={editing.month}
              cancel={closeEditor}
              save={async (values) => {
                setSaving(true);
                try {
                  await commit(
                    (current) =>
                      changeContribution(current, editing.planId, values),
                    editing.revision,
                    (latestRevision) => {
                      setEditing((current) =>
                        current
                          ? { ...current, revision: latestRevision }
                          : null,
                      );
                    },
                  );
                  setSearch({ plan: editing.planId });
                  setSelectedMonth(values.month);
                  setEditing(null);
                  setMessage(
                    values.scope === 'ongoing'
                      ? `Saved in this browser: ongoing schedule from ${monthName(values.month)}. Month adjustments and Saving records still take precedence.`
                      : `Saved in this browser for ${monthName(values.month)}.`,
                  );
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : (
            <p role="alert">
              This plan no longer exists. Close the form and review your plans.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
