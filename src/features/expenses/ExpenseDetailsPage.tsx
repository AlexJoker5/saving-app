import { Link, useParams } from 'react-router';
import {
  ArrowLeft,
  CalendarDays,
  Tag,
  Wallet,
  Receipt,
  Pencil,
  Trash2,
} from 'lucide-react';
import { useWorkspaceContext } from '../workspace/hooks/useWorkspaceContext';
import { money } from '../../lib/money';
import { routePaths } from '../../routes/routePaths';
export function ExpenseDetailsPage() {
  const { state } = useWorkspaceContext();
  const { expenseId } = useParams();
  const expense = state.expenses.find((item) => item.id === expenseId);
  if (!expense) {
    return (
      <section className="panel">
        <h1>Expense unavailable</h1>
        <Link to={routePaths.expenses}>Back to Expenses</Link>
      </section>
    );
  }
  const month = expense.date.slice(0, 7);
  const query = `month=${month}`;

  return (
    <>
      <Link className="back-link" to={`${routePaths.expenses}?${query}`}>
        <ArrowLeft size={19} />
        Expenses
      </Link>
      <div className="page-heading">
        <h1>Expense details</h1>
      </div>
      <div className="expense-hero">
        <span className="icon-tile">
          <Receipt size={24} />
        </span>
        <p className="muted">{expense.note || expense.label}</p>
        <p className="large-money">
          {money(expense.amount)} <small>MMK</small>
        </p>
      </div>
      <div className="list-panel">
        <div className="navigation-row">
          <span className="icon-tile">
            <CalendarDays size={20} />
          </span>
          <span>
            <strong>Date</strong>
          </span>
          <b>{expense.date}</b>
        </div>
        <div className="navigation-row">
          <span className="icon-tile">
            <Tag size={20} />
          </span>
          <span>
            <strong>Label</strong>
          </span>
          <b>{expense.label}</b>
        </div>
        <div className="navigation-row">
          <span className="icon-tile">
            <Wallet size={20} />
          </span>
          <span>
            <strong>Paid from</strong>
          </span>
          <b>
            {expense.source === 'savings' ? 'Main savings' : 'Monthly budget'}
          </b>
        </div>
      </div>
      <p className="notice">
        {expense.label === 'Saving'
          ? 'Linked to a saving contribution in Main. Editing this record updates both.'
          : expense.source === 'savings'
            ? 'Linked to a withdrawal in Main. Editing or deleting updates both records.'
            : 'This uses your spending budget and does not create a savings withdrawal.'}
      </p>
      <div className="quick-actions">
        <Link
          className="button"
          to={`${routePaths.expenses}?${query}&edit=${encodeURIComponent(expense.id)}`}
        >
          <Pencil size={18} />
          Edit expense
        </Link>
        <Link
          className="button secondary danger"
          to={`${routePaths.expenses}?${query}&delete=${encodeURIComponent(expense.id)}`}
        >
          <Trash2 size={18} />
          Delete
        </Link>
      </div>
    </>
  );
}
