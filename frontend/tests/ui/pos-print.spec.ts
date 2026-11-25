import { expect, test } from '@playwright/test';
import { serveFixture } from './helpers/fixture-server';

const url = serveFixture('pos');

test.use({ viewport: { width: 1440, height: 900 } });

test('Pay and print prints the receipt over the POS, in no new tab', async ({ page, context }) => {
  await page.goto(url());
  await page.waitForFunction(() => (window as any).posFixture);
  await expect(page.getByText('No items yet')).toBeVisible();

  const result = await page.evaluate(async () => {
    const { pos, fyo } = (window as any).posFixture;
    fyo.singles.Defaults.pos_print_template = 'Business POS - Sales Invoice';
    const printed: string[] = [];
    // The frame's print() is recorded rather than opening the dialog.
    const observer = new MutationObserver(() => {
      const frame = document.querySelector('iframe[title="print"]') as HTMLIFrameElement | null;
      if (frame?.contentWindow && !(frame as any).patched) {
        (frame as any).patched = true;
        frame.contentWindow.print = () => {
          printed.push(frame.contentDocument!.body.textContent ?? '');
          frame.contentWindow!.dispatchEvent(new Event('afterprint'));
        };
      }
    });
    observer.observe(document.body, { childList: true });
    const route = pos.$router.currentRoute.value.fullPath;
    await pos.printSale({ schemaName: 'SalesInvoice', name: 'SINV-0042' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    observer.disconnect();
    return {
      printed,
      route,
      after: pos.$router.currentRoute.value.fullPath,
      frames: document.querySelectorAll('iframe[title="print"]').length,
    };
  });

  expect(result.printed).toEqual(['Receipt SINV-0042']);
  expect(result.after).toBe(result.route);
  expect(result.frames).toBe(0);
  expect(context.pages()).toHaveLength(1);
});

test('without a POS print format, nothing prints over the POS', async ({ page }) => {
  await page.goto(url());
  await page.waitForFunction(() => (window as any).posFixture);
  const requested: string[] = [];
  page.on('request', (request) => requested.push(request.url()));
  const frames = await page.evaluate(async () => {
    const { pos, fyo } = (window as any).posFixture;
    fyo.singles.Defaults.pos_print_template = null;
    let created = 0;
    const observer = new MutationObserver(() => {
      created += document.querySelectorAll('iframe[title="print"]').length;
    });
    observer.observe(document.body, { childList: true });
    // The print view opens in the app instead, which this fixture does not route.
    await pos.printSale({ schemaName: 'SalesInvoice', name: 'SINV-0042' }).catch(() => {});
    observer.disconnect();
    return created;
  });
  expect(frames).toBe(0);
  expect(requested.some((url) => url.includes('get_html_and_style'))).toBe(false);
});
