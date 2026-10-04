import { expect, test, type Page } from '@playwright/test';

const mk = (
  id: string,
  name: string,
  lat: number,
  lng: number,
  date: string,
  transport?: string,
  notes = '',
) => ({
  id,
  name,
  lat,
  lng,
  status: 'visited',
  createdAt: 1,
  date,
  notes,
  transport,
});

async function seed(page: Page, withHistory = true) {
  const state = {
    onboardingDone: true,
    places: withHistory
      ? [
          mk('a', 'London, United Kingdom', 51.507, -0.128, '2025-05-02', undefined, 'Rainy but magical.'),
          mk('b', 'Paris, France', 48.857, 2.352, '2025-05-06', 'bus'),
          mk('c', 'Tokyo, Japan', 35.68, 139.69, '2025-08-01'),
        ]
      : [],
    visited: withHistory ? { 'trevi-fountain': new Date('2025-06-15T10:00:00').getTime() } : {},
  };
  await page.addInitScript((st) => {
    if (!localStorage.getItem('movie-globe'))
      localStorage.setItem('movie-globe', JSON.stringify({ state: st, version: 2 }));
  }, state);
}

test('Travel Summary replays visited places with dates, transport and a finale', async ({
  page,
  isMobile,
}) => {
  test.setTimeout(150_000);
  await seed(page);
  await page.goto('/trips');
  await page.getByTestId('open-summary').click();
  await expect(page).toHaveURL(/\/summary$/);
  await expect(page.getByTestId('loading')).toBeHidden({ timeout: 60_000 });

  const card = page.getByTestId('summary-stop-card');
  await expect(card).toContainText('Stop 1 of 4');
  await expect(card).toContainText('London, United Kingdom');
  await expect(card).toContainText('2025');
  await expect(card).toContainText('Rainy but magical');

  // Leg animation: transport card + moving vehicle, then the next stop pops up.
  await expect(page.getByTestId('summary-travel-card')).toContainText('By bus', { timeout: 20_000 });
  await expect(page.getByTestId('summary-vehicle')).toBeVisible();
  await expect(card).toContainText('Paris, France', { timeout: 20_000 });
  await expect(page.getByTestId('summary-leg')).toContainText('Bus ride');
  await expect(page.getByTestId('summary-stop-marker').first()).toBeVisible();

  // Jump ahead with the timeline controls, then let it finish at 4× speed.
  await page.getByRole('button', { name: 'Next stop' }).click();
  await expect(card).toContainText('Trevi Fountain');
  await expect(card).toContainText('Roman Holiday');
  const speed = page.getByRole('button', { name: /Playback speed/ });
  await speed.click();
  await speed.click();
  const finale = page.getByTestId('summary-finale');
  await expect(finale).toBeVisible({ timeout: 60_000 });
  await expect(finale).toContainText('4');
  await expect(finale).toContainText('places');
  await expect(finale).toContainText('km travelled');

  // Filter to film locations only.
  await page.getByRole('radio', { name: 'Film locations' }).click();
  await expect(card).toContainText('Stop 1 of 1');

  if (!isMobile) {
    await page.getByRole('button', { name: 'Close Travel Summary' }).click();
    await expect(page).toHaveURL(/\/$/);
  }
});

test('recording transport on a diary entry changes the replay', async ({ page }) => {
  await seed(page);
  await page.goto('/place/b');
  await page.getByTestId('transport-boat').click();
  await page.goto('/summary');
  await page.getByRole('button', { name: 'Next stop' }).click();
  await expect(page.getByTestId('summary-leg')).toContainText('Sailed');
});

test('empty history explains how to build one', async ({ page }) => {
  await seed(page, false);
  await page.goto('/summary');
  await expect(page.getByTestId('summary-empty')).toBeVisible({ timeout: 30_000 });
});
