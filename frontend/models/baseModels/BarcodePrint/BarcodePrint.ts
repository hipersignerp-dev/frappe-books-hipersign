import { ListViewSettings } from 'fyo/model/types';
import { FrappeDoc } from 'src/frappe/document';

/** One item's labels: the item, and how many to print. */
export class BarcodePrintItem extends FrappeDoc {
  static override presentation = { label: 'Label' };
}

/**
 * A batch of barcode labels to print: the site's own `Barcode Print` DocType,
 * which the Hipersign setup adds with its label print format. The server fills
 * each row's code, barcode and rate. A site without it has no such screen.
 */
export class BarcodePrint extends FrappeDoc {
  static override doctype = 'Barcode Print';
  static override presentation = { label: 'Barcode Print' };
  static override rowModels = { items: BarcodePrintItem };

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['name', 'title', 'date', 'total_labels'],
    };
  }
}
