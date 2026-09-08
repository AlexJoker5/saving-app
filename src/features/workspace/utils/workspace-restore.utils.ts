import { workspaceBackupSchema } from '../schema/workspace-backup.schema';
import { monthSchema } from '../../../lib/validation';
import { promotionConflicts } from '../../plans/utils/plan.utils';

function unique(values: string[]) {
  return (
    values.every((value) => value.trim().length > 0) &&
    new Set(values).size === values.length
  );
}

export function parseWorkspaceBackup(contents: string) {
  let input: unknown;
  try {
    input = JSON.parse(contents);
  } catch {
    throw new Error(
      'This file is not valid JSON. Choose a Saving JSON backup.',
    );
  }
  const result = workspaceBackupSchema.safeParse(input);
  if (!result.success) {
    throw new Error(
      'This file is not a supported version 1 Saving backup, or its workspace data is invalid.',
    );
  }
  const state = result.data.snapshot.state;
  if (
    !unique(state.plans.map((plan) => plan.id)) ||
    !unique(state.plans.map((plan) => plan.name.toLowerCase())) ||
    !unique(state.expenses.map((expense) => expense.id)) ||
    !unique(state.goals.map((goal) => goal.id))
  ) {
    throw new Error(
      'The backup contains duplicate or empty record identities or plan names.',
    );
  }
  for (const plan of state.plans) {
    if (
      !unique(plan.entries.map((entry) => entry.id)) ||
      !unique(
        plan.entries.flatMap((entry) =>
          entry.expenseId === undefined ? [] : [entry.expenseId],
        ),
      ) ||
      !unique(plan.schedules.map((schedule) => schedule.month)) ||
      plan.schedules.some((schedule) => schedule.month < plan.start) ||
      Object.keys(plan.overrides).some(
        (month) => !monthSchema.safeParse(month).success || month < plan.start,
      ) ||
      plan.entries.some((entry) => entry.date.slice(0, 7) < plan.start)
    ) {
      throw new Error(
        'The backup contains invalid plan dates or duplicate savings records.',
      );
    }
  }
  const main = state.plans.find((plan) => plan.id === state.mainId);
  if (
    !main ||
    state.expenses.some((expense) => expense.date.slice(0, 7) < main.start) ||
    promotionConflicts(state, main).length > 0
  ) {
    throw new Error(
      'The backup has inconsistent Main-plan and expense records.',
    );
  }

  return result.data;
}
