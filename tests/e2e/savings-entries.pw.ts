import { expect, test, type Page } from '@playwright/test';
import { exampleState } from '../../src/features/workspace/data/example-workspace';

const key = 'saving.workspace.v1';
async function openMonth(page: Page, month = '2026-09') {
  await page.clock.setFixedTime(new Date('2026-09-06T06:00:00Z'));
  await page.goto('/savings');
  await page.getByLabel('View month').fill(month);
}
async function fillEntry(
  page: Page,
  amount: string,
  date: string,
  reason: string,
) {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('spinbutton').fill(amount);
  await dialog.getByLabel('Date', { exact: true }).fill(date);
  await dialog.getByLabel(/^Reason/).fill(reason);
}
async function save(page: Page) {
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('adds, edits across months, cancels deletion, confirms deletion and persists balances', async ({
  page,
}) => {
  await openMonth(page);
  await page.getByRole('button', { name: 'Add extra money' }).click();
  await fillEntry(page, '100000', '2026-09-10', 'Test bonus');
  await save(page);
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Test bonus' }),
  ).toContainText('Planned');
  await expect(page.locator('.closing')).toContainText('510,000');
  await expect(
    page.getByRole('region', { name: 'Current savings' }),
  ).toContainText('410,000');
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Edit Test bonus' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Edit Test bonus' }).click();
  await fillEntry(page, '200000', '2026-10-01', 'Revised bonus');
  await save(page);
  await expect(page.getByLabel('View month')).toHaveValue('2026-10');
  await expect(page.locator('.closing')).toContainText('1,160,000');
  await page.getByRole('button', { name: 'Delete Revised bonus' }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Delete Revised bonus' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Delete Revised bonus' }).click();
  await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Savings entries' }),
  ).toBeFocused();
  await expect(page.locator('.closing')).toContainText('960,000');
  await page.reload();
  await page.getByLabel('View month').fill('2026-10');
  await expect(page.getByText('Revised bonus', { exact: true })).toHaveCount(0);
});

test('withdrawal subtracts money and form rejects invalid amounts and dates', async ({
  page,
}) => {
  await openMonth(page);
  await page.getByRole('button', { name: 'Add withdrawal' }).click();
  await fillEntry(page, '0', '2026-09-06', '');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(2);
  await fillEntry(page, '100000', '2026-06-30', 'Cash withdrawal');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('before the plan starts');
  await fillEntry(page, '100000', '2026-09-06', 'Cash withdrawal');
  await save(page);
  await expect(page.locator('.closing')).toContainText('310,000');
  await page.reload();
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Cash withdrawal' }),
  ).toContainText('− 100,000 MMK');
});

test('entry save and delete failures retain the record and allow retry', async ({
  page,
}) => {
  await openMonth(page);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (sessionStorage.getItem('fail-writes') === 'yes') {
        throw new Error('Storage is full');
      }
      original.call(this, key, value);
    };
    sessionStorage.setItem('fail-writes', 'yes');
  });
  await page.getByRole('button', { name: 'Add extra money' }).click();
  await fillEntry(page, '50000', '2026-09-06', 'Keep my draft');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Storage is full');
  await expect(page.getByRole('dialog').getByLabel('Reason')).toHaveValue(
    'Keep my draft',
  );
  await page.evaluate(() => sessionStorage.removeItem('fail-writes'));
  await save(page);
  await page.evaluate(() => sessionStorage.setItem('fail-writes', 'yes'));
  await page.getByRole('button', { name: 'Delete Keep my draft' }).click();
  await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Storage is full');
  await page.evaluate(() => sessionStorage.removeItem('fail-writes'));
  await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Keep my draft' }),
  ).toHaveCount(0);
});

test('expense-owned records are labelled and have no edit or delete actions', async ({
  page,
}) => {
  const state = exampleState();
  state.plans[0].entries.push({
    id: 'linked',
    expenseId: 'expense',
    kind: 'withdrawal',
    date: '2026-09-06',
    amount: 500,
    note: 'Linked purchase',
  });
  await page.addInitScript(
    ({ key, state }) =>
      localStorage.setItem(key, JSON.stringify({ state, revision: 1 })),
    { key, state },
  );
  await openMonth(page);
  const row = page.getByRole('listitem').filter({ hasText: 'Linked purchase' });
  await expect(row).toContainText('Managed in expenses');
  await expect(row.getByRole('button')).toHaveCount(0);
});

test('concurrent edits reject stale drafts and retry after explicit review', async ({
  page,
  context,
}) => {
  await openMonth(page);
  const second = await context.newPage();
  await openMonth(second);
  await page
    .getByRole('button', { name: 'Edit Family support & essentials' })
    .click();
  await second
    .getByRole('button', { name: 'Edit Family support & essentials' })
    .click();
  await fillEntry(page, '100000', '2026-09-02', 'First change');
  await fillEntry(second, '200000', '2026-09-02', 'Second change');
  await save(page);
  await expect(
    second.getByRole('listitem').filter({ hasText: 'First change' }),
  ).toBeVisible();
  await second.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(second.getByRole('alert')).toContainText(
    'changed in another tab',
  );
  await expect(second.getByRole('dialog').getByLabel('Reason')).toHaveValue(
    'Second change',
  );
  await save(second);
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Second change' }),
  ).toBeVisible();
});

test('editing a record deleted by another tab does not resurrect it', async ({
  page,
  context,
}) => {
  await openMonth(page);
  const second = await context.newPage();
  await openMonth(second);
  await second
    .getByRole('button', { name: 'Edit Family support & essentials' })
    .click();
  await page
    .getByRole('button', { name: 'Delete Family support & essentials' })
    .click();
  await page.getByRole('button', { name: 'Delete entry', exact: true }).click();
  await expect(
    second
      .getByRole('listitem')
      .filter({ hasText: 'Family support & essentials' }),
  ).toHaveCount(0);
  await second.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(second.getByRole('alert')).toContainText('no longer exists');
  await expect(second.getByRole('dialog')).toBeVisible();
});

test('entry list and editor fit mobile screens and Escape returns focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openMonth(page);
  await page.getByRole('button', { name: 'Add extra money' }).click();
  await fillEntry(page, '1000', '2026-09-06', 'Mobile entry');
  await page.screenshot({
    path: 'artifacts/entry-form-mobile.png',
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Add extra money' }),
  ).toBeFocused();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page
    .getByRole('heading', { name: 'Savings entries' })
    .scrollIntoViewIfNeeded();
  await page.screenshot({
    path: 'artifacts/entries-mobile.png',
    fullPage: true,
  });
});

test('deletion requires another confirmation after another tab edits the entry', async ({
  page,
  context,
}) => {
  await openMonth(page);
  const second = await context.newPage();
  await openMonth(second);
  await second
    .getByRole('button', { name: 'Delete Family support & essentials' })
    .click();
  await page
    .getByRole('button', { name: 'Edit Family support & essentials' })
    .click();
  await fillEntry(page, '90000', '2026-09-02', 'Updated expense reason');
  await save(page);
  await expect(second.getByRole('dialog')).toContainText(
    'Updated expense reason',
  );
  await second
    .getByRole('button', { name: 'Delete entry', exact: true })
    .click();
  await expect(second.getByRole('alert')).toContainText(
    'changed in another tab',
  );
  await expect(second.getByRole('dialog')).toContainText('90,000 MMK');
  await second
    .getByRole('button', { name: 'Delete entry', exact: true })
    .click();
  await expect(second.getByRole('dialog')).toHaveCount(0);
  await expect(
    page.getByRole('listitem').filter({ hasText: 'Updated expense reason' }),
  ).toHaveCount(0);
});
