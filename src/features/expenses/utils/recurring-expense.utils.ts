import { today } from '../../../lib/dates';
import type { Plan } from '../../plans/types/plan.type';
import type { AppState } from '../../workspace/types/workspace.type';
import type {
  MonthlyExpense,
  RecurringExpense,
  RecurringValues,
} from '../types/recurring-expense.type';
import {
  recurringExpenseSchema,
  recurringFormSchema,
} from '../schema/recurring-expense.schema';
import {
  isDisplayMonth,
  monthNumber,
  shiftMonth,
} from '../../../lib/display-month';

export function recurringDefault(rule: RecurringExpense, month: string) {
  return [...rule.schedules]
    .sort((a, b) => b.month.localeCompare(a.month))
    .find((schedule) => schedule.month <= month);
}
export function recurringTerms(rule: RecurringExpense, month: string) {
  return rule.overrides[month] ?? recurringDefault(rule, month);
}
export function recurringDate(month: string, day: number) {
  const [year, number] = month.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  return `${month}-${String(Math.min(day, days[number - 1])).padStart(2, '0')}`;
}
export function recurringOccurrences(
  plan: Plan,
  month: string,
): MonthlyExpense[] {
  if (!isDisplayMonth(month) || month < plan.start) {
    return [];
  }

  return (plan.recurringExpenses ?? []).flatMap((rule) => {
    const terms = month >= rule.start ? recurringTerms(rule, month) : undefined;
    if (!terms || terms.amount === 0) {
      return [];
    }

    return [
      {
        id: `recurring:${rule.id}:${month}`,
        recurringId: rule.id,
        date: recurringDate(month, terms.day),
        amount: terms.amount,
        label: terms.label,
        source: terms.source,
        note: terms.name,
      },
    ];
  });
}
export function monthlyExpenses(
  state: AppState,
  month: string,
): MonthlyExpense[] {
  const main = state.plans.find((plan) => plan.id === state.mainId);

  return [
    ...state.expenses.filter((expense) => expense.date.startsWith(month)),
    ...(main ? recurringOccurrences(main, month) : []),
  ].sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}
// Find recent occurrences from saved segments, including rules paused for years,
// without walking every intervening month.
export function recentExpenses(
  state: AppState,
  limit = 3,
  cutoff = today(),
): MonthlyExpense[] {
  const main = state.plans.find((plan) => plan.id === state.mainId);
  const records = new Map<string, MonthlyExpense>(
    state.expenses.map((expense) => [expense.id, expense]),
  );
  if (main) {
    const months = new Set<string>();
    for (const rule of main.recurringExpenses ?? []) {
      const schedules = [...rule.schedules].sort((a, b) =>
        a.month.localeCompare(b.month),
      );
      schedules.forEach((schedule, index) => {
        if (schedule.amount === 0) {
          return;
        }
        const next = schedules[index + 1];
        const end =
          next && next.month <= cutoff.slice(0, 7)
            ? shiftMonth(next.month, -1)
            : cutoff.slice(0, 7);
        const count = limit + Object.keys(rule.overrides).length + 1;
        for (let offset = 0; offset < count; offset += 1) {
          const month = shiftMonth(end, -offset);
          if (month < schedule.month) {
            break;
          }
          months.add(month);
        }
      });
      Object.keys(rule.overrides)
        .filter((month) => month <= cutoff.slice(0, 7))
        .forEach((month) => months.add(month));
    }
    for (const month of months) {
      for (const expense of recurringOccurrences(main, month)) {
        records.set(expense.id, expense);
      }
    }
  }

  return [...records.values()]
    .filter((expense) => expense.date <= cutoff)
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id))
    .slice(0, limit);
}
export function findExpense(
  state: AppState,
  expenseId: string | undefined,
): MonthlyExpense | undefined {
  const stored = state.expenses.find((expense) => expense.id === expenseId);
  if (stored) {
    return stored;
  }
  const match = /^recurring:([\da-f-]+):(\d{4}-\d{2})$/.exec(expenseId ?? '');

  return match
    ? monthlyExpenses(state, match[2]).find(
        (expense) => expense.id === expenseId,
      )
    : undefined;
}
export function recurringWithdrawals(
  plan: Plan,
  month: string,
  cutoff?: string,
) {
  return recurringOccurrences(plan, month).reduce(
    (sum, expense) =>
      sum +
      (expense.source === 'savings' && (!cutoff || expense.date <= cutoff)
        ? expense.amount
        : 0),
    0,
  );
}
// Count schedule segments and month exceptions; no materialized future records or horizon cap.
export function recurringWithdrawalsThrough(plan: Plan, end: string) {
  let total = 0;
  for (const rule of plan.recurringExpenses ?? []) {
    const schedules = [...rule.schedules].sort((a, b) =>
      a.month.localeCompare(b.month),
    );
    schedules.forEach((schedule, i) => {
      const start = schedule.month < plan.start ? plan.start : schedule.month;
      const next = schedules[i + 1];
      const stop = next && next.month <= end ? shiftMonth(next.month, -1) : end;
      if (start <= stop && schedule.source === 'savings') {
        total += (monthNumber(stop) - monthNumber(start) + 1) * schedule.amount;
      }
    });
    for (const [month, terms] of Object.entries(rule.overrides)) {
      if (month < plan.start || month > end) {
        continue;
      }
      const scheduled = recurringDefault(rule, month);
      total +=
        (terms.source === 'savings' ? terms.amount : 0) -
        (scheduled?.source === 'savings' ? scheduled.amount : 0);
    }
  }

  return total;
}
export function saveRecurringExpense(
  state: AppState,
  planId: string,
  ruleId: string,
  input: RecurringValues,
  editing: boolean,
): AppState {
  const values = recurringFormSchema.parse(input);
  const plan = state.plans.find((item) => item.id === planId);
  if (!plan) {
    throw new Error(
      'This plan no longer exists. Close the form and review your plans.',
    );
  }
  const rules = plan.recurringExpenses ?? [];
  const original = rules.find((rule) => rule.id === ruleId);
  if (editing !== Boolean(original)) {
    throw new Error(
      'This recurring expense changed. Close the form and review the latest rules.',
    );
  }
  if (values.month < (original?.start ?? plan.start)) {
    throw new Error('Choose a month on or after this expense starts.');
  }
  const { month, scope, ...terms } = values;
  let rule: RecurringExpense;
  if (!original) {
    if (scope !== 'ongoing' || terms.amount === 0) {
      throw new Error(
        'A new recurring expense needs a monthly amount greater than zero.',
      );
    }
    rule = {
      id: ruleId,
      start: month,
      schedules: [{ month, ...terms }],
      overrides: {},
    };
  } else if (scope === 'ongoing') {
    rule = {
      ...original,
      schedules: [
        ...original.schedules.filter((schedule) => schedule.month < month),
        { month, ...terms },
      ],
    };
  } else {
    const overrides = { ...original.overrides };
    if (scope === 'reset') {
      delete overrides[month];
    } else {
      overrides[month] = terms;
    }
    rule = { ...original, overrides };
  }
  rule = recurringExpenseSchema.parse(rule);

  return {
    ...state,
    version: 2,
    plans: state.plans.map((item) =>
      item.id === planId
        ? {
            ...item,
            recurringExpenses: original
              ? rules.map((saved) => (saved.id === ruleId ? rule : saved))
              : [...rules, rule],
          }
        : item,
    ),
  };
}
export function recurringRulesDiffer(state: AppState, plan: Plan) {
  const main = state.plans.find((item) => item.id === state.mainId);

  return (
    JSON.stringify(main?.recurringExpenses ?? []) !==
    JSON.stringify(plan.recurringExpenses ?? [])
  );
}
