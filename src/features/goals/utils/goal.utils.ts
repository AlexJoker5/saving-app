import type { Plan } from '../../plans/types/plan.type';
import type { Goal } from '../types/goal.type';
import type { AppState } from '../../workspace/types/workspace.type';
import { goalSchema } from '../schema/goal.schema';
import { addMonths } from '../../../lib/dates';
import { timeline } from '../../savings/utils/saving.utils';

export function goalForecastRange(plan: Plan, goal: Goal) {
  const start = goal.start > plan.start ? goal.start : plan.start;
  const requestedEnd = addMonths(start, 119);
  // The shared timeline supports 100 years from the plan's start.
  const timelineEnd = addMonths(plan.start, 1199);

  return {
    start,
    end: requestedEnd < timelineEnd ? requestedEnd : timelineEnd,
  };
}

export function goalForecast(plan: Plan, goal: Goal) {
  const { start, end } = goalForecastRange(plan, goal);

  return timeline(plan, end).find(
    (row) => row.month >= start && row.closing >= goal.amount,
  );
}

export function saveGoal(
  state: AppState,
  input: Goal,
  editingId?: string,
): AppState {
  const goal = goalSchema.parse(input);
  if (editingId !== undefined) {
    if (!state.goals.some((item) => item.id === editingId)) {
      throw new Error(
        'This goal no longer exists. Close the form and review your goals.',
      );
    }
    if (goal.id !== editingId) {
      throw new Error('An edit must keep the goal’s identity.');
    }
  } else if (state.goals.some((item) => item.id === goal.id)) {
    throw new Error(
      'This goal already exists. Close the form and review your goals.',
    );
  }

  return {
    ...state,
    goals:
      editingId === undefined
        ? [...state.goals, goal]
        : state.goals.map((item) => (item.id === editingId ? goal : item)),
  };
}

export function deleteGoal(state: AppState, goalId: string): AppState {
  if (!state.goals.some((goal) => goal.id === goalId)) {
    throw new Error(
      'This goal no longer exists. Close the dialog and review your goals.',
    );
  }

  return { ...state, goals: state.goals.filter((goal) => goal.id !== goalId) };
}
