import type {
  RecurringExpense,
  RecurringTerms,
} from '../types/recurring-expense.type';
import { monthName } from '../../../lib/dates';
import { money } from '../../../lib/money';

const describe = (terms: RecurringTerms) =>
  `${terms.name} · ${money(terms.amount)} MMK · ${terms.source === 'savings' ? 'Savings' : 'Budget'} · ${terms.label} · day ${terms.day}`;
export function RecurringRuleHistory({ rule }: { rule: RecurringExpense }) {
  return (
    <details>
      <summary>Defaults and month adjustments</summary>
      <ul className="promotion-differences">
        {[...rule.schedules]
          .sort((a, b) => a.month.localeCompare(b.month))
          .map((terms) => (
            <li key={terms.month}>
              <strong>From {monthName(terms.month)}</strong>
              <p>
                {describe(terms)}
                {terms.amount === 0 ? ' · Paused' : ''}
              </p>
            </li>
          ))}
        {Object.entries(rule.overrides)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, terms]) => (
            <li key={month}>
              <strong>{monthName(month)} only</strong>
              <p>
                {describe(terms)}
                {terms.amount === 0 ? ' · Skipped' : ''}
              </p>
            </li>
          ))}
      </ul>
    </details>
  );
}
