import type { Plan } from '../../plans/types/plan.type';
import type { Goal } from '../types/goal.type';
import { addMonths } from '../../../lib/dates';
import { timeline } from '../../savings/utils/saving.utils';

export function goalForecast(plan: Plan, goal: Goal) {
  const start = goal.start > plan.start ? goal.start : plan.start;
  const end = addMonths(start, 119);

  return timeline(plan, end).find(
    (row) => row.month >= goal.start && row.closing >= goal.amount,
  );
}
