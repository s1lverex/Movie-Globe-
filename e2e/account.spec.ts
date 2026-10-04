import { expect, test, type Page } from '@playwright/test';

async function setup(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('movie-globe'))
      localStorage.setItem('movie-globe', JSON.stringify({ state: { onboardingDone: true }, version: 2 }));
  });
  await page.context().route(/nominatim\.openstreetmap\.org/, (route) =>
    route.fulfill({
      json: [{ lat: '35.0116', lon: '135.768', address: { city: 'Kyoto', country: 'Japan' } }],
    }),
  );
}

test('register, sync a trip, sign in on another device and see it', async ({ page, browser, isMobile }) => {
  test.setTimeout(180_000);
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`;
  await setup(page);
  await page.goto('/account');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Display name').fill('Explorer');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/Password/).fill('correct-horse-1');
  await page.getByTestId('auth-submit').click();
  await expect(page.getByTestId('account-name')).toHaveText('Explorer', { timeout: 20_000 });
  await expect(page.getByTestId('sync-state')).toContainText('Synced', { timeout: 20_000 });

  // Plan a trip while signed in → auto-synced.
  await page.goto('/');
  await expect(page.getByTestId('loading')).toBeHidden({ timeout: 60_000 });
  if (isMobile) await page.getByRole('button', { name: 'Explore' }).click();
  const search = page.getByTestId('place-search').locator('visible=true').first();
  await search.fill('kyoto');
  await search.press('Enter');
  await page.getByTestId('place-result').first().click();
  // Wait for the debounced auto-save to actually reach the server.
  const saved = page.waitForResponse(
    (r) => r.url().includes('/api/sync') && r.request().method() === 'PUT' && r.ok(),
    { timeout: 30_000 },
  );
  await page.getByTestId('save-place').click();
  await saved;

  // A different device (fresh browser context, empty storage).
  const ctx2 = await browser.newContext(isMobile ? { viewport: { width: 375, height: 812 } } : {});
  const page2 = await ctx2.newPage();
  await setup(page2);
  await page2.goto('/account');
  await page2.getByLabel('Email').fill(email.toUpperCase());
  await page2.getByLabel(/Password/).fill('wrong-password');
  await page2.getByTestId('auth-submit').click();
  await expect(page2.getByRole('alert')).toContainText('Wrong email or password');
  await page2.getByLabel(/Password/).fill('correct-horse-1');
  await page2.getByTestId('auth-submit').click();
  await expect(page2.getByTestId('account-name')).toHaveText('Explorer', { timeout: 20_000 });
  await page2.goto('/trips');
  await expect(page2.getByTestId('trips-planned')).toContainText('Kyoto, Japan', { timeout: 20_000 });

  // Sign out keeps local data but ends the session.
  await page2.goto('/account');
  await page2.getByTestId('logout').click();
  await expect(page2.getByTestId('auth-form')).toBeVisible();
  await page2.reload();
  await expect(page2.getByTestId('auth-form')).toBeVisible({ timeout: 20_000 });
  await ctx2.close();
});

test('forgot password → emailed link → new password works, old one does not', async ({ page, isMobile }) => {
  test.skip(isMobile, 'server flow covered once');
  test.setTimeout(120_000);
  const { execSync } = await import('node:child_process');
  const { createHash } = await import('node:crypto');
  const email = `reset-${Date.now()}@example.com`;
  await setup(page);
  await page.goto('/account');
  await page.getByRole('tab', { name: 'Create account' }).click();
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/Password/).fill('old-password-1');
  await page.getByTestId('auth-submit').click();
  await expect(page.getByTestId('account-name')).toBeVisible({ timeout: 20_000 });
  await page.getByTestId('logout').click();

  // Request a reset (same response whether or not the account exists).
  await page.getByTestId('forgot-open').click();
  await page.getByTestId('forgot-form').getByRole('textbox').fill(email);
  await page.getByTestId('forgot-submit').click();
  await expect(page.getByTestId('forgot-sent')).toBeVisible();

  // Simulate the emailed link: plant a known token for this user in local D1.
  const token = `e2e-token-${Date.now()}`;
  const hash = createHash('sha256').update(token).digest('base64url');
  execSync(
    `npx wrangler d1 execute travel-globe --local --command "INSERT INTO password_resets (token_hash, user_id, created_at, expires_at) SELECT '${hash}', id, 0, 9999999999999 FROM users WHERE email = '${email}'"`,
    { stdio: 'ignore', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } },
  );

  await page.goto(`/reset-password?token=${token}`);
  await page.getByLabel('New password (min. 8 characters)').fill('new-password-2');
  await page.getByLabel('Repeat new password').fill('new-password-2');
  await page.getByTestId('reset-submit').click();
  await expect(page.getByTestId('account-name')).toBeVisible({ timeout: 20_000 });

  // The link is single-use.
  await page.goto(`/reset-password?token=${token}`);
  await page.getByLabel('New password (min. 8 characters)').fill('another-pass-3');
  await page.getByLabel('Repeat new password').fill('another-pass-3');
  await page.getByTestId('reset-submit').click();
  await expect(page.getByRole('alert')).toContainText('invalid or has expired');

  // Old password rejected, new one accepted.
  const login = (pw: string) =>
    page.request.post('/api/auth/login', {
      data: { email, password: pw },
      headers: { 'content-type': 'application/json' },
    });
  expect((await login('old-password-1')).status()).toBe(401);
  expect((await login('new-password-2')).status()).toBe(200);
});
