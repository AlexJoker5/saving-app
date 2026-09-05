import { describe, expect, it } from 'vitest';
import { exampleState } from '../../workspace/data/example-workspace';
import { goalForecast } from '../../goals/utils/goal.utils';
import { balanceAt, timeline } from './saving.utils';
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
