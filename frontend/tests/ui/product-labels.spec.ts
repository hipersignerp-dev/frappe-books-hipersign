import { expect, test, type Page } from '@playwright/test';
import { serveFixture } from './helpers/fixture-server';

const url = serveFixture('product-labels');
test.use({ viewport: { width: 1440, height: 900 } });

async function open(page: Page) {
  await page.goto(url());
  await page.waitForFunction(() => (window as any).labelsFixture);
  await page.evaluate(() => (window as any).labelsFixture.open());
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByText('Print barcodes', { exact: true })).toBeVisible();
  return dialog;
}

const savedBatch = (page: Page) =>
  page.evaluate(() =>
    (window as any).labelsFixture.requests.find((r: any) => r.path.includes('/document/Barcode Print'))?.body
  );

test('Print barcodes prints the chosen variants, as many labels as asked', async ({ page }) => {
  const dialog = await open(page);
  // Every variant starts chosen, one label each, with its stock beside it.
  await expect(dialog.getByRole('status')).toHaveText('6 variants · 6 labels');
  await expect(dialog.getByRole('row', { name: /Navy UK 6/ })).toContainText('0');

  await dialog.getByRole('checkbox', { name: 'Print PUMA SMASH - Navy - UK 6' }).uncheck();
  await dialog.getByRole('checkbox', { name: 'Print PUMA SMASH - Navy - UK 8' }).uncheck();
  await dialog.getByRole('spinbutton', { name: 'Labels for PUMA SMASH - White - UK 7' }).fill('5');
  await dialog.getByRole('spinbutton', { name: 'Labels for PUMA SMASH - Navy - UK 7' }).fill('3');
  await expect(dialog.getByRole('status')).toHaveText('4 variants · 10 labels');
  if (process.env.LABELS_SHOT) await page.screenshot({ path: process.env.LABELS_SHOT });

  await dialog.getByRole('button', { name: 'Print 10 labels' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect((await savedBatch(page)).items).toEqual([
    { item: 'PUMA SMASH - White - UK 6', qty: 1 },
    { item: 'PUMA SMASH - White - UK 7', qty: 5 },
    { item: 'PUMA SMASH - White - UK 8', qty: 1 },
    { item: 'PUMA SMASH - Navy - UK 7', qty: 3 },
  ]);
  await expect.poll(() => page.evaluate(() => (window as any).labelsFixture.printed)).toEqual(['Labels BP-0007']);
});

test('Labels = stock prints one label per piece and skips sizes with none', async ({ page }) => {
  const dialog = await open(page);
  await dialog.getByRole('button', { name: 'Labels = stock' }).click();
  await expect(dialog.getByRole('status')).toHaveText('5 variants · 34 labels');
  await expect(dialog.getByRole('checkbox', { name: 'Print PUMA SMASH - Navy - UK 6' })).not.toBeChecked();
});

test('one count for all, and nothing to print with nothing chosen', async ({ page }) => {
  const dialog = await open(page);
  await dialog.getByRole('spinbutton', { name: 'Labels for each selected variant' }).fill('2');
  await dialog.getByRole('button', { name: 'Apply' }).click();
  await expect(dialog.getByRole('status')).toHaveText('6 variants · 12 labels');

  await dialog.getByRole('checkbox', { name: 'Select all variants' }).uncheck();
  await expect(dialog.getByRole('status')).toHaveText('0 variants · 0 labels');
  await expect(dialog.getByRole('button', { name: 'Print 0 labels' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await savedBatch(page)).toBeUndefined();
});
