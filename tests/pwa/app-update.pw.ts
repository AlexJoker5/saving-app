import { expect, test, type Page } from '@playwright/test';

const key = 'saving.workspace.v1';
async function controlledPage(page: Page) {
  await page.goto('/savings');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute(
    'content',
    'a',
  );
}
async function showUpdate(page: Page) {
  await page
    .getByRole('button', { name: 'Check for updates', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'New version available' }),
  ).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await request.post('/__release/a');
});

test('first install stays quiet; explicit update preserves a personal workspace and works offline', async ({
  page,
  request,
  context,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await controlledPage(page);
  await expect(
    page.getByRole('heading', { name: 'New version available' }),
  ).toHaveCount(0);
  await page.goto('/setup');
  await page.getByLabel('Start month', { exact: true }).fill('2026-09');
  await page.getByLabel('Already saved before').fill('300000');
  await page.getByLabel('Regular monthly saving').fill('100000');
  await page.getByLabel('Monthly spending budget').fill('500000');
  await page.getByRole('button', { name: 'Start my savings' }).click();
  await expect(page).toHaveURL(/\/savings$/);
  const saved = await page.evaluate((key) => localStorage.getItem(key), key);
  expect(saved).not.toBeNull();
  await request.post('/__release/b');
  await showUpdate(page);
  await page.getByRole('button', { name: 'Later', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Update available', exact: true }),
  ).toBeFocused();
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute(
    'content',
    'a',
  );
  await page
    .getByRole('button', { name: 'Update available', exact: true })
    .click();
  await page.getByRole('button', { name: 'Update now', exact: true }).click();
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute(
    'content',
    'b',
  );
  await expect(
    page.getByRole('heading', { name: 'New version available' }),
  ).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    saved,
  );
  await expect(
    page.getByText('Stored in this browser · Local workspace'),
  ).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Your savings' }),
  ).toBeVisible();
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute(
    'content',
    'b',
  );
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    saved,
  );
  expect(errors).toEqual([]);
});

test('updating another tab preserves the current form draft and waits for explicit reload', async ({
  page,
  context,
  request,
}) => {
  await controlledPage(page);
  const other = await context.newPage();
  await controlledPage(other);
  await other.getByLabel('View month').fill('2026-09');
  await other
    .getByRole('button', { name: 'Add extra money', exact: true })
    .click();
  await other.getByRole('dialog').getByRole('spinbutton').fill('123456');
  await other.getByRole('dialog').getByLabel('Reason').fill('Keep my draft');
  await request.post('/__release/b');
  await showUpdate(page);
  await page.getByRole('button', { name: 'Update now', exact: true }).click();
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute(
    'content',
    'b',
  );
  await expect(other.locator('meta[name="test-release"]')).toHaveAttribute(
    'content',
    'a',
  );
  await expect(other.getByRole('dialog').getByRole('spinbutton')).toHaveValue(
    '123456',
  );
  await expect(other.getByRole('dialog').getByLabel('Reason')).toHaveValue(
    'Keep my draft',
  );
  await other.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(
    other.getByRole('heading', { name: 'New version available' }),
  ).toBeVisible();
  await other.getByRole('button', { name: 'Update now', exact: true }).click();
  await expect(other.locator('meta[name="test-release"]')).toHaveAttribute(
    'content',
    'b',
  );
});

test('failed update checks are recoverable, with no reload or storage changes', async ({
  page,
  request,
  context,
}) => {
  await controlledPage(page);
  await request.post('/__release/broken');
  await page
    .getByRole('button', { name: 'Check for updates', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'Could not check for updates',
  );
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute(
    'content',
    'a',
  );
  await context.setOffline(true);
  await page
    .getByRole('button', { name: 'Check for updates', exact: true })
    .click();
  await expect(page.getByRole('status')).toContainText(
    'Your saved savings are unchanged',
  );
  await request.post('/__release/b');
  await context.setOffline(false);
  await showUpdate(page);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), key),
  ).toBeNull();
});

test('mobile prompt fits and a waiting update survives dismissal and a page reload', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await controlledPage(page);
  await request.post('/__release/b');
  await showUpdate(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: 'artifacts/pwa-update-mobile.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Later', exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'New version available' }),
  ).toBeVisible();
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute(
    'content',
    'a',
  );
  await page.getByRole('button', { name: 'Update now', exact: true }).click();
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute(
    'content',
    'b',
  );
});

test('activation timeout keeps the prompt usable and allows a successful retry', async ({
  page,
  request,
}) => {
  await controlledPage(page);
  await request.post('/__release/b');
  await showUpdate(page);
  await page.evaluate(async () => {
    const waiting = (await navigator.serviceWorker.getRegistration())?.waiting;
    if (!waiting) throw new Error('Expected a waiting worker');
    const postMessage = waiting.postMessage.bind(waiting);
    // Simulate a dropped activation message once; the next click uses the real worker.
    waiting.postMessage = () => {
      waiting.postMessage = postMessage;
    };
  });
  await page.clock.install();
  await page.getByRole('button', { name: 'Update now', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Updating…', exact: true }),
  ).toBeDisabled();
  await page.clock.fastForward(15001);
  const notice = page.getByRole('complementary', {
    name: 'New version available',
  });
  await expect(
    notice.getByRole('status').filter({ hasText: 'The update did not finish' }),
  ).toBeVisible();
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute(
    'content',
    'a',
  );
  await page.getByRole('button', { name: 'Update now', exact: true }).click();
  await expect(page.locator('meta[name="test-release"]')).toHaveAttribute(
    'content',
    'b',
  );
});
