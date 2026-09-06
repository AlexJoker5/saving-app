import { describe, expect, it } from 'vitest';
import { exampleState } from '../../workspace/data/example-workspace';
import { goalForecast } from '../../goals/utils/goal.utils';
import {
  balanceAt,
  changeContribution,
  nextSchedule,
  scheduled,
  timeline,
} from './saving.utils';
import { dateSchema, moneySchema } from '../../../lib/validation';

describe('savings calculations', () => {
  it('preserves the handoff balances for all three plans', () => {
    const state = exampleState();
    const balances = state.plans.map((plan) =>
      timeline(plan, '2026-11').map((row) => row.closing),
    );

    expect(balances).toEqual([
      [600000, 750000, 410000, 960000, 1310000],
      [600000, 650000, 1050000, 1650000, 2050000],
      [600000, 750000, 560000, 1260000, 1660000],
    ]);
  });

  it('accepts a zero month adjustment without changing the later schedule', () => {
    const plan = exampleState().plans[0];
    plan.overrides['2026-09'] = 0;
    const rows = timeline(plan, '2026-10');

    expect(rows[2]).toMatchObject({
      regular: 0,
      mode: 'Adjusted',
      closing: 60000,
    });
    expect(rows[3]).toMatchObject({ regular: 350000, closing: 610000 });
  });

  it('keeps a future entry out of current balance but in the monthly forecast', () => {
    const plan = exampleState().plans[0];

    expect(balanceAt(plan, '2026-10-10')).toBe(760000);
    expect(timeline(plan, '2026-10').at(-1)?.closing).toBe(960000);
  });

  it('finds the agreed goal months without mutating any plan', () => {
    const state = exampleState();
    const original = structuredClone(state);
    const months = state.plans.map(
      (plan) => goalForecast(plan, state.goals[0])?.month,
    );

    expect(months).toEqual(['2027-04', '2027-02', '2027-03']);
    expect(state).toEqual(original);
  });

  it('rejects impossible calendar dates and fractional MMK inputs', () => {
    expect(dateSchema.safeParse('2026-02-30').success).toBe(false);
    expect(dateSchema.safeParse('2028-02-29').success).toBe(true);
    expect(moneySchema.safeParse(100.5).success).toBe(false);
    expect(moneySchema.safeParse(-1).success).toBe(false);
    expect(moneySchema.safeParse(0).success).toBe(true);
  });
});

describe('monthly contribution changes', () => {
  it('saves a zero adjustment, carries the difference forward, and leaves snapshots untouched', () => {
    const original = exampleState();
    const before = structuredClone(original);
    const next = changeContribution(original, original.mainId, {
      month: '2026-09',
      amount: 0,
      scope: 'month',
    });

    expect(original).toEqual(before);
    expect(next.plans.slice(1)).toEqual(before.plans.slice(1));
    expect(next.expenses).toEqual(before.expenses);
    expect(timeline(next.plans[0], '2026-10').slice(2)).toMatchObject([
      { regular: 0, mode: 'Adjusted', closing: 60000 },
      { regular: 350000, mode: 'Automatic', closing: 610000 },
    ]);
  });

  it('resets an adjustment to the schedule without changing other months', () => {
    const state = exampleState();
    state.plans[0].overrides = { '2026-09': 0, '2026-10': 10 };
    const next = changeContribution(state, state.mainId, {
      month: '2026-09',
      amount: 0,
      scope: 'reset',
    });

    expect(next.plans[0].overrides).toEqual({ '2026-10': 10 });
    expect(timeline(next.plans[0], '2026-09').at(-1)).toMatchObject({
      regular: 350000,
      mode: 'Automatic',
      closing: 410000,
    });
  });

  it('rejects changes hidden by Saving records, including resets', () => {
    const state = exampleState();
    state.plans[0].entries.push({
      id: 'saving-record',
      date: '2026-09-30',
      kind: 'contribution',
      amount: 500,
      note: 'Saving',
      expenseId: 'expense-saving',
    });
    for (const scope of ['month', 'reset'] as const) {
      expect(() =>
        changeContribution(state, state.mainId, {
          month: '2026-09',
          amount: 0,
          scope,
        }),
      ).toThrow('Saving records');
    }
  });

  it('rejects invalid amounts, dates before the plan, and missing plans', () => {
    const state = exampleState();
    expect(() =>
      changeContribution(state, state.mainId, {
        month: '2026-06',
        amount: 1,
        scope: 'month',
      }),
    ).toThrow('start month');
    expect(() =>
      changeContribution(state, 'missing', {
        month: '2026-09',
        amount: 1,
        scope: 'month',
      }),
    ).toThrow('not be found');
    expect(() =>
      changeContribution(state, state.mainId, {
        month: '2026-09',
        amount: 1.5,
        scope: 'month',
      }),
    ).toThrow();
  });
});

describe('ongoing contribution schedules', () => {
  it('applies at the selected month until the next schedule and preserves earlier history', () => {
    const state = exampleState();
    state.plans[0].schedules.push({ month: '2026-11', amount: 600000 });
    const before = structuredClone(state);
    const next = changeContribution(state, state.mainId, {
      month: '2026-09',
      amount: 100000,
      scope: 'ongoing',
    });
    const rows = timeline(next.plans[0], '2026-12');
    expect(rows.slice(0, 2)).toEqual(timeline(state.plans[0], '2026-08'));
    expect(
      rows.slice(2).map(({ regular, closing }) => [regular, closing]),
    ).toEqual([
      [100000, 160000],
      [100000, 460000],
      [600000, 1060000],
      [600000, 1660000],
    ]);
    expect(balanceAt(next.plans[0], '2026-08-31')).toBe(
      balanceAt(state.plans[0], '2026-08-31'),
    );
    expect(balanceAt(next.plans[0], '2026-09-01')).toBe(850000);
    expect(state).toEqual(before);
    expect(next.plans.slice(1)).toEqual(before.plans.slice(1));
    expect(next.expenses).toEqual(before.expenses);
    expect(next.goals).toEqual(before.goals);
    expect(next.plans[0].entries).toEqual(before.plans[0].entries);
  });

  it('replaces the same effective month, allows zero, and keeps later schedules', () => {
    const state = exampleState();
    state.plans[0].schedules.reverse();
    const next = changeContribution(state, state.mainId, {
      month: '2026-07',
      amount: 0,
      scope: 'ongoing',
    });
    expect(next.plans[0].schedules).toEqual([
      { month: '2026-07', amount: 0 },
      { month: '2026-08', amount: 350000 },
    ]);
    expect(
      timeline(next.plans[0], '2026-08').map((row) => row.regular),
    ).toEqual([0, 350000]);
    const changed = changeContribution(next, state.mainId, {
      month: '2026-07',
      amount: 50000,
      scope: 'ongoing',
    });
    expect(
      changed.plans[0].schedules.filter((item) => item.month === '2026-07'),
    ).toEqual([{ month: '2026-07', amount: 50000 }]);
  });

  it('retains overrides and Saving records, including those in the effective month', () => {
    const state = exampleState();
    const plan = state.plans[0];
    plan.overrides = { '2026-09': 0, '2026-10': 150000 };
    plan.entries.push({
      id: 'record',
      kind: 'contribution',
      date: '2026-09-30',
      amount: 250000,
      note: 'Saving',
      expenseId: 'saving',
    });
    const next = changeContribution(state, state.mainId, {
      month: '2026-09',
      amount: 450000,
      scope: 'ongoing',
    });
    expect(next.plans[0].overrides).toEqual(plan.overrides);
    expect(timeline(next.plans[0], '2026-11').slice(2)).toMatchObject([
      { regular: 250000, mode: 'Recorded' },
      { regular: 150000, mode: 'Adjusted' },
      { regular: 450000, mode: 'Automatic' },
    ]);
    const reset = changeContribution(next, state.mainId, {
      month: '2026-10',
      amount: 0,
      scope: 'reset',
    });
    expect(timeline(reset.plans[0], '2026-10').at(-1)?.regular).toBe(450000);
    expect(balanceAt(next.plans[0], '2026-09-01')).toBe(750000);
  });

  it('validates effective months and money and supports the final allowed month', () => {
    const state = exampleState();
    for (const month of ['2026-06', '2026-13', '2100-01']) {
      expect(() =>
        changeContribution(state, state.mainId, {
          month,
          amount: 1,
          scope: 'ongoing',
        }),
      ).toThrow();
    }
    for (const amount of [-1, 1.5, NaN, 1_000_000_000_001]) {
      expect(() =>
        changeContribution(state, state.mainId, {
          month: '2026-09',
          amount,
          scope: 'ongoing',
        }),
      ).toThrow();
    }
    expect(() =>
      changeContribution(state, 'missing', {
        month: '2026-09',
        amount: 1,
        scope: 'ongoing',
      }),
    ).toThrow('not be found');
    const next = changeContribution(state, state.mainId, {
      month: '2099-12',
      amount: 0,
      scope: 'ongoing',
    });
    expect(scheduled(next.plans[0], '2099-12')).toBe(0);
    expect(nextSchedule(next.plans[0], '2099-12')).toBeUndefined();
    expect(nextSchedule(next.plans[0], '2026-07')).toEqual({
      month: '2026-08',
      amount: 350000,
    });
  });
});
