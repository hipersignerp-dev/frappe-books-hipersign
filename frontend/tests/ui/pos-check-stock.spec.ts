import { expect, test, type Page } from '@playwright/test';
import { serveFixture } from './helpers/fixture-server';

const url = serveFixture('pos');

test.use({ viewport: { width: 1440, height: 900 } });

const cartRows = (page: Page) =>
  page.evaluate(() => (window as any).posFixture.state.invoice.items.length);

async function open(page: Page, query = '?variants') {
  await page.goto(url() + query);
  await page.waitForFunction(() => (window as any).posFixture);
  await expect(page.getByText('No items yet')).toBeVisible();
}

test('Check stock shows every size of a scanned product and bills nothing', async ({ page }) => {
  await open(page);
  const toggle = page.getByRole('button', { name: 'Check stock' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').getByText(/Checking stock/)).toBeVisible();

  await page.evaluate(() => (window as any).posFixture.pos.addItem((window as any).posFixture.pos.items[3]));
  const panel = page.getByRole('region', { name: 'Variants in stock' });
  await expect(panel.getByText('Stoneware Mug')).toBeVisible();
  await expect(panel.getByText('3 of 4 variants in stock')).toBeVisible();
  await expect(panel.getByText('Out of stock')).toBeVisible();
  expect(await cartRows(page)).toBe(0);
  if (process.env.POS_SHOT) await page.screenshot({ path: process.env.POS_SHOT });

  // Choosing a size from the panel still bills it.
  await panel.getByRole('button', { name: /Blue · Large/ }).click();
  await expect.poll(() => cartRows(page)).toBe(1);

  await page.getByRole('button', { name: 'Done' }).click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await page.evaluate(() => (window as any).posFixture.pos.addItem((window as any).posFixture.pos.items[0]));
  await expect.poll(() => cartRows(page)).toBe(2);
});

test('while checking stock, an item without sizes shows its own stock', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Check stock' }).click();
  await page.evaluate(() => (window as any).posFixture.pos.addItem((window as any).posFixture.pos.items[0]));
  await expect(page.getByText(/Organic Assam Tea: \d+ in stock|Organic Assam Tea: out of stock/)).toBeVisible();
  expect(await cartRows(page)).toBe(0);
});

test('a site whose items have no product offers no Check stock', async ({ page }) => {
  await open(page, '');
  await expect(page.getByRole('button', { name: 'Check stock' })).toHaveCount(0);
});
