import type { FrappeDoc } from 'src/frappe/document';
import { shallowRef } from 'vue';

/** The product whose labels the Print barcodes window is choosing; null when closed. */
export const labelsProduct = shallowRef<FrappeDoc | null>(null);

export function openProductLabels(product: FrappeDoc) {
  labelsProduct.value = product;
}

export function closeProductLabels() {
  labelsProduct.value = null;
}
