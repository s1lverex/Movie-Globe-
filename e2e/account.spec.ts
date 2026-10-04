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
  await expect(page.getByTestId('account-name')).toHaveText('Explorer');
  await expect(page.getByTestId('sync-state')).toContainText('Synced');

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
