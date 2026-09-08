import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Layers,
  MoveHorizontal,
} from 'lucide-react';
import { useWorkspaceContext } from '../workspace/hooks/useWorkspaceContext';
import { MonthNavigation } from '../../components/ui/MonthNavigation';
import { isDisplayMonth, shiftMonth } from '../../lib/display-month';
import { Modal } from '../../components/ui/Modal';
import { projectedMonth } from './utils/projection.utils';
import { currentMonth, monthName } from '../../lib/dates';
import { money } from '../../lib/money';
import { routePaths } from '../../routes/routePaths';
export function PlanComparisonPage() {
  const { state } = useWorkspaceContext();
  const [search, setSearch] = useSearchParams();
  const [picking, setPicking] = useState(false);
  const [selection, setSelection] = useState<string[] | null>(null);
  const min = state.plans.map((plan) => plan.start).sort()[0] ?? currentMonth();
  const requested = search.get('month') ?? currentMonth();
  const month = isDisplayMonth(requested) && requested >= min ? requested : min;
  const plans = [...state.plans]
    .sort(
      (a, b) => Number(b.id === state.mainId) - Number(a.id === state.mainId),
    )
    .filter(
      (plan) =>
        plan.id === state.mainId ||
        selection === null ||
        selection.includes(plan.id),
    );
  const main = state.plans.find((plan) => plan.id === state.mainId);
  const months = Array.from({ length: 6 }, (_, i) =>
    shiftMonth(month, i),
  ).filter(isDisplayMonth);
  const change = (next: string) => setSearch({ month: next });

  return (
    <>
      <Link className="back-link" to={routePaths.plans}>
        <ArrowLeft size={19} />
        Plans
      </Link>
      <div className="page-heading">
        <h1>Compare timelines</h1>
        <p className="muted">Compare closing balances month by month.</p>
      </div>
      <button
        className="navigation-row list-panel plan-picker"
        onClick={() => setPicking(true)}
      >
        <span className="icon-tile">
          <Layers size={21} />
        </span>
        <span>
          <strong>{plans.length} plans selected</strong>
          <small>Main is the comparison baseline</small>
        </span>
      </button>
      <h2>Monthly comparison</h2>
      <MonthNavigation month={month} min={min} onChange={change} />
      <div className="table-meta">
        <span>All amounts in MMK</span>
        <span>
          <MoveHorizontal size={16} /> Swipe across plans
        </span>
      </div>
      <div
        className="comparison-scroll"
        role="region"
        aria-label="Monthly plan comparison"
      >
        <table className="comparison-table">
          <caption className="sr-only">
            Month-end balances in MMK, with differences from Main below each
            balance
          </caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              {plans.map((plan) => (
                <th scope="col" key={plan.id}>
                  {plan.name}
                  {plan.id === state.mainId && <small>Main · Baseline</small>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {months.map((value) => {
              const baseline = main
                ? projectedMonth(main, value)?.closing
                : undefined;

              return (
                <tr
                  key={value}
                  className={value === currentMonth() ? 'current-month' : ''}
                >
                  <th scope="row">
                    {monthName(value, true)}
                    <small>
                      {value > currentMonth() ? 'Projected' : 'Month-end'}
                    </small>
                  </th>
                  {plans.map((plan) => {
                    const closing = projectedMonth(plan, value)?.closing;
                    const delta =
                      closing !== undefined && baseline !== undefined
                        ? closing - baseline
                        : undefined;

                    return (
                      <td key={plan.id}>
                        {closing === undefined ? (
                          <span className="before-start">Before start</span>
                        ) : (
                          <Link
                            className="comparison-value"
                            to={`${routePaths.plans}/${encodeURIComponent(plan.id)}/months/${value}?from=compare&window=${month}`}
                            aria-label={`${plan.name}, ${monthName(value)}, ${money(closing)} MMK. Open month details.`}
                          >
                            <strong>{money(closing)}</strong>
                            {plan.id !== state.mainId &&
                              delta !== undefined && (
                                <small
                                  className={
                                    delta < 0 ? 'negative' : 'positive'
                                  }
                                >
                                  {delta > 0 ? '+' : ''}
                                  {money(delta)}
                                </small>
                              )}
                          </Link>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted">
        Difference from Main appears below each plan’s balance.
      </p>
      <div className="quick-actions">
        <button
          className="button secondary"
          disabled={month === min}
          onClick={() =>
            change(shiftMonth(month, -6) < min ? min : shiftMonth(month, -6))
          }
        >
          <ChevronLeft size={18} />
          Earlier
        </button>
        <button
          className="button secondary"
          disabled={!isDisplayMonth(shiftMonth(month, 6))}
          onClick={() => change(shiftMonth(month, 6))}
        >
          Next months
          <ChevronRight size={18} />
        </button>
      </div>
      <p className="muted">
        Browse as far ahead as you need. Tap a balance for that plan’s month
        details.
      </p>
      {picking && (
        <Modal title="Compare plans" close={() => setPicking(false)}>
          <p className="muted">Main stays included as your baseline.</p>
          {state.plans.map((plan) => (
            <label className="check-row" key={plan.id}>
              <span>
                {plan.name}
                {plan.id === state.mainId ? ' · Main' : ''}
              </span>
              <input
                type="checkbox"
                disabled={plan.id === state.mainId}
                checked={plans.some((item) => item.id === plan.id)}
                onChange={(event) => {
                  const selected =
                    selection ?? state.plans.map((item) => item.id);
                  setSelection(
                    event.target.checked
                      ? [...selected, plan.id]
                      : selected.filter((id) => id !== plan.id),
                  );
                }}
              />
            </label>
          ))}
          <button
            className="button full-width"
            onClick={() => setPicking(false)}
          >
            Show comparison
          </button>
        </Modal>
      )}
    </>
  );
}
