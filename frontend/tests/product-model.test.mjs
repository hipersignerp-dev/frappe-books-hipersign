import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getBooksMeta } from './helpers/doctypes.mjs';
import {
  frappeModels,
  getSchema,
  isFrappeBacked,
  loadFrappeDocTypes,
  registerFrappeModels,
  stubFrappe,
} from './helpers/frappe.mjs';
import { getColumns, getLayout } from './helpers/frappeModels.mjs';

test('a site with the Product DocType gets a Products screen with its variants', async () => {
  stubFrappe(({ body }) => ({ message: getBooksMeta(body.doctypes) }));
  registerFrappeModels(frappeModels);
  await loadFrappeDocTypes();

  assert.equal(isFrappeBacked('Product'), true);
  assert.equal(getSchema('Product').label, 'Product');
  assert.deepEqual(getColumns('Product'), ['product_name', 'name', 'rate', 'variant_count']);
  assert.ok(getLayout('Product').some((row) => row.startsWith('colours | Colours')));
  assert.equal(getSchema('ProductVariant')?.label ?? getSchema('Product Variant')?.label, 'Variant');
});

test('a site with the Barcode Print DocType gets its label batches', async () => {
  stubFrappe(({ body }) => ({ message: getBooksMeta(body.doctypes) }));
  registerFrappeModels(frappeModels);
  await loadFrappeDocTypes();

  assert.equal(getSchema('BarcodePrint').label, 'Barcode Print');
  assert.deepEqual(getColumns('BarcodePrint'), ['name', 'title', 'date', 'total_labels']);
  assert.ok(getLayout('BarcodePrint').some((row) => row.startsWith('items | Items')));
});

test('a site without the Product DocType starts as before and offers no Products screen', async () => {
  stubFrappe(({ body }) => {
    const meta = getBooksMeta(body.doctypes);
    return {
      message: {
        ...meta,
        metas: meta.metas.filter(({ name }) => !/^(Product|Barcode Print)/.test(name)),
      },
    };
  });
  registerFrappeModels(frappeModels);
  await loadFrappeDocTypes();

  assert.equal(isFrappeBacked('Product'), false);
  assert.equal(isFrappeBacked('BarcodePrint'), false);
  assert.equal(getSchema('Product'), undefined);
  assert.ok(getSchema('Item'));
});

test('a saved product with variants offers Print barcodes as its own button', async () => {
  stubFrappe(({ body }) => ({ message: getBooksMeta(body.doctypes) }));
  registerFrappeModels(frappeModels);
  await loadFrappeDocTypes();

  const [action] = frappeModels.Product.getActions({ t: (s, ...v) => String.raw(s, ...v) });
  assert.equal(action.label, 'Print barcodes');
  assert.equal(action.button, true);
  assert.equal(action.condition({ notInserted: true, variants: [{}] }), false);
  assert.equal(action.condition({ notInserted: false, variants: [] }), false);
  assert.equal(action.condition({ notInserted: false, variants: [{ item: 'A' }] }), true);
});
