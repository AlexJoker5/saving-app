import type { MonthRow } from '../types/saving.type';
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
