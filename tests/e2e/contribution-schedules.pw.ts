import { expect, test, type Page } from '@playwright/test';
import { exampleState } from '../../src/features/workspace/data/example-workspace';

const key = 'saving.workspace.v1';
async function openMonth(page: Page, month = '2026-09') {
  await page.clock.setFixedTime(new Date('2026-09-06T06:00:00Z'));
  await page.goto('/savings');
  await page.getByLabel('View month').fill(month);
}
async function editSchedule(page: Page, amount: string) {
  await page
    .getByRole('button', { name: 'Change ongoing saving', exact: true })
    .click();
  await expect(page.getByLabel('Apply change to')).toHaveValue('ongoing');
  await page.getByRole('dialog').getByRole('spinbutton').fill(amount);
}
async function save(page: Page) {
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
async function readWorkspace(page: Page) {
  return page.evaluate(
    (storageKey) => JSON.parse(localStorage.getItem(storageKey) ?? '{}'),
    key,
  );
}

test('ongoing changes persist, preserve next schedules, replace the same month, and allow zero', async ({
  page,
}) => {
  const state = exampleState();
  state.plans[0].schedules.push({ month: '2026-11', amount: 600000 });
  await page.goto('/');
  await page.evaluate(
    ({ key, state }) =>
      localStorage.setItem(key, JSON.stringify({ state, revision: 1 })),
    { key, state },
  );
  await openMonth(page);
  await editSchedule(page, '100000');
  await expect(page.getByRole('dialog')).toContainText('through October 2026');
  await expect(page.getByRole('dialog')).toContainText(
    '600,000 MMK schedule starts in November 2026',
  );
  await save(page);
  await expect(page.getByRole('status')).toContainText(
    'ongoing schedule from September 2026',
  );
  await expect(page.locator('.closing')).toContainText('160,000');
  await page.reload();
  await expect(page.locator('.closing')).toContainText('160,000');
  await page.getByLabel('View month').fill('2026-08');
  await expect(page.locator('.closing')).toContainText('750,000');
  await page.getByLabel('View month').fill('2026-10');
  await expect(page.locator('.closing')).toContainText('460,000');
  await page.getByLabel('View month').fill('2026-11');
  await expect(page.locator('.closing')).toContainText('1,060,000');
  await page.getByLabel('View month').fill('2026-09');
  await editSchedule(page, '0');
  await save(page);
  const saved = await readWorkspace(page);
  expect(saved.state.plans[0].schedules).toEqual([
    { month: '2026-07', amount: 300000 },
    { month: '2026-08', amount: 350000 },
    { month: '2026-09', amount: 0 },
    { month: '2026-11', amount: 600000 },
  ]);
  expect(saved.state.plans.slice(1)).toEqual(state.plans.slice(1));
  expect(saved.state.expenses).toEqual(state.expenses);
  await page.reload();
  await expect(page.locator('.closing')).toContainText('60,000');
});

test('ongoing changes preserve a month adjustment and reset reveals the new schedule', async ({
  page,
}) => {
  await openMonth(page);
  await page.getByRole('button', { name: 'Adjust this month' }).click();
  await page.getByRole('dialog').getByRole('spinbutton').fill('0');
  await save(page);
  await page
    .getByRole('button', { name: 'Change ongoing saving', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('spinbutton')).toHaveValue(
    '350000',
  );
  await expect(page.getByRole('dialog')).toContainText(
    '0 MMK adjustment will stay in place',
  );
  await page.getByRole('dialog').getByRole('spinbutton').fill('450000');
  await save(page);
  await expect(page.getByText('Adjusted', { exact: true })).toBeVisible();
  await expect(page.locator('.closing')).toContainText('60,000');
  await page.getByRole('button', { name: 'Adjust this month' }).click();
  await page.getByLabel('Apply change to').selectOption('reset');
  await save(page);
  await expect(page.locator('.closing')).toContainText('510,000');
  await expect(page.getByText('Automatic', { exact: true })).toBeVisible();
});

test('Saving records block month adjustments while allowing an ongoing schedule', async ({
  page,
}) => {
  const state = exampleState();
  state.plans[0].entries.push({
    id: 'saving',
    kind: 'contribution',
    amount: 50000,
    date: '2026-09-01',
    note: 'Saving',
    expenseId: 'saving-expense',
  });
  await page.goto('/');
  await page.evaluate(
    ({ key, state }) =>
      localStorage.setItem(key, JSON.stringify({ state, revision: 1 })),
    { key, state },
  );
  await openMonth(page);
  await expect(
    page.getByRole('button', { name: 'Adjust this month' }),
  ).toHaveCount(0);
  await editSchedule(page, '450000');
  await expect(page.getByRole('dialog')).toContainText(
    'Saving records will still determine this month',
  );
  await page.getByLabel('Apply change to').selectOption('month');
  await expect(
    page.getByRole('button', { name: 'Save', exact: true }),
  ).toBeDisabled();
  await page.getByLabel('Apply change to').selectOption('ongoing');
  await page.getByRole('dialog').getByRole('spinbutton').fill('450000');
  await save(page);
  await expect(page.getByText('Recorded', { exact: true })).toBeVisible();
  await expect(page.locator('.closing')).toContainText('110,000');
  await page.getByLabel('View month').fill('2026-10');
  await expect(page.locator('.closing')).toContainText('760,000');
  expect((await readWorkspace(page)).state.plans[0].entries).toEqual(
    state.plans[0].entries,
  );
});

test('validates amounts and retains ongoing draft after a storage failure for retry', async ({
  page,
}) => {
  await openMonth(page);
  await editSchedule(page, '-1');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('dialog').getByRole('spinbutton').fill('1.5');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('whole MMK');
  await page.getByRole('dialog').getByRole('spinbutton').fill('123456');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (...args) {
      Storage.prototype.setItem = original;
      throw new DOMException(
        `Storage is full (${args[0]}).`,
        'QuotaExceededError',
      );
    };
  });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Storage is full');
  await expect(page.getByRole('dialog').getByRole('spinbutton')).toHaveValue(
    '123456',
  );
  await expect(page.getByLabel('Apply change to')).toHaveValue('ongoing');
  expect(await readWorkspace(page)).toEqual({});
  await save(page);
  expect((await readWorkspace(page)).state.plans[0].schedules.at(-1)).toEqual({
    month: '2026-09',
    amount: 123456,
  });
});

test('two tabs retain schedule drafts, refresh effective-range details, and require explicit retry', async ({
  page,
  context,
}) => {
  const other = await context.newPage();
  await openMonth(page, '2026-10');
  await openMonth(other);
  await editSchedule(page, '600000');
  await editSchedule(other, '100000');
  await save(page);
  await expect(other.getByRole('dialog')).toContainText(
    '600,000 MMK schedule starts in October 2026',
  );
  await other.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(other.getByRole('alert')).toContainText(
    'changed in another tab',
  );
  await expect(other.getByRole('dialog').getByRole('spinbutton')).toHaveValue(
    '100000',
  );
  expect(
    (await readWorkspace(other)).state.plans[0].schedules.some(
      (item: { month: string }) => item.month === '2026-09',
    ),
  ).toBe(false);
  await save(other);
  const schedules = (await readWorkspace(other)).state.plans[0].schedules;
  expect(schedules.slice(-2)).toEqual([
    { month: '2026-09', amount: 100000 },
    { month: '2026-10', amount: 600000 },
  ]);
});

test('mobile schedule form explains past changes, cancels without writing, and restores focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openMonth(page, '2026-07');
  await editSchedule(page, '42');
  await expect(page.getByRole('dialog')).toContainText('past month');
  await expect(page.getByLabel('Starting month')).toHaveAttribute(
    'readonly',
    '',
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'artifacts/schedule-mobile.png',
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Change ongoing saving', exact: true }),
  ).toBeFocused();
  expect(await readWorkspace(page)).toEqual({});
});
