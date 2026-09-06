import { describe, expect, it } from 'vitest';
import { exampleState } from '../../workspace/data/example-workspace';
import { deleteExpense, expenseTotals, saveExpense } from './expense.utils';
import {
  promote,
  promotionConflicts,
  reconcilePlan,
  snapshot,
} from '../../plans/utils/plan.utils';
import { timeline } from '../../savings/utils/saving.utils';
import type { AppState } from '../../workspace/types/workspace.type';
import type { Expense } from '../types/expense.type';

const expense: Expense = {
  id: 'medical',
  amount: 70000,
  date: '2026-09-11',
  label: 'Health',
  source: 'savings',
  note: 'Medical appointment',
};

function getMain(state: AppState) {
  const main = state.plans.find((plan) => plan.id === state.mainId);

  if (!main) {
    throw new Error('Test workspace has no Main plan.');
  }

  return main;
}

describe('connected expense transactions', () => {
  it('saves both records without changing the original state or other plans', () => {
    const original = exampleState();
    const next = saveExpense(original, expense);

    expect(original.expenses.some((record) => record.id === expense.id)).toBe(
      false,
    );
    expect(next.expenses).toContainEqual(expense);
    expect(getMain(next).entries.at(-1)).toMatchObject({
      expenseId: expense.id,
      amount: 70000,
      kind: 'withdrawal',
    });
    expect(next.plans[1]).toEqual(original.plans[1]);
  });

  it('moves and edits the connected withdrawal, then removes it on source change', () => {
    let state = saveExpense(exampleState(), expense);
    state = saveExpense(
      state,
      {
        ...expense,
        amount: 75000,
        date: '2026-10-11',
      },
      expense.id,
    );

    expect(
      getMain(state).entries.filter((entry) => entry.expenseId === expense.id),
    ).toMatchObject([{ amount: 75000, date: '2026-10-11' }]);

    state = saveExpense(state, { ...expense, source: 'budget' }, expense.id);

    expect(
      getMain(state).entries.some((entry) => entry.expenseId === expense.id),
    ).toBe(false);
    expect(
      state.expenses.filter((record) => record.id === expense.id),
    ).toHaveLength(1);
  });

  it('uses recorded savings instead of the automatic amount and restores it on delete', () => {
    const record: Expense = {
      ...expense,
      label: 'Saving',
      source: 'budget',
      amount: 200000,
    };
    const state = saveExpense(exampleState(), record);

    expect(timeline(getMain(state), '2026-09').at(-1)).toMatchObject({
      regular: 200000,
      mode: 'Recorded',
    });

    const deleted = deleteExpense(state, record.id);

    expect(timeline(getMain(deleted), '2026-09').at(-1)).toMatchObject({
      regular: 350000,
      mode: 'Automatic',
    });
  });

  it('keeps snapshots independent and requires explicit reconciliation before promotion', () => {
    const initial = snapshot(exampleState(), 'main', 'Independent copy');
    const copiedPlan = initial.plans.at(-1);

    if (!copiedPlan) {
      throw new Error('Snapshot was not created.');
    }

    const updated = saveExpense(initial, expense);

    expect(updated.plans.at(-1)).toEqual(copiedPlan);
    expect(promotionConflicts(updated, copiedPlan)).toEqual([expense.id]);
    expect(() => promote(updated, copiedPlan.id)).toThrow('Resolve connected');

    const reconciled = reconcilePlan(updated, copiedPlan.id);
    const promoted = promote(reconciled, copiedPlan.id);

    expect(promoted.mainId).toBe(copiedPlan.id);
    expect(promoted.plans).toHaveLength(initial.plans.length);
    expect(promoted.expenses).toEqual(updated.expenses);
  });

  it('rejects a savings-to-savings contribution', () => {
    expect(() =>
      saveExpense(exampleState(), { ...expense, label: 'Saving' }),
    ).toThrow();
  });
});

describe('expense command guards and summaries', () => {
  it('does not overwrite a duplicate create, change identity, or resurrect a deleted expense', () => {
    const state = saveExpense(exampleState(), expense);
    expect(() => saveExpense(state, { ...expense, amount: 100 })).toThrow(
      'already exists',
    );
    expect(() =>
      saveExpense(state, { ...expense, id: 'other' }, expense.id),
    ).toThrow('identity');
    const deleted = deleteExpense(state, expense.id);
    expect(() => saveExpense(deleted, expense, expense.id)).toThrow(
      'no longer exists',
    );
    expect(() => deleteExpense(deleted, expense.id)).toThrow(
      'no longer exists',
    );
    expect(
      getMain(deleted).entries.some((entry) => entry.expenseId === expense.id),
    ).toBe(false);
  });

  it('validates money, identity, dates, and Main before changing records', () => {
    const state = exampleState();
    const before = structuredClone(state);
    for (const invalid of [
      { ...expense, amount: 0 },
      { ...expense, amount: -1 },
      { ...expense, amount: 1.5 },
      { ...expense, amount: 1_000_000_000_001 },
      { ...expense, id: '' },
      { ...expense, date: '2026-02-30' },
      { ...expense, date: '2026-06-30', source: 'budget' as const },
    ]) {
      expect(() => saveExpense(state, invalid)).toThrow();
    }
    expect(() => saveExpense({ ...state, mainId: 'missing' }, expense)).toThrow(
      'Main',
    );
    expect(() => deleteExpense({ ...state, mainId: 'missing' }, 'e1')).toThrow(
      'Main',
    );
    expect(state).toEqual(before);
  });

  it('protects a direct savings entry from a generated-link identity collision', () => {
    const state = exampleState();
    getMain(state).entries.push({
      id: 'expense-medical',
      date: '2026-09-01',
      kind: 'extra',
      amount: 1,
      note: 'Unrelated entry',
    });
    expect(() => saveExpense(state, expense)).toThrow(
      'different savings entry',
    );
    expect(getMain(state).entries.at(-1)?.note).toBe('Unrelated entry');
  });

  it('rebuilds links when converting a withdrawal to Saving and preserves an override after the final deletion', () => {
    const original = exampleState();
    getMain(original).overrides['2026-09'] = 0;
    let state = saveExpense(original, { ...expense, date: '2026-09-01' });
    state = saveExpense(
      state,
      { ...expense, label: 'Saving', source: 'budget', amount: 100000 },
      expense.id,
    );
    state = saveExpense(state, {
      ...expense,
      id: 'second-saving',
      label: 'Saving',
      source: 'budget',
      amount: 50000,
    });
    expect(timeline(getMain(state), '2026-09').at(-1)).toMatchObject({
      regular: 150000,
      mode: 'Recorded',
      withdrawals: 690000,
    });
    state = deleteExpense(state, expense.id);
    expect(timeline(getMain(state), '2026-09').at(-1)?.regular).toBe(50000);
    state = deleteExpense(state, 'second-saving');
    expect(timeline(getMain(state), '2026-09').at(-1)).toMatchObject({
      regular: 0,
      mode: 'Adjusted',
    });
    expect(state.plans.slice(1)).toEqual(original.plans.slice(1));
    expect(state.goals).toEqual(original.goals);
  });

  it('separates Saving records from budget and savings spending without automatic overdraft transfers', () => {
    const state = saveExpense(exampleState(), {
      ...expense,
      source: 'budget',
      amount: 900000,
    });
    expect(getMain(state).entries).toEqual(getMain(exampleState()).entries);
    expect(
      expenseTotals([
        { ...expense, source: 'budget', amount: 900000 },
        { ...expense, id: 'withdrawal', amount: 100000 },
        {
          ...expense,
          id: 'saving',
          label: 'Saving',
          source: 'budget',
          amount: 50000,
        },
      ]),
    ).toEqual({
      budgetSpending: 900000,
      savingsSpending: 100000,
      recordedSaving: 50000,
    });
  });
});
