import { getValue } from 'src/frappe/api';
import { fyo } from 'src/initFyo';
import { printHtmlInPage } from './browser';
import { getPrintHTML } from './printFormatApi';
import { getPrintDocument } from './printFormats';

const DOCTYPE = 'Books Sales Invoice';

/** The print format a POS sale prints with: its profile's, else the POS default. */
export async function getPOSPrintFormat(posProfile?: string | null): Promise<string | null> {
  const profileFormat =
    posProfile &&
    (await getValue('Books Pos Profile', posProfile, 'pos_print_template'));
  const format = profileFormat || fyo.singles.Defaults?.pos_print_template;
  return typeof format === 'string' && format ? format : null;
}

/**
 * Prints a POS sale's receipt straight to the print dialog, staying on the POS.
 * False when no print format is set, so the caller can open the print view.
 */
export async function printPOSReceipt(
  name: string,
  posProfile?: string | null
): Promise<boolean> {
  const format = await getPOSPrintFormat(posProfile);
  if (!format) {
    return false;
  }

  const print = await getPrintHTML(DOCTYPE, name, format);
  await printHtmlInPage(getPrintDocument(print));
  return true;
}
