import { recurringRulesDiffer } from '../../expenses/utils/recurring-expense.utils';
import { RecurringRuleHistory } from '../../expenses/components/RecurringRuleHistory';
import { linkedEntry } from '../../expenses/utils/expense.utils';
import { promotionConflicts } from '../utils/plan.utils';
import type { PromotionReviewProps } from '../types/plan.type';
import { money } from '../../../lib/money';

export function PromotionReview({
  plan,
  state,
  accepted,
  setAccepted,
  disabled,
}: PromotionReviewProps) {
  const conflicts = promotionConflicts(state, plan);
  const currentMain = state.plans.find((item) => item.id === state.mainId);

  return (
    <>
      <p>
        <strong>{plan.name}</strong> will become Main. New expenses will update
        this plan.
        {currentMain && (
          <>
            {' '}
            Your current Main, <strong>{currentMain.name}</strong>, will remain
            as an independent plan.
          </>
        )}
      </p>
      {conflicts.length ? (
        <>
          <p className="notice">
            {conflicts.length} connected expense{' '}
            {conflicts.length === 1 ? 'record differs' : 'records differ'} from
            the current expenses. Review the replacements below.
          </p>
          <ul className="promotion-differences">
            {conflicts.map((expenseId) => {
              const expense = state.expenses.find(
                (item) => item.id === expenseId,
              );
              const expected = expense ? linkedEntry(expense) : undefined;
              const existing = plan.entries.filter(
                (item) => item.expenseId === expenseId,
              );

              return (
                <li key={expenseId}>
                  <strong>
                    {expense?.note ||
                      expense?.label ||
                      existing[0]?.note ||
                      'Removed expense'}
                  </strong>
                  <p>
                    In this plan:{' '}
                    {existing.length
                      ? existing
                          .map(
                            (entry) =>
                              `${entry.kind === 'contribution' ? 'Saving' : 'Withdrawal'} ${money(entry.amount)} MMK on ${entry.date}${entry.note ? ` — ${entry.note}` : ''}`,
                          )
                          .join('; ')
                      : 'No connected entry'}
                  </p>
                  <p>
                    After update:{' '}
                    {expected
                      ? `${expected.kind === 'contribution' ? 'Saving' : 'Withdrawal'} ${money(expected.amount)} MMK on ${expected.date}${expected.note ? ` — ${expected.note}` : ''}`
                      : 'No connected entry (removed or paid from budget)'}
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="muted">
            This can change the plan’s balances. Its direct additions,
            withdrawals, schedules, and month adjustments stay in place. One-off
            expense records are unchanged.
          </p>
        </>
      ) : (
        <p className="notice">
          Connected expense records match. No expense reconciliation is needed.
        </p>
      )}
      {recurringRulesDiffer(state, plan) && (
        <section className="panel">
          <h3>Recurring expenses will change</h3>
          <p className="notice">
            This plan’s recurring rules and month adjustments will become your
            Main expenses, for past and future months. Your old Main keeps its
            own rules. Review both sets below.
          </p>
          {[currentMain, plan].map(
            (item) =>
              item && (
                <div key={item.id}>
                  <h4>
                    {item.id === state.mainId
                      ? 'Current Main'
                      : 'After switching'}{' '}
                    · {item.name}
                  </h4>
                  {(item.recurringExpenses ?? []).length ? (
                    item.recurringExpenses?.map((rule) => (
                      <div key={rule.id}>
                        <strong>{rule.schedules[0].name}</strong>
                        <RecurringRuleHistory rule={rule} />
                      </div>
                    ))
                  ) : (
                    <p>No recurring rules.</p>
                  )}
                </div>
              ),
          )}
        </section>
      )}
      {(conflicts.length > 0 || recurringRulesDiffer(state, plan)) && (
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={accepted}
            disabled={disabled}
            onChange={(event) => setAccepted(event.target.checked)}
          />
          <span>
            I accept the connected expense updates and this plan’s recurring
            rules as my Main expenses.
          </span>
        </label>
      )}
    </>
  );
}
