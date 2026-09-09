import { Link } from 'react-router';
import type { Plan } from '../../plans/types/plan.type';
import { recurringOccurrences } from '../utils/recurring-expense.utils';
import { money } from '../../../lib/money';
import { today } from '../../../lib/dates';

export function RecurringMonthExpenses({
  plan,
  month,
  inPlans,
}: {
  plan: Plan;
  month: string;
  inPlans: boolean;
}) {
  const expenses = recurringOccurrences(plan, month);
  const to = inPlans
    ? `/plans/${encodeURIComponent(plan.id)}/recurring?month=${month}`
    : `/expenses/recurring?month=${month}&plan=${encodeURIComponent(plan.id)}&from=savings`;

  return (
    <section className="panel">
      <div className="section-head">
        <h2>Recurring expenses</h2>
        <Link to={to}>Manage</Link>
      </div>
      <p className="muted">
        Savings-funded expenses are included in withdrawals. Budget-funded
        expenses use the monthly spending budget.
      </p>
      {expenses.length ? (
        <ul className="entry-list">
          {expenses.map((expense) => (
            <li key={expense.id}>
              <div className="entry-details">
                <strong>{expense.note}</strong>
                <p>
                  {expense.date} ·{' '}
                  {expense.source === 'savings' ? 'Savings' : 'Budget'}
                  {expense.date > today() ? ' · Planned' : ''}
                </p>
              </div>
              <strong className="entry-amount">
                {money(expense.amount)} MMK
              </strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No recurring expenses apply this month.</p>
      )}
    </section>
  );
}
