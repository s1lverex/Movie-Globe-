import { expect, test, type Page } from '@playwright/test';

async function skipOnboarding(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('movie-globe'))
      localStorage.setItem(
        'movie-globe',
        JSON.stringify({ state: { onboardingDone: true, appMode: 'movie' }, version: 1 }),
      );
  });
}

test('deep link opens location panel and Travel opens Trip.com in a new tab', async ({ page }) => {
  await skipOnboarding(page);
  // Keep the test hermetic: don't hit the real Trip.com.
  await page
    .context()
    .route(/trip\.com/, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: 'Trip.com stub' }),
    );
  await page.goto('/location/hobbiton');
  const panel = page.getByTestId('location-panel');
  await expect(panel).toBeVisible();
  await expect(panel.getByRole('heading', { name: 'The Lord of the Rings' })).toBeVisible();
  await expect(panel).toContainText('Hobbiton Movie Set');

  const cta = page.getByTestId('travel-cta').locator('visible=true').first();
  const tag = await cta.evaluate((el) => el.tagName);
  if (tag === 'BUTTON') await cta.click(); // mobile opens the Trip.com sheet first

  const flights = page
    .getByRole('link', { name: /Flights/ })
    .locator('visible=true')
    .first();
  await expect(flights).toHaveAttribute('target', '_blank');
  await expect(flights).toHaveAttribute('rel', /noopener/);
  await expect(flights).toHaveAttribute('href', /^https:\/\/www\.trip\.com\/flights\/.*acity=akl/);
  await expect(
    page
      .getByRole('link', { name: /Hotels/ })
      .locator('visible=true')
      .first(),
  ).toHaveAttribute('href', /hotels\/list\?city=58806/);

  const [popup] = await Promise.all([
    page.context().waitForEvent('page'),
    page
      .getByRole('link', { name: /Car Rentals/ })
      .locator('visible=true')
      .first()
      .click(),
  ]);
  expect(popup.url()).toContain('trip.com');
  await popup.close();
  await expect(page.getByText('Opening Trip.com…')).toBeVisible();
});

test('fly there lands at the pin and earns a passport stamp', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/location/petra');
  await page.getByTestId('fly-there').locator('visible=true').first().click();
  await expect(page.getByText('Passport stamp earned!')).toBeVisible({ timeout: 30_000 });
  await page.goto('/passport');
  await expect(page.getByTestId('stamp-earned')).toHaveCount(1);
});

test('unknown slug falls back to the globe', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/location/not-a-place');
  await expect(page).toHaveURL(/\/$/);
});

test('character customisation persists across reloads', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/character');
  await page.getByRole('tab', { name: 'Outfit' }).click();
  await page.getByRole('button', { name: 'Hat: explorer' }).click();
  await page.reload();
  await page.getByRole('tab', { name: 'Outfit' }).click();
  await expect(page.getByRole('button', { name: 'Hat: explorer' })).toHaveAttribute('aria-pressed', 'true');
});

test('list view search filters locations', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/');
  await page
    .getByRole('button', { name: /List view|Explore/ })
    .locator('visible=true')
    .first()
    .click();
  const dialog = page.getByRole('dialog', { name: 'Explore locations' });
  await dialog.getByRole('searchbox').fill('jordan');
  await expect(dialog.getByText('2 of 24 locations')).toBeVisible();
  await dialog.getByRole('button', { name: /Lawrence of Arabia/ }).click();
  await expect(page).toHaveURL(/\/location\/wadi-rum/);
});

test('onboarding shows once', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('onboarding')).toBeVisible();
  for (let i = 0; i < 3; i++) await page.getByTestId('onboarding-next').click();
  await expect(page.getByTestId('onboarding')).toBeHidden();
  await page.reload();
  await page.waitForTimeout(1500);
  await expect(page.getByTestId('onboarding')).toBeHidden();
});

test('keyboard walking moves the explorer', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard input is desktop-only');
  await skipOnboarding(page);
  await page.goto('/');
  await expect(page.getByTestId('loading')).toBeHidden({ timeout: 60_000 });
  await page.waitForTimeout(1000);
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem('movie-globe')!).state.position ?? null,
  );
  await page.keyboard.down('w');
  await page.waitForTimeout(4000);
  await page.keyboard.up('w');
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('movie-globe')!).state.position);
  expect(after).toBeTruthy();
  expect(JSON.stringify(after)).not.toEqual(JSON.stringify(before));
});

test('movie tour flies to the first stop and shows a narration card', async ({ page }) => {
  await skipOnboarding(page);
  await page.goto('/tours');
  await page.getByTestId('start-romance-in-europe').click();
  await expect(page.getByTestId('tour-card')).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('tour-card')).toContainText('Stop 1 of 4');
  await page.getByTestId('tour-next').click();
  await expect(page.getByTestId('tour-card')).toContainText('Stop 2 of 4', { timeout: 30_000 });
});

test('mobile joystick is shown and moves the explorer', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile layout');
  await skipOnboarding(page);
  await page.goto('/');
  await expect(page.getByTestId('loading')).toBeHidden({ timeout: 60_000 });
  const stick = page.getByTestId('joystick');
  await expect(stick).toBeVisible();
  await page.waitForTimeout(1000);
  const before = await page.evaluate(() =>
    JSON.stringify(JSON.parse(localStorage.getItem('movie-globe')!).state.position),
  );
  const box = (await stick.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 40, { steps: 5 });
  await page.waitForTimeout(4000);
  await page.mouse.up();
  await page.waitForTimeout(2500);
  const after = await page.evaluate(() =>
    JSON.stringify(JSON.parse(localStorage.getItem('movie-globe')!).state.position),
  );
  expect(after).not.toEqual(before);
});
