import type { AppState } from '../types/workspace.type';
import type { Plan } from '../../plans/types/plan.type';

export function exampleState(): AppState {
  const main: Plan = {
    id: 'main',
    name: 'My savings',
    start: '2026-07',
    opening: 300000,
    schedules: [
      { month: '2026-07', amount: 300000 },
      { month: '2026-08', amount: 350000 },
    ],
    overrides: {},
    entries: [
      {
        id: 'aug-medical',
        date: '2026-08-12',
        amount: 200000,
        kind: 'withdrawal',
        note: 'Unexpected medical expenses',
      },
      {
        id: 'sep-withdrawal',
        date: '2026-09-02',
        amount: 690000,
        kind: 'withdrawal',
        note: 'Family support & essentials',
      },
      {
        id: 'oct-bonus',
        date: '2026-10-15',
        amount: 200000,
        kind: 'extra',
        note: 'A little birthday bonus',
      },
    ],
  };
  const raise: Plan = {
    ...structuredClone(main),
    id: 'raise',
    name: 'With a raise',
    sourceId: 'main',
    schedules: [...main.schedules, { month: '2026-09', amount: 400000 }],
    entries: [
      ...main.entries.filter((e) => e.id !== 'sep-withdrawal'),
      {
        id: 'aug-extra',
        date: '2026-08-20',
        amount: 100000,
        kind: 'withdrawal',
        note: 'Additional August spending',
      },
    ],
  };
  const more: Plan = {
    ...structuredClone(main),
    id: 'raise-more',
    name: 'A bigger possibility',
    sourceId: 'main',
    schedules: [
      ...main.schedules,
      { month: '2026-09', amount: 500000 },
      { month: '2026-11', amount: 400000 },
    ],
  };

  return {
    version: 1,
    demo: true,
    mainId: 'main',
    budget: 600000,
    plans: [main, raise, more],
    expenses: [
      {
        id: 'e1',
        date: '2026-09-05',
        amount: 18500,
        label: 'Food & drinks',
        source: 'budget',
        note: 'Coffee & a catch-up',
      },
      {
        id: 'e2',
        date: '2026-09-04',
        amount: 45000,
        label: 'Shopping',
        source: 'budget',
        note: 'A few everyday essentials',
      },
      {
        id: 'e3',
        date: '2026-09-04',
        amount: 8500,
        label: 'Transport',
        source: 'budget',
        note: 'Ride to work',
      },
      {
        id: 'e4',
        date: '2026-09-03',
        amount: 32000,
        label: 'Food & drinks',
        source: 'budget',
        note: 'Weekly groceries',
      },
      {
        id: 'e5',
        date: '2026-09-01',
        amount: 85000,
        label: 'Bills',
        source: 'budget',
        note: 'Internet & utilities',
      },
    ],
    goals: [
      {
        id: 'g1',
        name: 'iPhone 13 Pro',
        amount: 3000000,
        start: '2026-07',
        note: 'A little upgrade, without the worry.',
      },
      {
        id: 'g2',
        name: 'A well-earned getaway',
        amount: 1500000,
        start: '2026-07',
        note: 'Somewhere new. A slower pace.',
      },
    ],
  };
}
