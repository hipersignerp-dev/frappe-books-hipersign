import { expect, test, type Page } from '@playwright/test';
import { serveFixture } from './helpers/fixture-server';

const url = serveFixture('pos');
test.use({ viewport: { width: 1440, height: 900 } });

const search = (page: Page) =>
  page.getByPlaceholder('Search by item name, code or barcode');

async function openPOS(page: Page, classic: boolean) {
  await page.goto(url() + '?variants');
  await page.waitForFunction(() => (window as any).posFixture);
  await page.evaluate((modern) => (window as any).posFixture.setLayout(modern), !classic);
  await search(page).click();
}

const cart = (page: Page) =>
  page.evaluate(() =>
    (window as any).posFixture.state.invoice.items.map((row: any) => [
      row.item,
      row.quantity,
    ])
  );

for (const classic of [true, false]) {
  const layout = classic ? 'Classic' : 'Modern';

  test(`${layout}: barcodes with no Enter are billed one after another`, async ({ page }) => {
    await openPOS(page, classic);
    await page.keyboard.type('200000000301', { delay: 5 });
    await expect.poll(() => cart(page)).toHaveLength(1);

    // The next scan replaces the last one in the box.
    await page.keyboard.type('200000000301', { delay: 5 });
    await expect(search(page)).toHaveValue('200000000301');
    await expect.poll(async () => (await cart(page))[0][1]).toBe(2);

    await page.keyboard.type('200000000302', { delay: 5 });
    await expect.poll(() => cart(page)).toHaveLength(2);
  });

  test(`${layout}: a barcode ending in Enter is billed once`, async ({ page }) => {
    await openPOS(page, classic);
    await page.keyboard.type('200000000302', { delay: 5 });
    await page.keyboard.press('Enter');
    await expect.poll(() => cart(page)).toHaveLength(1);
    await page.waitForTimeout(300);
    const rows = await cart(page);
    expect(rows).toHaveLength(1);
    expect(rows[0][1]).toBe(1);
  });

  test(`${layout}: typing an item name waits for Enter`, async ({ page }) => {
    await openPOS(page, classic);
    await page.keyboard.type('Stoneware Mug', { delay: 5 });
    await page.waitForTimeout(300);
    expect(await cart(page)).toHaveLength(0);
  });
}
