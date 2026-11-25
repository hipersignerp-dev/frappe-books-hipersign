import { t } from 'fyo';
import { getList, getValue, insertDocument } from 'src/frappe/api';
import { printHtmlInPage } from './browser';
import { getPrintHTML } from './printFormatApi';
import { getPrintDocument } from './printFormats';
import { getPrintRoute, routeTo } from './ui';
import { isMobile } from './viewport';

const DOCTYPE = 'Barcode Print';

export type LabelRow = { item: string; qty: number };

/** The format labels print with: Barcode Print's default, else its first. */
export async function getLabelPrintFormat(): Promise<string | null> {
  try {
    const preferred = await getValue('DocType', DOCTYPE, 'default_print_format');
    if (typeof preferred === 'string' && preferred) {
      return preferred;
    }
  } catch {
    // Only System Managers may read the DocType; the list below still works.
  }

  const formats = await getList('Print Format', {
    fields: ['name'],
    filters: [
      ['doc_type', '=', DOCTYPE],
      ['disabled', '=', 0],
    ],
    orderBy: 'creation asc',
    limit: 1,
  });
  const name = formats[0]?.name;
  return typeof name === 'string' ? name : null;
}

/**
 * Saves the labels as a Barcode Print batch, so they are kept under Print
 * Barcodes, then opens the print dialog over the page. Phones, and sites
 * without a label format, open the batch's print view instead.
 */
export async function printLabels(
  title: string,
  rows: LabelRow[]
): Promise<string> {
  const batch = await insertDocument(DOCTYPE, {
    title,
    items: rows.map(({ item, qty }) => ({ item, qty })),
  });
  const name = String(batch.name);

  const format = isMobile.value ? null : await getLabelPrintFormat();
  if (format) {
    const print = await getPrintHTML(DOCTYPE, name, format);
    await printHtmlInPage(getPrintDocument(print));
  } else {
    await routeTo(getPrintRoute('BarcodePrint', name));
  }

  return name;
}

export function getLabelsTitle(product: string) {
  const today = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
  });
  return t`${product} labels ${today}`;
}
