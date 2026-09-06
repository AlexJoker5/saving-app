import { useState } from 'react';
import { useWorkspaceContext } from '../workspace/hooks/useWorkspaceContext';
import { SavingsEntries } from './components/SavingsEntries';
import { ContributionForm } from './components/ContributionForm';
import { Modal } from '../../components/ui/Modal';
import { addMonths, currentMonth, monthName, today } from '../../lib/dates';
import { money } from '../../lib/money';
import { balanceAt, changeContribution, timeline } from './utils/saving.utils';
import type { ContributionEditor } from './types/saving.type';

export function SavingsPage() {
  const { state, revision, commit } = useWorkspaceContext();
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [editing, setEditing] = useState<ContributionEditor | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const plan = state.plans.find((item) => item.id === state.mainId);

  if (!plan) {
    return <p role="alert">Your Main savings plan is missing.</p>;
  }

  const month = selectedMonth < plan.start ? plan.start : selectedMonth;
  const row = timeline(plan, month).at(-1);
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
          <p className="eyebrow">Main plan · {plan.name}</p>
          <h1>Your savings</h1>
        </div>
      </div>
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
            Saving records determine this month’s contribution. Editing those
            records will be available with the expenses flow.
          </p>
        ) : (
          <button
            className="button"
            onClick={() => {
              setMessage('');
              setEditing({ month, revision });
            }}
          >
            Adjust this month
          </button>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}
      </section>
      <SavingsEntries
        key={plan.id}
        plan={plan}
        month={month}
        onSaved={(savedMonth) => {
          setSelectedMonth(savedMonth);
          setMessage('');
        }}
      />
      {editing && (
        <Modal title="Adjust monthly saving" close={closeEditor}>
          <ContributionForm
            plan={plan}
            month={editing.month}
            cancel={closeEditor}
            save={async (values) => {
              setSaving(true);
              try {
                await commit(
                  (current) => changeContribution(current, plan.id, values),
                  editing.revision,
                  (latestRevision) => {
                    setEditing((current) =>
                      current ? { ...current, revision: latestRevision } : null,
                    );
                  },
                );
                setSelectedMonth(values.month);
                setEditing(null);
                setMessage(
                  `Saved in this browser for ${monthName(values.month)}.`,
                );
              } finally {
                setSaving(false);
              }
            }}
          />
        </Modal>
      )}
    </>
  );
}
