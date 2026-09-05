import { expenseSchema } from '../schema/expense.schema';
import type { AppState } from '../../workspace/types/workspace.type';
import type { Expense } from '../types/expense.type';
import type { Entry } from '../../savings/types/saving.type';

export function linkedEntry(expense: Expense): Entry | undefined {
  if (expense.label !== 'Saving' && expense.source !== 'savings') {
    return undefined;
  }

  return {
    id: 'expense-' + expense.id,
    expenseId: expense.id,
    kind: expense.label === 'Saving' ? 'contribution' : 'withdrawal',
    amount: expense.amount,
    date: expense.date,
    note: expense.note || expense.label,
  };
}
export function saveExpense(state: AppState, input: Expense): AppState {
  const expense = expenseSchema.parse(input);
  const main = state.plans.find((plan) => plan.id === state.mainId);

  if (!main) {
    throw new Error('The Main savings plan could not be found.');
  }

  if (expense.date.slice(0, 7) < main.start) {
    throw new Error('Choose a date on or after your savings start month.');
  }

  const connectedEntry = linkedEntry(expense);
  const expenses = state.expenses.filter((record) => record.id !== expense.id);
  const plans = state.plans.map((plan) => {
    if (plan.id !== state.mainId) {
      return plan;
    }

    const remainingEntries = plan.entries.filter(
      (entry) => entry.expenseId !== expense.id,
    );

    return {
      ...plan,
      entries: connectedEntry
        ? [...remainingEntries, connectedEntry]
        : remainingEntries,
    };
  });

  return {
    ...state,
    expenses: [...expenses, expense],
    plans,
  };
}
export function deleteExpense(state: AppState, expenseId: string): AppState {
  return {
    ...state,
    expenses: state.expenses.filter((expense) => expense.id !== expenseId),
    plans: state.plans.map((plan) => {
      if (plan.id !== state.mainId) {
        return plan;
      }

      return {
        ...plan,
        entries: plan.entries.filter((entry) => entry.expenseId !== expenseId),
      };
    }),
  };
}
