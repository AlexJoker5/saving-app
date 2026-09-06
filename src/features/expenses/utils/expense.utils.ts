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
export function saveExpense(
  state: AppState,
  input: Expense,
  editingId?: string,
): AppState {
  const expense = expenseSchema.parse(input);
  const main = state.plans.find((plan) => plan.id === state.mainId);

  if (!main) {
    throw new Error('The Main savings plan could not be found.');
  }

  if (expense.date.slice(0, 7) < main.start) {
    throw new Error('Choose a date on or after your savings start month.');
  }

  if (editingId !== undefined) {
    if (!state.expenses.some((record) => record.id === editingId)) {
      throw new Error(
        'This record no longer exists. Close the form and review the latest records.',
      );
    }
    if (expense.id !== editingId) {
      throw new Error('An edit must keep the record’s identity.');
    }
  } else if (state.expenses.some((record) => record.id === expense.id)) {
    throw new Error(
      'This record already exists. Close the form and review the latest records.',
    );
  }

  const connectedEntry = linkedEntry(expense);
  if (
    connectedEntry &&
    main.entries.some(
      (entry) =>
        entry.id === connectedEntry.id && entry.expenseId !== expense.id,
    )
  ) {
    throw new Error(
      'A different savings entry already uses this record’s identity.',
    );
  }
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
  if (!state.plans.some((plan) => plan.id === state.mainId)) {
    throw new Error('The Main savings plan could not be found.');
  }
  if (!state.expenses.some((expense) => expense.id === expenseId)) {
    throw new Error(
      'This record no longer exists. Close the dialog and review the latest records.',
    );
  }

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

export function expenseTotals(expenses: Expense[]) {
  let budgetSpending = 0;
  let savingsSpending = 0;
  let recordedSaving = 0;
  for (const expense of expenses) {
    if (expense.label === 'Saving') {
      recordedSaving += expense.amount;
    } else if (expense.source === 'savings') {
      savingsSpending += expense.amount;
    } else {
      budgetSpending += expense.amount;
    }
  }

  return { budgetSpending, savingsSpending, recordedSaving };
}
