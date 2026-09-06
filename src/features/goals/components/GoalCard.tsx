import { Link } from 'react-router';
import type { Goal } from '../types/goal.type';
import type { Plan } from '../../plans/types/plan.type';
import { goalForecast, goalForecastRange } from '../utils/goal.utils';
import { monthName } from '../../../lib/dates';
import { money } from '../../../lib/money';
import { routePaths } from '../../../routes/routePaths';

interface GoalCardProps {
  goal: Goal;
  plans: Plan[];
  selectedPlanId: string;
  mainId: string;
  edit: () => void;
  remove: () => void;
}

export function GoalCard({
  goal,
  plans,
  selectedPlanId,
  mainId,
  edit,
  remove,
}: GoalCardProps) {
  const comparisons = plans.map((plan) => ({
    plan,
    forecast: goalForecast(plan, goal),
    range: goalForecastRange(plan, goal),
  }));
  const selected = comparisons.find(({ plan }) => plan.id === selectedPlanId);

  return (
    <article className="panel plan-card goal-card">
      <div className="section-head">
        <h2>{goal.name}</h2>
        <span className="badge">{money(goal.amount)} MMK</span>
      </div>
      <p className="muted">Goal starts {monthName(goal.start)}</p>
      {goal.note && <p className="goal-note">{goal.note}</p>}
      {selected && (
        <div className="notice goal-forecast">
          <strong>{selected.plan.name} · First qualifying month-end</strong>
          {selected.forecast ? (
            <>
              <p className="goal-date">{monthName(selected.forecast.month)}</p>
              <p>
                Projected closing balance: {money(selected.forecast.closing)}{' '}
                MMK
              </p>
            </>
          ) : (
            <p>
              The target is not reached in this forecast. Try a different plan
              or adjust its saving schedule.
            </p>
          )}
          <p className="muted">
            Forecast range: {monthName(selected.range.start)}–
            {monthName(selected.range.end)}.
          </p>
          <Link
            to={`${routePaths.savings}?plan=${encodeURIComponent(selected.plan.id)}`}
          >
            View / edit this plan
          </Link>
        </div>
      )}
      <details className="goal-comparisons">
        <summary>
          Compare across {plans.length} {plans.length === 1 ? 'plan' : 'plans'}
        </summary>
        <dl className="breakdown">
          {comparisons.map(({ plan, forecast, range }) => (
            <div key={plan.id}>
              <dt>
                <Link
                  to={`${routePaths.savings}?plan=${encodeURIComponent(plan.id)}`}
                >
                  {plan.name}
                </Link>
                {plan.id === mainId && <span className="muted"> · Main</span>}
                <small className="muted">
                  {monthName(range.start)}–{monthName(range.end)}
                </small>
              </dt>
              <dd>
                {forecast ? monthName(forecast.month) : 'Not reached in range'}
              </dd>
            </div>
          ))}
        </dl>
      </details>
      <div className="entry-actions">
        <button className="button secondary" onClick={edit}>
          Edit goal
        </button>
        <button className="button secondary danger" onClick={remove}>
          Delete goal
        </button>
      </div>
    </article>
  );
}
