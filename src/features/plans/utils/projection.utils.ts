import type { Plan } from '../types/plan.type';
import type { MonthRow } from '../../savings/types/saving.type';
import { scheduled } from '../../savings/utils/saving.utils';
import {
  isDisplayMonth,
  monthNumber,
  shiftMonth,
} from '../../../lib/display-month';

// Sum schedule segments rather than building every intervening month. Browsing
// far ahead stays bounded by the saved records, not the forecast distance.
function closingBefore(plan: Plan, end: string): number {
  if (end < plan.start) {
    return plan.opening;
  }
  const schedules = [...plan.schedules].sort((a, b) =>
    a.month.localeCompare(b.month),
  );
  let total = plan.opening;
  schedules.forEach((schedule, i) => {
    const start = schedule.month < plan.start ? plan.start : schedule.month;
    const last = schedules[i + 1]
      ? shiftMonth(schedules[i + 1].month, -1)
      : end;
    const stop = last < end ? last : end;
    if (start <= stop) {
      total += (monthNumber(stop) - monthNumber(start) + 1) * schedule.amount;
    }
  });
  for (const [month, amount] of Object.entries(plan.overrides)) {
    if (month >= plan.start && month <= end) {
      total += amount - scheduled(plan, month);
    }
  }
  const recorded = new Map<string, number>();
  for (const entry of plan.entries) {
    const month = entry.date.slice(0, 7);
    if (month < plan.start || month > end) {
      continue;
    }
    if (entry.kind === 'contribution') {
      recorded.set(month, (recorded.get(month) ?? 0) + entry.amount);
    } else {
      total += entry.kind === 'extra' ? entry.amount : -entry.amount;
    }
  }
  for (const [month, amount] of recorded) {
    total += amount - (plan.overrides[month] ?? scheduled(plan, month));
  }

  return total;
}

export function projectedMonth(
  plan: Plan,
  month: string,
): MonthRow | undefined {
  if (!isDisplayMonth(month) || month < plan.start) {
    return undefined;
  }
  const entries = plan.entries.filter((entry) => entry.date.startsWith(month));
  const recorded = entries.filter((entry) => entry.kind === 'contribution');
  const schedule = scheduled(plan, month);
  const regular = recorded.length
    ? recorded.reduce((sum, entry) => sum + entry.amount, 0)
    : (plan.overrides[month] ?? schedule);
  const extra = entries
    .filter((entry) => entry.kind === 'extra')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const withdrawals = entries
    .filter((entry) => entry.kind === 'withdrawal')
    .reduce((sum, entry) => sum + entry.amount, 0);
  const opening = closingBefore(plan, shiftMonth(month, -1));
  const net = regular + extra - withdrawals;

  return {
    month,
    opening,
    regular,
    scheduled: schedule,
    extra,
    withdrawals,
    net,
    closing: opening + net,
    mode: recorded.length
      ? 'Recorded'
      : Object.hasOwn(plan.overrides, month)
        ? 'Adjusted'
        : 'Automatic',
  };
}
