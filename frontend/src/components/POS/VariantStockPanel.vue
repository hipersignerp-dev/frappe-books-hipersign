<template>
  <section
    v-if="variants.length > 1"
    class="mx-5 mb-3 flex max-h-72 shrink-0 flex-col rounded-lg border border-outline-gray-2"
    :aria-label="t`Variants in stock`"
  >
    <header
      class="flex items-center justify-between gap-2 border-b border-outline-gray-1 px-3 py-2"
    >
      <div class="min-w-0">
        <p class="truncate text-base font-semibold text-ink-gray-8">
          {{ product }}
        </p>
        <p class="text-sm text-ink-gray-5">
          {{ t`${inStockCount} of ${variants.length} variants in stock` }}
        </p>
      </div>
      <FrappeButton
        variant="ghost"
        size="sm"
        :aria-label="t`Close`"
        @click="$emit('close')"
      >
        <span class="lucide-x size-4" aria-hidden="true" />
      </FrappeButton>
    </header>

    <ul class="min-h-0 overflow-y-auto py-1">
      <li v-for="variant in variants" :key="variant.item">
        <button
          type="button"
          class="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-start text-base hover:bg-surface-gray-2 disabled:cursor-not-allowed disabled:opacity-60"
          :class="{ 'bg-surface-blue-1 font-semibold': variant.item === itemName }"
          :disabled="disableOutOfStock && variant.qty <= 0"
          :title="t`Add ${variant.item} to the bill`"
          @click="$emit('addVariant', variant.item)"
        >
          <span class="min-w-0 truncate text-ink-gray-8">
            {{ variant.label }}
          </span>
          <span
            class="shrink-0 text-sm"
            :class="variant.qty > 0 ? 'text-ink-green-7' : 'text-ink-red-7'"
          >
            {{ variant.qty > 0 ? t`${variant.qty} in stock` : t`Out of stock` }}
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>

<script lang="ts">
import { Button as FrappeButton } from 'frappe-ui';
import { call } from 'src/web/api';
import { defineComponent } from 'vue';

/** What the site's `variant_stock` API returns for an item's product. */
type VariantStock = {
  item: string | null;
  product: string | null;
  colours: string[];
  sizes: string[];
  grid: Record<string, number>;
  items: Record<string, string>;
};

type VariantRow = { item: string; label: string; qty: number };

/**
 * Every colour and size of the scanned item's product with its stock.
 * The product, colour and size come from the site's Books Item fields of
 * those names; a site without the `variant_stock` API shows nothing.
 */
export default defineComponent({
  name: 'VariantStockPanel',
  components: { FrappeButton },
  props: {
    itemName: { type: String, default: '' },
    /** Bumped after a sale so the stock is read again. */
    refreshKey: { type: Number, default: 0 },
    disableOutOfStock: { type: Boolean, default: false },
  },
  emits: ['addVariant', 'close', 'noVariants'],
  data() {
    return {
      product: '' as string,
      variants: [] as VariantRow[],
      request: 0,
    };
  },
  computed: {
    inStockCount(): number {
      return this.variants.filter((v) => v.qty > 0).length;
    },
  },
  watch: {
    itemName: { handler: 'load', immediate: true },
    refreshKey: 'load',
  },
  methods: {
    async load() {
      const request = ++this.request;
      if (!this.itemName) {
        this.variants = [];
        return;
      }

      let data: VariantStock | undefined;
      try {
        data = await call<VariantStock>('variant_stock', { item: this.itemName });
      } catch {
        data = undefined;
      }

      // A later scan's answer wins over an earlier one that came back late.
      if (request !== this.request) {
        return;
      }

      if (!data?.product) {
        this.product = '';
        this.variants = [];
        this.$emit('noVariants', this.itemName);
        return;
      }

      const rows: VariantRow[] = [];
      for (const colour of data.colours) {
        for (const size of data.sizes) {
          const key = `${colour}|${size}`;
          const item = data.items[key];
          if (!item) {
            continue;
          }

          const label = [colour, size]
            .filter((part) => part && part !== '-')
            .join(' · ');
          rows.push({ item, label: label || item, qty: Number(data.grid[key] ?? 0) });
        }
      }

      this.product = data.product;
      this.variants = rows;
      if (rows.length <= 1) {
        this.$emit('noVariants', this.itemName);
      }
    },
  },
});
</script>
