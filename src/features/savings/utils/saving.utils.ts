import { adjustSchema, directEntrySchema } from '../schema/saving.schema';
import type { AppState } from '../../workspace/types/workspace.type';
import type {
  ContributionValues,
  DirectEntry,
  Entry,
  MonthRow,
} from '../types/saving.type';
import type { Plan } from '../../plans/types/plan.type';
import { addMonths, today } from '../../../lib/dates';

export const scheduled = (plan: Plan, month: string) =>
  [...plan.schedules]
    .sort((a, b) => b.month.localeCompare(a.month))
    .find((s) => s.month <= month)?.amount ?? 0;

export function timeline(plan: Plan, end: string, cutoff?: string): MonthRow[] {
  const rows: MonthRow[] = [];
  let balance = plan.opening;
  for (
    let month = plan.start;
    month <= end && rows.length < 1200;
    month = addMonths(month, 1)
  ) {
    const entries = plan.entries.filter(
      (e) => e.date.startsWith(month) && (!cutoff || e.date <= cutoff),
    );
    const recorded = entries.filter((e) => e.kind === 'contribution');
    const regular = recorded.length
      ? recorded.reduce((s, e) => s + e.amount, 0)
      : (plan.overrides[month] ?? scheduled(plan, month));
    const extra = entries
      .filter((e) => e.kind === 'extra')
      .reduce((s, e) => s + e.amount, 0);
    const withdrawals = entries
      .filter((e) => e.kind === 'withdrawal')
      .reduce((s, e) => s + e.amount, 0);
    const net = regular + extra - withdrawals;
    rows.push({
      month,
      opening: balance,
      regular,
      scheduled: scheduled(plan, month),
      extra,
      withdrawals,
      net,
      closing: balance + net,
      mode: recorded.length
        ? 'Recorded'
        : Object.hasOwn(plan.overrides, month)
          ? 'Adjusted'
          : 'Automatic',
    });
    balance += net;
  }

  return rows;
}
export function balanceAt(plan: Plan, date = today()) {
  return timeline(plan, date.slice(0, 7), date).at(-1)?.closing ?? plan.opening;
}

export function changeContribution(
  state: AppState,
  planId: string,
  values: ContributionValues,
): AppState {
  const { month, amount, scope } = adjustSchema.parse(values);
  const plan = state.plans.find((item) => item.id === planId);
  if (!plan) {
    throw new Error('The savings plan could not be found.');
  }
  if (month < plan.start) {
    throw new Error('Choose a month on or after your savings start month.');
  }
  if (scope === 'ongoing') {
    throw new Error('Ongoing schedule changes are not available yet.');
  }
  if (
    plan.entries.some(
      (entry) => entry.kind === 'contribution' && entry.date.startsWith(month),
    )
  ) {
    throw new Error(
      'Saving records determine this month’s contribution. Edit those records to change it.',
    );
  }
  const overrides = { ...plan.overrides };
  if (scope === 'reset') {
    delete overrides[month];
  } else {
    overrides[month] = amount;
  }

  return {
    ...state,
    plans: state.plans.map((item) =>
      item.id === planId ? { ...item, overrides } : item,
    ),
  };
}

export function isDirectEntry(entry: Entry): entry is DirectEntry {
  return (
    entry.expenseId === undefined &&
    (entry.kind === 'extra' || entry.kind === 'withdrawal')
  );
}

export function saveMoneyEntry(
  state: AppState,
  planId: string,
  input: DirectEntry,
  editingId?: string,
): AppState {
  const entry = directEntrySchema.parse(input);
  const plan = state.plans.find((item) => item.id === planId);
  if (!plan) {
    throw new Error('The savings plan could not be found.');
  }
  if (entry.date.slice(0, 7) < plan.start) {
    throw new Error('Choose a date on or after your savings start month.');
  }
  if (editingId !== undefined) {
    const original = plan.entries.find((item) => item.id === editingId);
    if (!original) {
      throw new Error(
        'This entry no longer exists. Close this form and review the latest entries.',
      );
    }
    if (!isDirectEntry(original)) {
      throw new Error(
        'This record belongs to the expenses flow and cannot be changed here.',
      );
    }
    if (entry.id !== editingId || entry.kind !== original.kind) {
      throw new Error('An edit must keep the entry’s identity and type.');
    }
  } else if (plan.entries.some((item) => item.id === entry.id)) {
    throw new Error(
      'This entry already exists. Close this form and review the latest entries.',
    );
  }
  const entries =
    editingId === undefined
      ? [...plan.entries, entry]
      : plan.entries.map((item) => (item.id === editingId ? entry : item));

  return {
    ...state,
    plans: state.plans.map((item) =>
      item.id === planId ? { ...item, entries } : item,
    ),
  };
}

export function deleteMoneyEntry(
  state: AppState,
  planId: string,
  entryId: string,
): AppState {
  const plan = state.plans.find((item) => item.id === planId);
  if (!plan) {
    throw new Error('The savings plan could not be found.');
  }
  const entry = plan.entries.find((item) => item.id === entryId);
  if (!entry) {
    throw new Error(
      'This entry no longer exists. Close this dialog and review the latest entries.',
    );
  }
  if (!isDirectEntry(entry)) {
    throw new Error(
      'This record belongs to the expenses flow and cannot be deleted here.',
    );
  }

  return {
    ...state,
    plans: state.plans.map((item) =>
      item.id === planId
        ? {
            ...item,
            entries: item.entries.filter((record) => record.id !== entryId),
          }
        : item,
    ),
  };
}
