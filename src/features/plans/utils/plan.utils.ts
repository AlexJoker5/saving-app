import type { AppState } from '../../workspace/types/workspace.type';
import type { Plan } from '../types/plan.type';
import type { Entry } from '../../savings/types/saving.type';
import { id } from '../../../lib/id';
import { linkedEntry } from '../../expenses/utils/expense.utils';

export function snapshot(
  state: AppState,
  sourceId: string,
  name: string,
): AppState {
  const source = state.plans.find((plan) => plan.id === sourceId);

  if (!source) {
    throw new Error('Plan not found');
  }

  return {
    ...state,
    plans: [
      ...state.plans,
      { ...structuredClone(source), id: id(), name: name.trim(), sourceId },
    ],
  };
}
function entrySignatures(entries: Entry[]): Map<string, string> {
  const signatures = new Map<string, string>();

  for (const entry of entries) {
    if (!entry.expenseId) {
      continue;
    }

    signatures.set(
      entry.expenseId,
      JSON.stringify([entry.date, entry.kind, entry.amount, entry.note]),
    );
  }

  return signatures;
}

export function promotionConflicts(state: AppState, plan: Plan): string[] {
  const expected = state.expenses
    .map(linkedEntry)
    .filter((entry): entry is Entry => entry !== undefined);
  const expectedSignatures = entrySignatures(expected);
  const actualSignatures = entrySignatures(plan.entries);
  const expenseIds = new Set([
    ...expectedSignatures.keys(),
    ...actualSignatures.keys(),
  ]);

  return [...expenseIds].filter(
    (expenseId) =>
      expectedSignatures.get(expenseId) !== actualSignatures.get(expenseId),
  );
}
export function reconcilePlan(state: AppState, planId: string): AppState {
  const entries = state.expenses
    .map(linkedEntry)
    .filter((entry): entry is Entry => entry !== undefined);

  return {
    ...state,
    plans: state.plans.map((plan) => {
      if (plan.id !== planId) {
        return plan;
      }

      const independentEntries = plan.entries.filter(
        (entry) => !entry.expenseId,
      );

      return {
        ...plan,
        entries: [...independentEntries, ...structuredClone(entries)],
      };
    }),
  };
}
export function promote(state: AppState, planId: string): AppState {
  const plan = state.plans.find((candidate) => candidate.id === planId);

  if (!plan) {
    throw new Error('Plan not found');
  }

  if (promotionConflicts(state, plan).length > 0) {
    throw new Error(
      'Resolve connected expense differences before making this plan Main.',
    );
  }

  const hasEarlierExpense = state.expenses.some(
    (expense) => expense.date.slice(0, 7) < plan.start,
  );

  if (hasEarlierExpense) {
    throw new Error('This plan starts after existing expense records.');
  }

  return { ...state, mainId: planId };
}
