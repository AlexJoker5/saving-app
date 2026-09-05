import { describe, expect, it } from 'vitest';
import { exampleState } from '../../workspace/data/example-workspace';
import { goalForecast } from '../../goals/utils/goal.utils';
import { balanceAt, changeContribution, timeline } from './saving.utils';
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

  it('rejects invalid amounts, dates before the plan, missing plans, and unwired schedule changes', () => {
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
    expect(() =>
      changeContribution(state, state.mainId, {
        month: '2026-09',
        amount: 1,
        scope: 'ongoing',
      }),
    ).toThrow('not available');
  });
});
