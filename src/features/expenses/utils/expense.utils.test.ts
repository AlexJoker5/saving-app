import { describe, expect, it } from 'vitest';
import { exampleState } from '../../workspace/data/example-workspace';
import { deleteExpense, saveExpense } from './expense.utils';
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
    state = saveExpense(state, {
      ...expense,
      amount: 75000,
      date: '2026-10-11',
    });

    expect(
      getMain(state).entries.filter((entry) => entry.expenseId === expense.id),
    ).toMatchObject([{ amount: 75000, date: '2026-10-11' }]);

    state = saveExpense(state, { ...expense, source: 'budget' });

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
