<template>
  <Modal
    :open-modal="!!product"
    :title="t`Print barcodes`"
    :subtitle="subtitle"
    size="2xl"
    @closemodal="close"
  >
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <label class="flex items-center gap-2 text-base text-ink-gray-8">
          <input
            type="checkbox"
            class="form-checkbox"
            :checked="allSelected"
            :indeterminate.prop="someSelected && !allSelected"
            :aria-label="t`Select all variants`"
            @change="selectAll(($event.target as HTMLInputElement).checked)"
          />
          {{ t`Select all` }}
        </label>
        <div class="flex flex-wrap items-center gap-2">
          <label class="flex items-center gap-2 text-sm text-ink-gray-6">
            {{ t`Labels for each selected` }}
            <input
              v-model.number="sameQty"
              type="number"
              min="1"
              class="form-input h-7 w-16 text-center"
              :aria-label="t`Labels for each selected variant`"
            />
          </label>
          <FrappeButton size="sm" :label="t`Apply`" @click="applySameQty" />
          <FrappeButton
            v-if="hasStock"
            size="sm"
            :label="t`Labels = stock`"
            :tooltip="t`One label for each piece in stock`"
            @click="useStockQty"
          />
        </div>
      </div>

      <div class="overflow-x-auto rounded-lg border border-outline-gray-2">
        <table class="w-full border-collapse text-base">
          <thead>
            <tr class="bg-surface-gray-2 text-ink-gray-6">
              <th class="w-10 px-3 py-2"><span class="sr-only">{{ t`Print` }}</span></th>
              <th class="px-3 py-2 text-start font-medium">{{ t`Colour` }}</th>
              <th class="px-3 py-2 text-start font-medium">{{ t`Size` }}</th>
              <th class="px-3 py-2 text-start font-medium">{{ t`Barcode` }}</th>
              <th v-if="hasStock" class="px-3 py-2 text-end font-medium">
                {{ t`Stock` }}
              </th>
              <th class="w-28 px-3 py-2 text-center font-medium">{{ t`Labels` }}</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in rows"
              :key="row.item"
              class="border-t border-outline-gray-1"
              :class="row.selected ? '' : 'text-ink-gray-5'"
            >
              <td class="px-3 py-1.5">
                <input
                  v-model="row.selected"
                  type="checkbox"
                  class="form-checkbox"
                  :aria-label="t`Print ${row.item}`"
                />
              </td>
              <td class="px-3 py-1.5">{{ row.colour || '—' }}</td>
              <td class="px-3 py-1.5">{{ row.size || '—' }}</td>
              <td class="px-3 py-1.5 font-mono text-sm">{{ row.barcode || '—' }}</td>
              <td v-if="hasStock" class="px-3 py-1.5 text-end tabular-nums">
                {{ row.stock ?? '—' }}
              </td>
              <td class="px-3 py-1">
                <input
                  v-model.number="row.qty"
                  type="number"
                  min="1"
                  class="form-input h-8 w-full text-center"
                  :disabled="!row.selected"
                  :aria-label="t`Labels for ${row.item}`"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <template #actions="{ size }">
      <span class="me-auto text-base text-ink-gray-6" role="status">
        {{ t`${selectedRows.length} variants · ${totalLabels} labels` }}
      </span>
      <FrappeButton :size="size" @click="close">{{ t`Cancel` }}</FrappeButton>
      <FrappeButton
        :size="size"
        variant="solid"
        icon-left="lucide-printer"
        :loading="printing"
        :disabled="!totalLabels"
        @click="print"
        >{{ t`Print ${totalLabels} labels` }}</FrappeButton>
    </template>
  </Modal>
</template>

<script lang="ts">
import { Button as FrappeButton } from 'frappe-ui';
import { t } from 'fyo';
import Modal from 'src/components/POS/POSDialog.vue';
import { getErrorMessage } from 'src/utils';
import { getLabelsTitle, printLabels } from 'src/utils/barcodeLabels';
import { showToast } from 'src/utils/interactive';
import {
  closeProductLabels,
  labelsProduct,
} from 'src/utils/productLabelsState';
import { getVariantStock } from 'src/utils/variantStock';
import { defineComponent } from 'vue';

type Row = {
  item: string;
  colour: string;
  size: string;
  barcode: string;
  stock: number | null;
  selected: boolean;
  qty: number;
};

type VariantValues = { item?: unknown; colour?: unknown; size?: unknown; barcode?: unknown };

const text = (value: unknown) => (typeof value === 'string' ? value : '');

/**
 * A product's Print barcodes window: pick its variants and how many labels
 * each, then print them as one Barcode Print batch.
 */
export default defineComponent({
  name: 'ProductLabelsDialog',
  components: { FrappeButton, Modal },
  data() {
    return {
      rows: [] as Row[],
      sameQty: 1,
      printing: false,
      request: 0,
    };
  },
  computed: {
    product() {
      return labelsProduct.value;
    },
    productName(): string {
      const doc = this.product;
      return text(doc?.product_name) || text(doc?.name);
    },
    subtitle(): string {
      return t`Choose the variants of ${this.productName} and how many labels each.`;
    },
    selectedRows(): Row[] {
      return this.rows.filter((row) => row.selected && row.qty > 0);
    },
    totalLabels(): number {
      return this.selectedRows.reduce((sum, row) => sum + Math.floor(row.qty), 0);
    },
    allSelected(): boolean {
      return !!this.rows.length && this.rows.every((row) => row.selected);
    },
    someSelected(): boolean {
      return this.rows.some((row) => row.selected);
    },
    hasStock(): boolean {
      return this.rows.some((row) => row.stock !== null);
    },
  },
  watch: {
    product: { handler: 'load', immediate: true },
  },
  methods: {
    t,
    async load() {
      const request = ++this.request;
      const variants = (this.product?.variants ?? []) as VariantValues[];
      this.sameQty = 1;
      this.rows = variants
        .map((variant) => ({
          item: text(variant.item),
          colour: text(variant.colour),
          size: text(variant.size),
          barcode: text(variant.barcode),
          stock: null,
          selected: true,
          qty: 1,
        }))
        .filter((row) => row.item);

      const first = this.rows[0]?.item;
      const stock = first ? await getVariantStock(first) : undefined;
      if (!stock || request !== this.request) {
        return;
      }

      for (const row of this.rows) {
        const variant = stock.variants.find(({ item }) => item === row.item);
        row.stock = variant ? variant.qty : 0;
      }
    },
    selectAll(selected: boolean) {
      this.rows.forEach((row) => (row.selected = selected));
    },
    applySameQty() {
      const qty = Math.max(1, Math.floor(Number(this.sameQty) || 1));
      this.rows.filter((row) => row.selected).forEach((row) => (row.qty = qty));
    },
    /** One label per piece in stock; sizes with none are left out. */
    useStockQty() {
      for (const row of this.rows) {
        const stock = Math.max(0, Math.floor(row.stock ?? 0));
        row.selected = stock > 0;
        row.qty = stock || 1;
      }
    },
    close() {
      this.request++;
      closeProductLabels();
    },
    async print() {
      if (!this.totalLabels || this.printing) {
        return;
      }

      this.printing = true;
      try {
        const rows = this.selectedRows.map(({ item, qty }) => ({
          item,
          qty: Math.floor(qty),
        }));
        const total = this.totalLabels;
        await printLabels(getLabelsTitle(this.productName), rows);
        this.close();
        showToast({ type: 'success', message: t`${total} labels sent to print.` });
      } catch (error) {
        showToast({ type: 'error', message: getErrorMessage(error as Error) });
      } finally {
        this.printing = false;
      }
    },
  },
});
</script>
