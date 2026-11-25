<template>
  <Modal
    :open-modal="openModal"
    :title="t`Check stock`"
    :subtitle="t`Scan a product to see the stock of all its colours and sizes. Nothing is added to the bill.`"
    size="3xl"
    @closemodal="$emit('toggleModal')"
  >
    <div class="flex flex-col gap-4">
      <input
        ref="scanInput"
        v-model="code"
        type="text"
        class="form-input h-11 w-full rounded-lg text-lg"
        :placeholder="t`Scan a barcode, or type a code or item name and press Enter`"
        :aria-label="t`Barcode, code or item name`"
        autocomplete="off"
        @input="onInput"
        @keydown.enter.prevent="lookUp(code)"
      />

      <p v-if="loading" class="text-base text-ink-gray-5">
        {{ t`Looking up ${searched}…` }}
      </p>

      <p
        v-else-if="notFound"
        class="rounded-lg bg-surface-red-1 px-3 py-2 text-base text-ink-red-7"
        role="alert"
      >
        {{ t`No item matches ${searched}.` }}
      </p>

      <section
        v-else-if="stock"
        class="flex flex-col gap-3"
        :aria-label="t`Stock of ${stock.product}`"
      >
        <div class="flex flex-wrap items-baseline justify-between gap-2">
          <h3 class="text-xl font-semibold text-ink-gray-9">
            {{ stock.product }}
          </h3>
          <p class="text-base text-ink-gray-6">
            {{
              t`${inStockCount} of ${stock.variants.length} variants in stock · ${totalQty} pcs in all`
            }}
          </p>
        </div>

        <div class="overflow-x-auto rounded-lg border border-outline-gray-2">
          <table class="w-full border-collapse text-base">
            <thead>
              <tr class="bg-surface-gray-2 text-ink-gray-6">
                <th class="px-3 py-2 text-start font-medium">
                  {{ hasColours ? t`Colour` : t`Variant` }}
                </th>
                <th
                  v-for="size in stock.sizes"
                  :key="size"
                  class="px-3 py-2 text-center font-medium"
                >
                  {{ size === '-' ? t`Stock` : size }}
                </th>
                <th class="px-3 py-2 text-end font-medium">{{ t`Total` }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="colour in stock.colours"
                :key="colour"
                class="border-t border-outline-gray-1"
              >
                <th
                  scope="row"
                  class="px-3 py-2 text-start font-medium text-ink-gray-8"
                >
                  {{ colour === '-' ? stock.product : colour }}
                </th>
                <td
                  v-for="size in stock.sizes"
                  :key="size"
                  class="px-1 py-1 text-center"
                >
                  <span
                    v-if="cell(colour, size)"
                    class="inline-block min-w-12 rounded-md px-2 py-1 font-semibold tabular-nums"
                    :class="[
                      cell(colour, size)!.qty > 0
                        ? 'bg-surface-green-1 text-ink-green-7'
                        : 'bg-surface-red-1 text-ink-red-7',
                      cell(colour, size)!.item === scannedItem
                        ? 'ring-2 ring-outline-gray-5'
                        : '',
                    ]"
                    :title="cell(colour, size)!.item"
                  >
                    {{ cell(colour, size)!.qty }}
                  </span>
                  <span v-else class="text-ink-gray-4">—</span>
                </td>
                <td class="px-3 py-2 text-end font-semibold tabular-nums">
                  {{ rowTotal(colour) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-sm text-ink-gray-5">
          {{ t`The outlined box is the item you scanned.` }}
        </p>
      </section>

      <section
        v-else-if="singleItem"
        class="flex items-center justify-between gap-3 rounded-lg border border-outline-gray-2 px-4 py-3"
        :aria-label="t`Stock of ${singleItem.name}`"
      >
        <span class="text-lg font-semibold text-ink-gray-9">
          {{ singleItem.name }}
        </span>
        <span
          class="rounded-md px-2 py-1 text-base font-semibold"
          :class="
            singleItem.qty > 0
              ? 'bg-surface-green-1 text-ink-green-7'
              : 'bg-surface-red-1 text-ink-red-7'
          "
        >
          {{ singleItem.qty > 0 ? t`${singleItem.qty} in stock` : t`Out of stock` }}
        </span>
      </section>
    </div>

    <template #actions="{ size }">
      <FrappeButton
        :size="size"
        class="min-w-24"
        @click="$emit('toggleModal')"
        >{{ t`Done` }}</FrappeButton>
    </template>
  </Modal>
</template>

<script lang="ts">
import { Button as FrappeButton } from 'frappe-ui';
import { t } from 'fyo';
import { fyo } from 'src/initFyo';
import Modal from 'src/components/POS/POSDialog.vue';
import type { ItemQtyMap } from 'src/components/POS/types';
import { getScannedItem, isFullBarcode } from 'src/utils/posItemSearch';
import {
  getVariantStock,
  type VariantRow,
  type VariantStock,
} from 'src/utils/variantStock';
import { defineComponent, nextTick, type PropType } from 'vue';

/**
 * Check stock: a scanned or typed item shows the stock of every colour and
 * size of its product, as a colour × size table. Nothing goes on the bill.
 */
export default defineComponent({
  name: 'CheckStockModal',
  components: { FrappeButton, Modal },
  props: {
    openModal: { type: Boolean, default: false },
    itemQtyMap: { type: Object as PropType<ItemQtyMap>, default: () => ({}) },
  },
  emits: ['toggleModal'],
  data() {
    return {
      code: '',
      searched: '',
      scannedItem: '',
      loading: false,
      notFound: false,
      stock: null as VariantStock | null,
      singleItem: null as { name: string; qty: number } | null,
      request: 0,
    };
  },
  computed: {
    hasColours(): boolean {
      return !!this.stock?.colours.some((colour) => colour !== '-');
    },
    inStockCount(): number {
      return this.stock?.variants.filter((v) => v.qty > 0).length ?? 0;
    },
    totalQty(): number {
      return this.stock?.variants.reduce((sum, v) => sum + Math.max(v.qty, 0), 0) ?? 0;
    },
  },
  watch: {
    async openModal(open: boolean) {
      if (!open) {
        this.request++;
        return;
      }

      this.reset();
      await nextTick();
      this.focusInput();
      // The dialog may still be opening; focus once more when it has.
      setTimeout(() => this.focusInput(), 150);
    },
  },
  methods: {
    t,
    reset() {
      this.code = '';
      this.searched = '';
      this.scannedItem = '';
      this.loading = false;
      this.notFound = false;
      this.stock = null;
      this.singleItem = null;
    },
    focusInput() {
      const input = this.$refs.scanInput as HTMLInputElement | undefined;
      input?.focus();
    },
    /** A whole barcode is looked up as it arrives, whether or not Enter follows. */
    onInput() {
      const code = this.code.trim();
      if (isFullBarcode(code, fyo.singles.POSSettings)) {
        void this.lookUp(code);
      }
    },
    async lookUp(value: string) {
      const code = value.trim();
      if (!code) {
        return;
      }

      // An Enter right after the same barcode was looked up adds nothing.
      if (code === this.searched && (this.loading || this.stock || this.singleItem)) {
        this.selectInput();
        return;
      }

      const request = ++this.request;
      this.searched = code;
      this.loading = true;
      this.notFound = false;

      const scanned = await getScannedItem(code, this.itemQtyMap);
      const stock = scanned ? await getVariantStock(scanned.item.name) : undefined;
      if (request !== this.request) {
        return;
      }

      this.loading = false;
      this.scannedItem = scanned?.item.name ?? '';
      this.notFound = !scanned;
      this.stock = stock && stock.variants.length ? stock : null;
      this.singleItem =
        scanned && !this.stock
          ? {
              name: scanned.item.name,
              qty: this.itemQtyMap[scanned.item.name]?.availableQty ?? 0,
            }
          : null;
      this.selectInput();
    },
    /** Selected, the next scan replaces what is in the box. */
    selectInput() {
      const input = this.$refs.scanInput as HTMLInputElement | undefined;
      if (input && document.activeElement === input) {
        input.select();
      }
    },
    cell(colour: string, size: string): VariantRow | undefined {
      return this.stock?.variants.find(
        (variant) => variant.colour === colour && variant.size === size
      );
    },
    rowTotal(colour: string): number {
      return (
        this.stock?.variants
          .filter((variant) => variant.colour === colour)
          .reduce((sum, variant) => sum + Math.max(variant.qty, 0), 0) ?? 0
      );
    },
  },
});
</script>
