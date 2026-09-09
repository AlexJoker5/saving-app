import { recurringRulesDiffer } from '../../expenses/utils/recurring-expense.utils';
import type { AppState } from '../../workspace/types/workspace.type';
import type { Plan } from '../types/plan.type';
import type { Entry } from '../../savings/types/saving.type';
import { id } from '../../../lib/id';
import { nameSchema } from '../schema/plan.schema';
import { linkedEntry } from '../../expenses/utils/expense.utils';

export function snapshot(
  state: AppState,
  sourceId: string,
  name: string,
): AppState {
  const validName = validatePlanName(state, name);
  const source = state.plans.find((plan) => plan.id === sourceId);

  if (!source) {
    throw new Error('Plan not found');
  }

  return {
    ...state,
    plans: [
      ...state.plans,
      { ...structuredClone(source), id: id(), name: validName, sourceId },
    ],
  };
}
function entrySignatures(entries: Entry[]): Map<string, string[]> {
  const signatures = new Map<string, string[]>();

  for (const entry of entries) {
    if (!entry.expenseId) {
      continue;
    }

    const values = signatures.get(entry.expenseId) ?? [];
    values.push(
      JSON.stringify([entry.date, entry.kind, entry.amount, entry.note]),
    );
    signatures.set(entry.expenseId, values.sort());
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
      JSON.stringify(expectedSignatures.get(expenseId)) !==
      JSON.stringify(actualSignatures.get(expenseId)),
  );
}
export function reconcilePlan(state: AppState, planId: string): AppState {
  const target = state.plans.find((plan) => plan.id === planId);
  if (!target) {
    throw new Error('Plan not found');
  }
  if (planId === state.mainId) {
    throw new Error('Main already tracks the current expenses.');
  }
  if (
    state.expenses.some((expense) => expense.date.slice(0, 7) < target.start)
  ) {
    throw new Error('This plan starts after existing expense records.');
  }
  const entries = state.expenses
    .map(linkedEntry)
    .filter((entry): entry is Entry => entry !== undefined);

  const independentIds = new Set(
    target.entries.filter((entry) => !entry.expenseId).map((entry) => entry.id),
  );
  if (entries.some((entry) => independentIds.has(entry.id))) {
    throw new Error(
      'A direct entry conflicts with a connected expense entry. Review and recreate the conflicting direct entry before promoting this plan.',
    );
  }

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
export function promote(
  state: AppState,
  planId: string,
  acceptRecurringChanges = false,
): AppState {
  const plan = state.plans.find((candidate) => candidate.id === planId);

  if (!plan) {
    throw new Error('Plan not found');
  }

  if (promotionConflicts(state, plan).length > 0) {
    throw new Error(
      'Resolve connected expense differences before making this plan Main.',
    );
  }

  if (recurringRulesDiffer(state, plan) && !acceptRecurringChanges) {
    throw new Error(
      'Review and accept the recurring expense changes before making this plan Main.',
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

function validatePlanName(state: AppState, input: string, editingId?: string) {
  const { name } = nameSchema.parse({ name: input });
  if (
    state.plans.some(
      (plan) =>
        plan.id !== editingId && plan.name.toLowerCase() === name.toLowerCase(),
    )
  ) {
    throw new Error('A plan already uses this name. Choose a different name.');
  }

  return name;
}

export function renamePlan(
  state: AppState,
  planId: string,
  input: string,
): AppState {
  if (!state.plans.some((plan) => plan.id === planId)) {
    throw new Error(
      'This plan no longer exists. Close the form and review your plans.',
    );
  }
  const name = validatePlanName(state, input, planId);

  return {
    ...state,
    plans: state.plans.map((plan) =>
      plan.id === planId ? { ...plan, name } : plan,
    ),
  };
}

export function deletePlan(state: AppState, planId: string): AppState {
  if (!state.plans.some((plan) => plan.id === planId)) {
    throw new Error(
      'This plan no longer exists. Close the dialog and review your plans.',
    );
  }
  if (state.mainId === planId) {
    throw new Error('Main cannot be deleted. Make another plan Main first.');
  }

  return { ...state, plans: state.plans.filter((plan) => plan.id !== planId) };
}
