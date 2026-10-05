import { expect, test } from '@playwright/test';

const proxy = 'https://saving-app.apexstack-work.workers.dev';
const user = {
  id: '13eb66ab-638e-4ff0-92af-6f92da8412d5',
  email: 'saving-test@example.com',
  factors: [],
  app_metadata: {},
  user_metadata: {},
};

test('startup checks Worker before Auth, and a failed connection can be retried', async ({
  page,
}) => {
  let unavailable = true;
  const paths: string[] = [];
  await page.route(proxy + '/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    paths.push(path);
    if (unavailable) {
      await route.abort('failed');
    } else {
      await route.fulfill({ json: { external: {}, disable_signup: false } });
    }
  });
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Retry connection' }),
  ).toBeVisible();
  expect(paths).toEqual(['/auth/v1/settings']);
  unavailable = false;
  await page.getByRole('button', { name: 'Retry connection' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeVisible();
  expect(paths.every((path) => path === '/auth/v1/settings')).toBe(true);
});

test('an uncertain save retains the money draft and cannot create a duplicate on retry', async ({
  page,
}) => {
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const encode = (input: object) =>
    Buffer.from(JSON.stringify(input)).toString('base64url');
  const token = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ sub: user.id, exp: expires, aal: 'aal1', amr: [] })}.test`;
  await page.addInitScript(
    ({ session }) =>
      localStorage.setItem(
        'sb-saving-project-auth-token',
        JSON.stringify(session),
      ),
    {
      session: {
        access_token: token,
        refresh_token: 'test-refresh',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: expires,
        user,
      },
    },
  );
  let saved = {
    revision: 1,
    state: {
      version: 2,
      demo: false,
      mainId: 'main',
      budget: 200000,
      plans: [
        {
          id: 'main',
          name: 'Main',
          start: '2026-10',
          opening: 100000,
          schedules: [{ month: '2026-10', amount: 10000 }],
          overrides: {},
          entries: [],
          recurringExpenses: [],
        },
      ],
      expenses: [],
      goals: [],
    },
  };
  let writes = 0;
  let reads = 0;
  let settings = 0;
  await page.route(proxy + '/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/auth/v1/settings') {
      settings += 1;
      await route.fulfill({ json: { external: {}, disable_signup: false } });
    } else if (path === '/auth/v1/user') {
      await route.fulfill({ json: user });
    } else if (
      path === '/rest/v1/workspaces' &&
      route.request().method() === 'GET'
    ) {
      reads += 1;
      await route.fulfill({ json: saved });
    } else if (
      path === '/rest/v1/workspaces' &&
      route.request().method() === 'PATCH'
    ) {
      writes += 1;
      saved = { revision: 2, state: route.request().postDataJSON().state };
      // The server saved it, but the browser lost the response.
      await route.abort('failed');
    } else {
      await route.fulfill({
        status: 404,
        json: { message: 'Unexpected test request' },
      });
    }
  });
  await page.goto('/savings?action=add&month=2026-10');
  const editor = page
    .getByRole('dialog')
    .filter({ has: page.getByLabel('Reason', { exact: true }) });
  await expect(editor).toBeVisible();
  await editor.getByLabel('Amount (MMK)', { exact: true }).fill('5000');
  await editor.getByLabel('Reason', { exact: true }).fill('Keep this draft');
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  const connection = page.getByRole('dialog', {
    name: 'Saving connection',
    exact: true,
  });
  await expect(connection).toBeVisible();
  await connection.getByRole('button', { name: 'Retry connection' }).click();
  await expect(connection).toHaveCount(0);
  await expect(editor.getByLabel('Reason', { exact: true })).toHaveValue(
    'Keep this draft',
  );
  await expect(editor.getByLabel('Amount (MMK)', { exact: true })).toHaveValue(
    '5000',
  );
  await expect.poll(() => reads).toBeGreaterThan(1);
  expect(settings).toBeGreaterThan(1);
  expect(writes).toBe(1);
  await editor.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(editor.getByRole('alert')).toContainText('already exists');
  expect(writes).toBe(1);
  expect(saved.state.plans[0].entries).toHaveLength(1);
  await page.screenshot({
    path: 'artifacts/connection-recovery.png',
    fullPage: true,
  });
});
