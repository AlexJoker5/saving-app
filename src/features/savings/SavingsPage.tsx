import { RecurringMonthExpenses } from '../expenses/components/RecurringMonthExpenses';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  ArrowUpRight,
  ChevronRight,
  ChevronLeft,
  Wallet,
  Repeat2,
} from 'lucide-react';
import { routePaths } from '../../routes/routePaths';
import { useWorkspaceContext } from '../workspace/hooks/useWorkspaceContext';
import { SavingsEntries } from './components/SavingsEntries';
import { ContributionForm } from './components/ContributionForm';
import { Modal } from '../../components/ui/Modal';
import { MonthNavigation } from '../../components/ui/MonthNavigation';
import { isDisplayMonth, shiftMonth } from '../../lib/display-month';
import { currentMonth, monthName } from '../../lib/dates';
import { monthSchema } from '../../lib/validation';
import { money } from '../../lib/money';
import { changeContribution } from './utils/saving.utils';
import { projectedMonth } from '../plans/utils/projection.utils';
import { PlansPage } from '../plans/PlansPage';
import type { ContributionEditor } from './types/saving.type';
export function SavingsPage() {
  const { state, revision, commit } = useWorkspaceContext();
  const { planId, monthId } = useParams();
  const [search, setSearch] = useSearchParams();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<ContributionEditor | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const plan = state.plans.find(
    (item) => item.id === (planId ?? search.get('plan') ?? state.mainId),
  );
  const editingPlan = editing
    ? state.plans.find((item) => item.id === editing.planId)
    : undefined;
  if (!plan) {
    return (
      <section className="panel">
        <h1>Plan unavailable</h1>
        <Link to={routePaths.plans}>Back to Plans</Link>
      </section>
    );
  }
  const requested = monthId ?? search.get('month') ?? currentMonth();
  const month =
    isDisplayMonth(requested) && requested >= plan.start
      ? requested
      : plan.start;
  const row = projectedMonth(plan, month);
  if (!row) {
    return <p role="alert">Choose a valid month.</p>;
  }
  const base = planId
    ? `${routePaths.plans}/${encodeURIComponent(plan.id)}`
    : routePaths.savings;
  const monthLink = (value: string) =>
    `${base}/months/${value}${planId ? '' : `?plan=${encodeURIComponent(plan.id)}`}`;
  const changeMonth = (value: string) => {
    setMessage('');
    if (monthId) {
      navigate(monthLink(value));
    } else {
      setSearch({ ...(planId ? {} : { plan: plan.id }), month: value });
    }
  };
  const windowMonth = search.get('window') ?? '';
  const first =
    isDisplayMonth(windowMonth) && windowMonth >= plan.start
      ? windowMonth
      : month;
  const months = Array.from({ length: 6 }, (_, i) =>
    shiftMonth(first, i),
  ).filter(isDisplayMonth);
  const writableMonth = monthSchema.safeParse(month).success;
  const back =
    search.get('from') === 'compare'
      ? `${routePaths.plans}/compare?month=${search.get('window') ?? month}`
      : `${base}?month=${month}${planId ? '' : `&plan=${encodeURIComponent(plan.id)}`}`;
  const close = () => {
    if (!saving) {
      setEditing(null);
    }
  };

  return (
    <>
      {(planId || monthId) && (
        <Link className="back-link" to={monthId ? back : routePaths.plans}>
          <ArrowLeft size={19} />
          {monthId
            ? search.get('from') === 'compare'
              ? 'Compare timelines'
              : planId
                ? 'Plan details'
                : 'Saving'
            : 'Plans'}
        </Link>
      )}
      <div className="page-heading">
        {!planId && !monthId && (
          <p className="eyebrow">Make room for tomorrow</p>
        )}
        <h1>{monthId ? 'Month details' : planId ? plan.name : 'Savings'}</h1>
        {(planId || monthId) && (
          <p className="muted">
            {monthId
              ? `${monthName(month)} · ${plan.name}`
              : plan.id === state.mainId
                ? 'Your active plan, connected to expenses.'
                : 'Your own scenario. Changes stay in this plan.'}
          </p>
        )}
      </div>
      {!monthId && (
        <>
          {planId ? (
            <p>
              <span className="badge">
                {plan.id === state.mainId ? 'Main' : 'Independent plan'}
              </span>
            </p>
          ) : (
            <label className="field plan-select">
              <span>Viewing plan</span>
              <select
                value={plan.id}
                onChange={(event) =>
                  setSearch({ plan: event.target.value, month })
                }
              >
                {state.plans.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {item.id === state.mainId ? ' · Main' : ''}
                  </option>
                ))}
              </select>
            </label>
          )}
          <MonthNavigation
            month={month}
            min={plan.start}
            onChange={changeMonth}
          />
          <section className="balance-card">
            <p>
              {month > currentMonth()
                ? 'Projected closing balance'
                : 'Closing balance'}
            </p>
            <strong>
              {money(row.closing)} <span>MMK</span>
            </strong>
            <Link className="balance-link" to={monthLink(month)}>
              See month breakdown <ArrowUpRight size={18} />
            </Link>
          </section>
          {!planId && writableMonth && (
            <SavingsEntries
              key={`${plan.id}:actions`}
              plan={plan}
              month={month}
              actionsOnly
              initialAdd={search.get('action') === 'add'}
              onSaved={changeMonth}
            />
          )}
          <div className="list-panel">
            <div className="navigation-row">
              <span className="icon-tile">
                <Repeat2 size={20} />
              </span>
              <span>
                <strong>Monthly saving</strong>
                <small>
                  {row.mode} · {monthName(month)}
                </small>
              </span>
              <b>{money(row.regular)} MMK</b>
            </div>
          </div>
          <div className="section-head">
            <h2>Monthly timeline</h2>
            <span className="muted">MMK</span>
          </div>
          <p className="muted">
            {monthName(first)} – {monthName(months.at(-1) ?? first)}
          </p>
          <div className="list-panel timeline-list">
            {months.map((value) => (
              <Link
                className={`navigation-row ${value === month ? 'selected-month' : ''}`}
                key={value}
                to={monthLink(value)}
              >
                <span className="timeline-dot" />
                <span>
                  <strong>{monthName(value)}</strong>
                  <small>
                    {value > currentMonth()
                      ? 'Projected closing'
                      : 'Month-end balance'}
                  </small>
                </span>
                <b>{money(projectedMonth(plan, value)?.closing ?? 0)}</b>
                <ChevronRight size={18} />
              </Link>
            ))}
          </div>
          <div className="quick-actions">
            <button
              className="button secondary"
              disabled={first === plan.start}
              onClick={() =>
                changeMonth(
                  shiftMonth(first, -6) < plan.start
                    ? plan.start
                    : shiftMonth(first, -6),
                )
              }
            >
              <ChevronLeft size={18} />
              Earlier
            </button>
            <button
              className="button secondary"
              disabled={!isDisplayMonth(shiftMonth(first, 6))}
              onClick={() => changeMonth(shiftMonth(first, 6))}
            >
              Next months
              <ChevronRight size={18} />
            </button>
          </div>
          <p className="muted">
            Keep browsing future months, or jump directly to a month and year.
          </p>
          <Link
            className="button secondary full-width"
            to={
              planId
                ? `/plans/${encodeURIComponent(plan.id)}/recurring?month=${month}`
                : `/expenses/recurring?month=${month}&plan=${encodeURIComponent(plan.id)}&from=savings`
            }
          >
            Manage this plan’s recurring expenses
          </Link>
          {planId && <PlansPage managePlanId={plan.id} />}
        </>
      )}
      {monthId && (
        <>
          <div className="list-panel">
            <div className="navigation-row">
              <span className="icon-tile">
                <Wallet size={20} />
              </span>
              <span>
                <strong>Opening balance</strong>
                <small>Start of the month</small>
              </span>
              <b>{money(row.opening)}</b>
            </div>
          </div>
          <section className="panel">
            <div className="section-head">
              <h2>Regular saving</h2>
              <span className="badge">{row.mode}</span>
            </div>
            <p className="large-money positive">
              {money(row.regular)} <small>MMK</small>
            </p>
            <p className="muted">Scheduled: {money(row.scheduled)} MMK</p>
            {writableMonth ? (
              <div className="stack-actions">
                <button
                  className="button secondary"
                  disabled={row.mode === 'Recorded'}
                  onClick={() =>
                    setEditing({
                      month,
                      revision,
                      scope: 'month',
                      planId: plan.id,
                    })
                  }
                >
                  Adjust monthly saving
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    setEditing({
                      month,
                      revision,
                      scope: 'ongoing',
                      planId: plan.id,
                    })
                  }
                >
                  Change ongoing schedule
                </button>
              </div>
            ) : (
              <p className="muted">
                This projected month is available to view. Editing dates outside
                2000–2099 is not supported yet.
              </p>
            )}
          </section>
          <section className="panel">
            <dl className="breakdown">
              <div>
                <dt>Extra additions</dt>
                <dd className="positive">+{money(row.extra)} MMK</dd>
              </div>
              <div>
                <dt>Withdrawals</dt>
                <dd className="negative">−{money(row.withdrawals)} MMK</dd>
              </div>
              <div>
                <dt>Net change</dt>
                <dd className={row.net < 0 ? 'negative' : 'positive'}>
                  {row.net > 0 ? '+' : ''}
                  {money(row.net)} MMK
                </dd>
              </div>
              <div className="closing">
                <dt>Closing balance</dt>
                <dd>{money(row.closing)} MMK</dd>
              </div>
            </dl>
          </section>
          <RecurringMonthExpenses
            plan={plan}
            month={month}
            inPlans={Boolean(planId)}
          />
          {writableMonth && (
            <SavingsEntries
              key={plan.id}
              plan={plan}
              month={month}
              onSaved={changeMonth}
            />
          )}
        </>
      )}
      {message && (
        <p className="notice" role="status">
          {message}
        </p>
      )}
      {editing && (
        <Modal title="Adjust monthly saving" presentation="form" close={close}>
          {editingPlan ? (
            <ContributionForm
              plan={editingPlan}
              initialScope={editing.scope}
              month={editing.month}
              cancel={close}
              save={async (values) => {
                setSaving(true);
                try {
                  await commit(
                    (current) =>
                      changeContribution(current, editing.planId, values),
                    editing.revision,
                    (latestRevision) =>
                      setEditing((current) =>
                        current
                          ? { ...current, revision: latestRevision }
                          : null,
                      ),
                  );
                  setEditing(null);
                  setMessage('Your monthly saving has been updated.');
                } finally {
                  setSaving(false);
                }
              }}
            />
          ) : (
            <p role="alert">This plan no longer exists.</p>
          )}
        </Modal>
      )}
    </>
  );
}
