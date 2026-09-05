import { expect, test, type Page } from '@playwright/test';

const storageKey = 'saving.workspace.v1';

async function openSeptember(page: Page) {
  await page.goto('/savings');
  await page.getByLabel('View month').fill('2026-09');
  await expect(
    page.getByRole('heading', { name: 'September 2026' }),
  ).toBeVisible();
}

async function openAdjustment(page: Page, amount: string) {
  await page.getByRole('button', { name: 'Adjust this month' }).click();
  await page.getByRole('dialog').getByRole('spinbutton').fill(amount);
}

async function savedAmount(page: Page) {
  return page.evaluate((key) => {
    const saved = JSON.parse(localStorage.getItem(key) ?? '{}');

    return saved.state?.plans.find(
      (plan: { id: string }) => plan.id === saved.state.mainId,
    )?.overrides['2026-09'];
  }, storageKey);
}

test('example renders without saving, navigates months, and handles unknown routes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect(page).toHaveURL(/\/savings$/);
  await expect(
    page.getByText('Example workspace', { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBeNull();
  await page.getByLabel('View month').fill('2026-07');
  await expect(
    page.getByRole('button', { name: 'Previous month' }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(
    page.getByRole('heading', { name: 'August 2026' }),
  ).toBeVisible();
  await page.screenshot({
    path: 'artifacts/savings-desktop.png',
    fullPage: true,
  });
  await page.goto('/unknown/nested');
  await expect(page.getByRole('heading')).toContainText('Page not found');
  expect(errors).toEqual([]);
});

test('setup validates, saves a personal workspace, and survives reload', async ({
  page,
}) => {
  await page.goto('/setup');
  await page.getByLabel('Start month', { exact: true }).fill('2026-09');
  await page.getByLabel('Already saved before').fill('-1');
  await page.getByRole('button', { name: 'Start my savings' }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBeNull();
  await page.getByLabel('Already saved before').fill('300000');
  await page.getByLabel('Regular monthly saving').fill('100000');
  await page.getByLabel('Monthly spending budget').fill('500000');
  await page.getByRole('button', { name: 'Start my savings' }).click();
  await expect(page).toHaveURL(/\/savings$/);
  await expect(
    page.getByText('Example workspace', { exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText('Stored in this browser · Local workspace'),
  ).toBeVisible();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? '{}'),
    storageKey,
  );
  expect(saved).toMatchObject({
    revision: 1,
    state: {
      demo: false,
      budget: 500000,
      expenses: [],
      goals: [],
      plans: [
        {
          start: '2026-09',
          opening: 300000,
          schedules: [{ month: '2026-09', amount: 100000 }],
        },
      ],
    },
  });
  await page.goto('/setup');
  await expect(page).toHaveURL(/\/savings$/);
});

test('zero adjustment and reset persist, while next month keeps the schedule', async ({
  page,
}) => {
  await openSeptember(page);
  await openAdjustment(page, '0');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved in this browser');
  expect(await savedAmount(page)).toBe(0);
  await page.reload();
  await page.getByLabel('View month').fill('2026-09');
  await expect(page.getByText('Adjusted', { exact: true })).toBeVisible();
  await expect(page.locator('.closing')).toContainText('60,000 MMK');
  await page.getByRole('button', { name: 'Next month' }).click();
  await expect(page.locator('.closing')).toContainText('610,000 MMK');
  await page.getByRole('button', { name: 'Previous month' }).click();
  await openAdjustment(page, '0');
  await page.getByRole('dialog').getByRole('spinbutton').fill('');
  await page.getByLabel('Apply change to').selectOption('reset');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toBeVisible();
  expect(await savedAmount(page)).toBeUndefined();
  await expect(page.locator('.closing')).toContainText('410,000 MMK');
});

test('save failure retains form values and does not report success', async ({
  page,
}) => {
  await openSeptember(page);
  await openAdjustment(page, '123456');
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException(
        'Storage is full. Free some space and try again.',
        'QuotaExceededError',
      );
    };
  });
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Storage is full');
  await expect(page.getByRole('dialog').getByRole('spinbutton')).toHaveValue(
    '123456',
  );
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBeNull();
});

test('corrupt storage is preserved and load retry recovers', async ({
  page,
}) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, '{broken');
  }, storageKey);
  await page.goto('/savings');
  await expect(page.getByRole('alert')).toContainText('preserved');
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe('{broken');
  await page.evaluate((key) => localStorage.removeItem(key), storageKey);
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your savings' }),
  ).toBeVisible();
});

test('denied access to localStorage renders a recoverable load error', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('Browser storage is blocked.', 'SecurityError');
      },
    });
  });
  await page.goto('/savings');
  await expect(page.getByRole('alert')).toContainText(
    'Browser storage is blocked',
  );
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});

test('two tabs preserve drafts and reject stale writes before an explicit retry', async ({
  page,
  context,
}) => {
  const second = await context.newPage();
  await openSeptember(page);
  await openSeptember(second);
  await openAdjustment(page, '111111');
  await openAdjustment(second, '222222');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toBeVisible();
  // The background storage event must not silently advance the draft revision.
  await expect(second.locator('.breakdown')).toContainText('111,111');
  await second.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(second.getByRole('alert')).toContainText(
    'changed in another tab',
  );
  await expect(second.getByRole('dialog').getByRole('spinbutton')).toHaveValue(
    '222222',
  );
  expect(await savedAmount(second)).toBe(111111);
  await second.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(second.getByRole('status')).toBeVisible();
  expect(await savedAmount(second)).toBe(222222);
  await expect(page.locator('.breakdown')).toContainText('222,222');
});

test('mobile layout and dialog keyboard focus work', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openSeptember(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'artifacts/savings-mobile.png',
    fullPage: true,
  });
  await openAdjustment(page, '42');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.locator('dialog :focus')).toHaveCount(1);
  await page.screenshot({
    path: 'artifacts/contribution-mobile.png',
    fullPage: true,
  });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Adjust this month' }),
  ).toBeFocused();
});
