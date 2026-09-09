import {
  monthlyExpenses,
  recentExpenses,
} from '../expenses/utils/recurring-expense.utils';
import { Link } from 'react-router';
import { Plus, ArrowUpRight, Receipt, Flag, ChevronRight } from 'lucide-react';
import { useWorkspaceContext } from '../workspace/hooks/useWorkspaceContext';
import { balanceAt } from '../savings/utils/saving.utils';
import { expenseTotals } from '../expenses/utils/expense.utils';
import { currentMonth, monthName } from '../../lib/dates';
import { money } from '../../lib/money';
import { routePaths } from '../../routes/routePaths';
export function HomePage() {
  const { state } = useWorkspaceContext();
  const main = state.plans.find((plan) => plan.id === state.mainId);
  const month = currentMonth();
  const expenses = monthlyExpenses(state, month);
  const totals = expenseTotals(expenses);
  const recent = recentExpenses(state);

  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Make room for tomorrow</p>
        <h1>Home</h1>
        <p className="muted">A little progress, every day.</p>
      </div>
      <section className="balance-card">
        <div className="section-head">
          <p>Current savings</p>
          <span className="badge">Main</span>
        </div>
        <strong>
          {money(main ? balanceAt(main) : 0)} <span>MMK</span>
        </strong>
        <Link className="balance-link" to={routePaths.savings}>
          See your savings <ArrowUpRight size={18} />
        </Link>
      </section>
      <div className="quick-actions">
        <Link className="button" to={`${routePaths.expenses}?action=add`}>
          <Plus size={18} />
          Add expense
        </Link>
        <Link
          className="button secondary"
          to={`${routePaths.savings}?action=add`}
        >
          <Plus size={18} />
          Add money
        </Link>
      </div>
      <h2>{monthName(month)} at a glance</h2>
      <div className="list-panel">
        <Link className="navigation-row" to={routePaths.expenses}>
          <span className="icon-tile">
            <Receipt size={20} />
          </span>
          <span>
            <strong>Budget remaining</strong>
            <small>
              {money(totals.budgetSpending)} spent of {money(state.budget)} MMK
            </small>
          </span>
          <b>{money(state.budget - totals.budgetSpending)}</b>
          <ChevronRight size={18} />
        </Link>
        <Link className="navigation-row" to={routePaths.goals}>
          <span className="icon-tile">
            <Flag size={20} />
          </span>
          <span>
            <strong>Your goals</strong>
            <small>See your projected target months</small>
          </span>
          <b>{state.goals.length}</b>
          <ChevronRight size={18} />
        </Link>
      </div>
      <div className="section-head">
        <h2>Recent expenses</h2>
        <Link to={routePaths.expenses}>See all</Link>
      </div>
      <div className="list-panel">
        {recent.length ? (
          recent.map((expense) => (
            <Link
              className="navigation-row"
              key={expense.id}
              to={`${routePaths.expenses}/${encodeURIComponent(expense.id)}`}
            >
              <span className="icon-tile">
                <Receipt size={20} />
              </span>
              <span>
                <strong>{expense.note || expense.label}</strong>
                <small>
                  {expense.date} ·{' '}
                  {expense.source === 'savings' ? 'Savings' : 'Budget'}
                </small>
              </span>
              <b>{money(expense.amount)}</b>
            </Link>
          ))
        ) : (
          <p className="empty-copy">
            No expenses yet. Add your first record when you spend.
          </p>
        )}
      </div>
    </>
  );
}
