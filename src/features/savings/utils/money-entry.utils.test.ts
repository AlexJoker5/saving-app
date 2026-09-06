import { describe, expect, it } from 'vitest';
import { exampleState } from '../../workspace/data/example-workspace';
import {
  balanceAt,
  deleteMoneyEntry,
  saveMoneyEntry,
  timeline,
} from './saving.utils';
import type { DirectEntry } from '../types/saving.type';

const addition: DirectEntry = {
  id: 'bonus',
  kind: 'extra',
  date: '2026-09-10',
  amount: 100000,
  note: 'Bonus',
};

describe('direct savings entries', () => {
  it('creates an addition, recalculates following months, and leaves every other plan and expense untouched', () => {
    const state = exampleState();
    const original = structuredClone(state);
    const next = saveMoneyEntry(state, state.mainId, addition);
    expect(state).toEqual(original);
    expect(next.plans.slice(1)).toEqual(state.plans.slice(1));
    expect(next.expenses).toEqual(state.expenses);
    expect(next.goals).toEqual(state.goals);
    expect(timeline(next.plans[0], '2026-10').slice(2)).toMatchObject([
      { closing: 510000 },
      { opening: 510000, closing: 1060000 },
    ]);
    expect(balanceAt(next.plans[0], '2026-09-06')).toBe(410000);
    expect(balanceAt(next.plans[0], '2026-09-10')).toBe(510000);
  });

  it('edits date, amount and reason once, moving the effect to another month', () => {
    const state = exampleState();
    const created = saveMoneyEntry(state, state.mainId, addition);
    const next = saveMoneyEntry(
      created,
      state.mainId,
      {
        ...addition,
        date: '2026-10-10',
        amount: 200000,
        note: '  Revised bonus  ',
      },
      addition.id,
    );
    expect(
      next.plans[0].entries.filter((entry) => entry.id === addition.id),
    ).toEqual([
      {
        ...addition,
        date: '2026-10-10',
        amount: 200000,
        note: 'Revised bonus',
      },
    ]);
    expect(timeline(next.plans[0], '2026-10').slice(2)).toMatchObject([
      { closing: 410000 },
      { closing: 1160000 },
    ]);
    expect(created.plans[0].entries.at(-1)).toEqual(addition);
  });

  it('creates and deletes a withdrawal without touching snapshots or expense history', () => {
    const state = exampleState();
    const created = saveMoneyEntry(state, state.mainId, {
      ...addition,
      kind: 'withdrawal',
    });
    expect(timeline(created.plans[0], '2026-09').at(-1)?.closing).toBe(310000);
    const deleted = deleteMoneyEntry(created, state.mainId, addition.id);
    expect(deleted).toEqual(state);
    expect(created.plans[0].entries).toHaveLength(
      state.plans[0].entries.length + 1,
    );
  });

  it('never recreates a deleted entry or overwrites an existing entry through create', () => {
    const state = exampleState();
    expect(() =>
      saveMoneyEntry(state, state.mainId, addition, addition.id),
    ).toThrow('no longer exists');
    const created = saveMoneyEntry(state, state.mainId, addition);
    expect(() => saveMoneyEntry(created, state.mainId, addition)).toThrow(
      'already exists',
    );
    expect(() => deleteMoneyEntry(state, state.mainId, 'missing')).toThrow(
      'no longer exists',
    );
  });

  it('protects persisted expense links and contribution records even if the input removes their ownership', () => {
    for (const record of [
      { ...addition, kind: 'withdrawal' as const, expenseId: 'expense' },
      { ...addition, kind: 'contribution' as const },
    ]) {
      const state = exampleState();
      state.plans[0].entries.push(record);
      expect(() =>
        saveMoneyEntry(
          state,
          state.mainId,
          { ...addition, kind: 'withdrawal' },
          addition.id,
        ),
      ).toThrow('expenses flow');
      expect(() => deleteMoneyEntry(state, state.mainId, addition.id)).toThrow(
        'expenses flow',
      );
    }
  });

  it('rejects invalid entries, missing plans, pre-start dates, and identity/type changes', () => {
    const state = exampleState();
    for (const input of [
      { ...addition, amount: 0 },
      { ...addition, amount: -1 },
      { ...addition, amount: 0.5 },
      { ...addition, note: ' ' },
      { ...addition, date: '2026-02-30' },
      { ...addition, expenseId: 'forged' },
      { ...addition, kind: 'contribution' },
    ]) {
      expect(() =>
        saveMoneyEntry(state, state.mainId, input as DirectEntry),
      ).toThrow();
    }
    expect(() =>
      saveMoneyEntry(state, state.mainId, { ...addition, date: '2026-06-30' }),
    ).toThrow('start month');
    expect(() => saveMoneyEntry(state, 'missing', addition)).toThrow(
      'not be found',
    );
    expect(() => deleteMoneyEntry(state, 'missing', 'bonus')).toThrow(
      'not be found',
    );
    const created = saveMoneyEntry(state, state.mainId, addition);
    expect(() =>
      saveMoneyEntry(
        created,
        state.mainId,
        { ...addition, id: 'changed' },
        addition.id,
      ),
    ).toThrow('identity');
    expect(() =>
      saveMoneyEntry(
        created,
        state.mainId,
        { ...addition, kind: 'withdrawal' },
        addition.id,
      ),
    ).toThrow('identity');
  });
});
