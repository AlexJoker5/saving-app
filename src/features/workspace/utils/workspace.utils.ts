import type { AppState } from '../types/workspace.type';
import { id } from '../../../lib/id';

export function createBlank(
  start: string,
  opening: number,
  monthly: number,
  budget: number,
): AppState {
  const mainId = id();

  return {
    version: 1,
    demo: false,
    mainId,
    budget,
    plans: [
      {
        id: mainId,
        name: 'My savings',
        start,
        opening,
        schedules: [{ month: start, amount: monthly }],
        overrides: {},
        entries: [],
      },
    ],
    expenses: [],
    goals: [],
  };
}
