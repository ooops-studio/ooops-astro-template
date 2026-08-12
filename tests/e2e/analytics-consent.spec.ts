import { expect, test } from '@playwright/test';

const providerScript = '**/umami.js';
const providerEvent = '**/collect';

test('consent banner links to the public privacy notice and reject keeps the provider blocked', async ({ page }) => {
  const providerRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/umami.js') || request.url().includes('/collect')) providerRequests.push(request.url());
  });

  await page.goto('/');
  await expect(page.getByRole('dialog', { name: /analytics preferences/i })).toBeVisible();
  await page.getByRole('link', { name: /privacy notice/i }).first().click();
  await expect(page).toHaveURL(/\/privacy\/?$/);
  await expect(page.getByRole('heading', { name: 'Privacy notice' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Umami Analytics' })).toBeVisible();

  await page.goto('/');
  await page.getByRole('button', { name: 'Reject optional' }).click();
  await expect(page.getByRole('dialog', { name: /analytics preferences/i })).toHaveCount(0);
  await page.waitForTimeout(250);
  expect(providerRequests).toEqual([]);
});

test('accepting then revoking consent loads and immediately tears down the actual provider fixture', async ({ page }) => {
  const loaded = page.waitForRequest(providerScript);
  await page.goto('/');
  await page.getByRole('button', { name: 'Accept all' }).click();
  await loaded;
  await expect.poll(() => page.evaluate(() => typeof window['umami'])).toBe('object');
  const collected = page.waitForRequest(providerEvent);
  await page.evaluate(() => {
    const tracker = window['umami'] as { track?: (event: string) => void } | undefined;
    tracker?.track?.('consent-e2e');
  });
  await collected;

  await page.getByRole('button', { name: 'Manage analytics choices' }).click();
  await page.getByRole('checkbox', { name: 'Basic analytics' }).uncheck();
  await page.getByRole('button', { name: 'Save choices' }).click();

  await expect.poll(() => page.evaluate(() => ({
    script: document.getElementById('ooops-public-analytics-script'),
    umami: typeof window['umami'],
    local: localStorage.getItem('umami.e2e'),
    session: sessionStorage.getItem('umami.e2e'),
    cookie: document.cookie.includes('umami.e2e='),
    cleared: window['__umamiClearCalled'] === true,
    reset: window['__umamiResetCalled'] === true
  }))).toEqual({
    script: null,
    umami: 'undefined',
    local: null,
    session: null,
    cookie: false,
    cleared: true,
    reset: true
  });
});

test('Do Not Track prevents a provider request even after a positive choice', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'doNotTrack', { configurable: true, get: () => '1' });
  });
  let requested = false;
  page.on('request', (request) => {
    if (request.url().includes('/umami.js') || request.url().includes('/collect')) requested = true;
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Accept all' }).click();
  await page.waitForTimeout(250);
  expect(requested).toBe(false);
  await expect(page.locator('#ooops-public-analytics-script')).toHaveCount(0);
});
