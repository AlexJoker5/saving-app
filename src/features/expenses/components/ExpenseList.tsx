import { Link } from 'react-router';
import { ChevronRight, Receipt, Repeat2 } from 'lucide-react';
import type { MonthlyExpense } from '../types/recurring-expense.type';
import { today } from '../../../lib/dates';
import { money } from '../../../lib/money';

export function ExpenseList({ expenses }: { expenses: MonthlyExpense[] }) {
  return (
    <ul className="entry-list expense-list">
      {expenses.map((expense) => (
        <li key={expense.id}>
          <Link
            className="navigation-row"
            to={`/expenses/${encodeURIComponent(expense.id)}`}
          >
            <span className="icon-tile">
              {expense.recurringId ? (
                <Repeat2 size={20} />
              ) : (
                <Receipt size={20} />
              )}
            </span>
            <span>
              <strong>{expense.note || expense.label}</strong>
              <small>
                {expense.date} ·{' '}
                {expense.source === 'savings' ? 'Savings' : 'Budget'}
                {expense.recurringId ? ' · Recurring' : ''}
                {expense.date > today() ? ' · Planned' : ''}
              </small>
            </span>
            <b>{money(expense.amount)}</b>
            <ChevronRight size={18} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
