import { expect, test, type Page } from '@playwright/test';
import { serveFixture } from './helpers/fixture-server';

const url = serveFixture('pos');
test.use({ viewport: { width: 1440, height: 900 } });

async function checkStock(page: Page, classic: boolean) {
  await page.goto(url() + '?variants');
  await page.waitForFunction(() => (window as any).posFixture);
  await page.evaluate((modern) => (window as any).posFixture.setLayout(modern), !classic);
  await page.getByRole('button', { name: 'Check stock' }).click();
  await page.getByPlaceholder('Search by item name, code or barcode').click();
}

const cartRows = (page: Page) =>
  page.evaluate(() => (window as any).posFixture.state.invoice.items.length);

for (const classic of [true, false]) {
  const layout = classic ? 'Classic' : 'Modern';

  test(`${layout}: a scanned barcode ending in Enter shows the sizes`, async ({ page }) => {
    await checkStock(page, classic);
    await page.keyboard.type('200000000302', { delay: 5 });
    await page.keyboard.press('Enter');
    const panel = page.getByRole('region', { name: 'Variants in stock' });
    await expect(panel.getByText('Stoneware Mug')).toBeVisible();
    expect(await cartRows(page)).toBe(0);
  });

  test(`${layout}: a scanner that sends no Enter still shows the sizes`, async ({ page }) => {
    await checkStock(page, classic);
    await page.keyboard.type('200000000303', { delay: 5 });
    const panel = page.getByRole('region', { name: 'Variants in stock' });
    await expect(panel.getByText('Stoneware Mug')).toBeVisible();
    expect(await cartRows(page)).toBe(0);

    // The next scan replaces the last one in the box.
    await page.keyboard.type('200000000304', { delay: 5 });
    await expect(page.getByPlaceholder('Search by item name, code or barcode')).toHaveValue('200000000304');
    await expect
      .poll(() => page.evaluate(() => (window as any).posFixture.pos.variantItem))
      .toBe('Reusable Glass Water Bottle');
    expect(await cartRows(page)).toBe(0);
  });
}
