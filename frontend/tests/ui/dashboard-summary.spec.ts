import { expect, test } from '@playwright/test';
import { serveFixture } from './helpers/fixture-server';

const fixtureUrl = serveFixture('dashboard');

test('the business summary adds profit, stock, cash, rankings and recent sales', async ({ page }) => {
  await page.goto(fixtureUrl());
  for (const title of ['Gross profit', 'Net profit', 'Stock value', 'Cash and bank']) {
    await expect(page.getByText(title, { exact: true })).toBeVisible();
  }
  for (const heading of ['Sales and purchases', 'Needs attention', 'Top products', 'Top customers', 'Recent sales']) {
    await expect(page.getByText(heading, { exact: true })).toBeVisible();
  }
  await expect(page.getByText('JORDAN 1')).toBeVisible();
  await expect(page.getByText('SINV-1189')).toBeVisible();
  const shot = process.env.DASHBOARD_SHOT;
  if (shot) {
    await page.screenshot({ path: shot });
    await page.getByText('Recent sales', { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: shot.replace('.png', '-2.png') });
  }
});

test('a site without the summary shows only the standard dashboard', async ({ page }) => {
  await page.goto(`${fixtureUrl()}?summary=none`);
  await expect(page.getByText('Paid sales', { exact: true })).toBeVisible();
  await expect(page.getByText('Cashflow', { exact: true })).toBeVisible();
  await expect(page.getByText('Gross profit', { exact: true })).toBeHidden();
  await expect(page.getByText('Needs attention', { exact: true })).toBeHidden();
});
