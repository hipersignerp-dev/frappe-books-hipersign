<template>
  <component
    :is="'div'"
    v-for="card in cards"
    :key="card.title"
    :class="cardClass"
  >
    <FrappeNumberCard
      :title="card.title"
      :value="card.value"
      :format="valueFormat"
      :loading="!isLoaded"
      :delta="card.delta"
      delta-suffix="%"
      :delta-caption="card.caption"
      :negative-is-better="card.negativeIsBetter"
      :card="false"
      class="-mt-2 pt-2"
    />
  </component>
</template>
<script lang="ts">
import { t } from 'fyo';
import { NumberCard as FrappeNumberCard } from 'frappe-ui/charts';
import { fyo } from 'src/initFyo';
import { BusinessSummary, getBusinessSummary } from 'src/utils/businessSummary';
import { defineComponent } from 'vue';
import BaseDashboardChart from './BaseDashboardChart.vue';

/** Profit, stock and money in hand, read from the site's business summary. */
export default defineComponent({
  name: 'BusinessKpis',
  components: { FrappeNumberCard },
  extends: BaseDashboardChart,
  emits: ['available'],
  data() {
    return { summary: null as BusinessSummary | null };
  },
  computed: {
    cards() {
      const k = this.summary?.kpis ?? {};
      const num = (v: number | null | undefined) => (v === undefined ? null : v);
      const margin = k.gross_margin;
      return [
        {
          title: t`Gross profit`,
          value: num(k.gross_profit),
          delta: k.gross_change ?? null,
          caption: margin == null ? t`vs last period` : t`${margin}% margin`,
        },
        {
          title: t`Net profit`,
          value: num(k.net_profit),
          delta: k.net_change ?? null,
          caption: t`vs last period`,
        },
        {
          title: t`Stock value`,
          value: num(k.stock_value),
          delta: null,
          caption: t`${fyo.format(k.stock_qty ?? 0, 'Float')} units in stock`,
        },
        {
          title: t`Cash and bank`,
          value: num(k.cash_bank),
          delta: null,
          caption: t`Cash ${this.compactCurrency(k.cash ?? 0)} · Bank ${this.compactCurrency(k.bank ?? 0)}`,
        },
      ].map((card) => ({ negativeIsBetter: false, ...card }));
    },
    valueFormat(): (value: number) => string {
      return this.isMobile
        ? this.compactCurrency
        : (value) => fyo.format(value, 'Currency');
    },
  },
  methods: {
    async setData() {
      this.summary = await getBusinessSummary(this.period);
      this.$emit('available', !!this.summary);
    },
  },
});
</script>
