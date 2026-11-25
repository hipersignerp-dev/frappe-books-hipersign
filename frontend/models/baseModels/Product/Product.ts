import { ListViewSettings } from 'fyo/model/types';
import { FrappeDoc } from 'src/frappe/document';

/** One colour and size of a product, as the Item it made. */
export class ProductVariant extends FrappeDoc {
  static override presentation = { label: 'Variant' };
}

/**
 * A product sold in colours and sizes: the site's own `Product` DocType, which
 * the Hipersign setup adds. Saving it makes one Books Item per colour and size
 * on the server and lists them in `variants`. A site without it has no
 * Products screen.
 */
export class Product extends FrappeDoc {
  static override doctype = 'Product';
  static override presentation = {
    label: 'Product',
    nameField: { label: 'Product Code', placeholder: 'Product Code' },
    quickEditFields: ['product_name', 'rate', 'item_group', 'colours', 'sizes'],
  };

  static override rowModels = { variants: ProductVariant };

  static getListViewSettings(): ListViewSettings {
    return {
      columns: ['product_name', 'name', 'rate', 'variant_count'],
    };
  }
}
