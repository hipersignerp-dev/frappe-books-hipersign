import { expect, test, type Page } from '@playwright/test';
import { serveFixture } from './helpers/fixture-server';

const url = serveFixture('pos');

test.use({ viewport: { width: 1440, height: 900 } });

const cartRows = (page: Page) =>
  page.evaluate(() => (window as any).posFixture.state.invoice.items.length);

async function open(page: Page, query = '?variants', classic = true) {
  await page.goto(url() + query);
  await page.waitForFunction(() => (window as any).posFixture);
  await page.evaluate((modern) => (window as any).posFixture.setLayout(modern), !classic);
  await expect(page.getByText('No items yet')).toBeVisible();
}

async function openCheckStock(page: Page) {
  await page.getByRole('button', { name: 'Check stock' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Check stock', { exact: true })).toBeVisible();
  const box = dialog.getByRole('textbox', { name: 'Barcode, code or item name' });
  await expect(box).toBeFocused();
  return { dialog, box };
}

for (const classic of [true, false]) {
  const layout = classic ? 'Classic' : 'Modern';

  test(`${layout}: Check stock opens a window that shows every size of a scan`, async ({ page }) => {
    await open(page, '?variants', classic);
    const { dialog, box } = await openCheckStock(page);

    // A scanner that sends no Enter.
    await page.keyboard.type('200000000302', { delay: 5 });
    const table = dialog.getByRole('region', { name: 'Stock of Stoneware Mug' });
    await expect(table.getByText('3 of 4 variants in stock · 13 pcs in all')).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'Small' })).toBeVisible();
    await expect(table.getByRole('row', { name: /White/ })).toContainText('4');
    await expect(table.getByRole('row', { name: /Blue/ })).toContainText('9');
    if (process.env.POS_SHOT) await page.screenshot({ path: process.env.POS_SHOT });

    // The next scan, ending in Enter, replaces the last one in the box.
    await page.keyboard.type('200000000301', { delay: 5 });
    await page.keyboard.press('Enter');
    await expect(box).toHaveValue('200000000301');
    await expect(table).toBeVisible();
    expect(await cartRows(page)).toBe(0);

    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toHaveCount(0);
    expect(await cartRows(page)).toBe(0);
  });
}

test('Check stock shows the stock of an item without sizes', async ({ page }) => {
  await open(page);
  const { dialog } = await openCheckStock(page);
  const name = await page.evaluate(() => (window as any).posFixture.pos.items[0].name);
  await page.keyboard.type(name, { delay: 2 });
  await page.keyboard.press('Enter');
  await expect(
    dialog.getByRole('region', { name: `Stock of ${name}` }).getByText(/in stock|Out of stock/)
  ).toBeVisible();
  expect(await cartRows(page)).toBe(0);
});

test('Check stock says when nothing matches, and opens empty again', async ({ page }) => {
  await open(page);
  const { dialog, box } = await openCheckStock(page);
  await page.keyboard.type('nothing-like-this');
  await page.keyboard.press('Enter');
  await expect(dialog.getByRole('alert')).toHaveText('No item matches nothing-like-this.');

  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await openCheckStock(page);
  await expect(box).toHaveValue('');
  await expect(dialog.getByRole('alert')).toHaveCount(0);
});

test('after Check stock, a scan bills as usual', async ({ page }) => {
  await open(page);
  const { dialog } = await openCheckStock(page);
  await dialog.getByRole('button', { name: 'Done' }).click();
  await page.getByPlaceholder('Search by item name, code or barcode').click();
  await page.keyboard.type('200000000303', { delay: 5 });
  await expect.poll(() => cartRows(page)).toBe(1);
});

test('a site whose items have no product offers no Check stock', async ({ page }) => {
  await open(page, '');
  await expect(page.getByRole('button', { name: 'Check stock' })).toHaveCount(0);
});
