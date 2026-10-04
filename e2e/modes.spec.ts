import { expect, test, type Page } from '@playwright/test';

async function setup(page: Page) {
  await page.addInitScript(() => {
    if (!localStorage.getItem('movie-globe'))
      localStorage.setItem('movie-globe', JSON.stringify({ state: { onboardingDone: true }, version: 2 }));
  });
  // Hermetic geocoding (OpenStreetMap Nominatim) and Trip.com.
  await page
    .context()
    .route(/nominatim\.openstreetmap\.org/, (route) =>
      route.request().url().includes('/reverse')
        ? route.fulfill({ json: { address: { town: 'Testville', country: 'Wonderland' } } })
        : route.fulfill({
            json: [{ lat: '35.0116', lon: '135.768', address: { city: 'Kyoto', country: 'Japan' } }],
          }),
    );
  await page.context().route(/trip\.com/, (route) => route.fulfill({ status: 200, body: 'stub' }));
}

const toggle = (page: Page) => page.getByTestId('mode-toggle').locator('visible=true').first();

async function openMenuIfMobile(page: Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
}

test('toggle switches mode and changes locations, nav and search', async ({ page, isMobile }) => {
  await setup(page);
  await page.goto('/');
  await expect(page.getByTestId('loading')).toBeHidden({ timeout: 60_000 });

  // Normal Mode is the default: "Travel Globe", no film pins, planner nav.
  await expect(toggle(page)).toHaveAttribute('data-mode', 'normal');
  await expect(page.getByTestId('brand-name').locator('visible=true').first()).toHaveText('Travel Globe');
  await expect(page).toHaveTitle(/^Travel Globe/);
  await expect(page.getByRole('button', { name: /^Mission: Impossible/ })).toHaveCount(0);

  // → Movie Mode: "Movie Globe", film pins + film nav.
  await page.getByTestId('mode-movie').locator('visible=true').first().click();
  await expect(toggle(page)).toHaveAttribute('data-mode', 'movie');
  await expect(page.getByTestId('brand-name').locator('visible=true').first()).toHaveText('Movie Globe');
  await expect(page).toHaveTitle(/^Movie Globe/);
  await expect(page.getByRole('button', { name: /^Mission: Impossible/ })).toHaveCount(1);
  await openMenuIfMobile(page, isMobile);
  await expect(
    page.getByRole('link', { name: 'Passport', exact: true }).locator('visible=true').first(),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'My Trips', exact: true })).toHaveCount(0);
  if (isMobile) await page.getByRole('button', { name: 'Close menu' }).click();

  // → Normal Mode again: film pins gone, planner nav + world search.
  await page.getByTestId('mode-normal').locator('visible=true').first().click();
  await expect(toggle(page)).toHaveAttribute('data-mode', 'normal');
  await expect(page.getByTestId('brand-name').locator('visible=true').first()).toHaveText('Travel Globe');
  await expect(page.getByRole('button', { name: /^Mission: Impossible/ })).toHaveCount(0);
  await openMenuIfMobile(page, isMobile);
  await expect(
    page.getByRole('link', { name: 'My Trips', exact: true }).locator('visible=true').first(),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Passport', exact: true })).toHaveCount(0);
  if (isMobile) await page.getByRole('button', { name: 'Close menu' }).click();

  // Mode persists across reload.
  await page.reload();
  await expect(toggle(page)).toHaveAttribute('data-mode', 'normal');

  // → back to Movie Mode.
  await page.getByTestId('mode-movie').locator('visible=true').first().click();
  await expect(toggle(page)).toHaveAttribute('data-mode', 'movie');
  await expect(page.getByRole('button', { name: /^Mission: Impossible/ })).toHaveCount(1);
});

test('Normal Mode: search a place, plan it, fly there and it lands in the diary', async ({
  page,
  isMobile,
}) => {
  await setup(page);
  await page.goto('/');
  await expect(page.getByTestId('loading')).toBeHidden({ timeout: 60_000 });
  await page.getByTestId('mode-normal').locator('visible=true').first().click();

  if (isMobile) await page.getByRole('button', { name: 'Explore' }).click();
  const search = page.getByTestId('place-search').locator('visible=true').first();
  await search.fill('kyoto');
  await search.press('Enter');
  await page.getByTestId('place-result').first().click();

  const panel = page.getByTestId('place-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('place-name')).toHaveValue('Kyoto, Japan');
  await page.getByTestId('place-date').fill('2027-04-01');
  await page.getByTestId('place-notes').fill('Cherry blossoms at Maruyama Park');
  await page.getByTestId('save-place').click();
  await expect(page).toHaveURL(/\/place\/p-/);
  await expect(panel).toContainText('Planned trip');
  await expect(panel.getByRole('link', { name: /Hotels/ }).first()).toHaveAttribute('href', /keyword=Kyoto/);

  await page.getByTestId('place-fly').click();
  await expect(page.getByText('Added to your travel diary')).toBeVisible({ timeout: 30_000 });

  await page.goto('/trips');
  await page.getByRole('tab', { name: /Diary/ }).click();
  await expect(page.getByTestId('trips-visited')).toContainText('Kyoto, Japan');
  await expect(page.getByTestId('trips-visited')).toContainText('Cherry blossoms');
});

test('Normal Mode: tapping the globe drops a pin that can be saved', async ({ page, isMobile }) => {
  test.skip(isMobile, 'covered by the search flow on mobile');
  await setup(page);
  await page.goto('/');
  await expect(page.getByTestId('loading')).toBeHidden({ timeout: 60_000 });
  await expect(page.getByTestId('mode-toggle')).toHaveAttribute('data-mode', 'normal');
  const vp = page.viewportSize()!;
  await page.mouse.click(vp.width / 2 + 40, vp.height / 2 + 140);
  await expect(page.getByTestId('place-panel')).toBeVisible();
  await expect(page.getByTestId('place-name')).toHaveValue('Testville, Wonderland');
  await page.getByTestId('save-visited').click();
  await expect(page.getByTestId('journey-bar')).toContainText('1 visited');
});

test('Movie Mode tap still walks (no planner pin)', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop pointer test');
  await setup(page);
  await page.goto('/');
  await expect(page.getByTestId('loading')).toBeHidden({ timeout: 60_000 });
  await page.getByTestId('mode-movie').click();
  const vp = page.viewportSize()!;
  await page.mouse.click(vp.width / 2 + 40, vp.height / 2 + 140);
  await page.waitForTimeout(800);
  await expect(page.getByTestId('place-panel')).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
});

test('deep links switch to the matching mode', async ({ page }) => {
  await setup(page);
  await page.goto('/trips');
  await expect(toggle(page)).toHaveAttribute('data-mode', 'normal');
  await page.goto('/location/hobbiton');
  await expect(page.getByTestId('location-panel')).toBeVisible();
  await expect(toggle(page)).toHaveAttribute('data-mode', 'movie');
});
