<template>
  <div v-bind="phoneChartListeners" :class="cardClass">
    <FrappeBarChart
      :title="t`Sales and purchases`"
      :subtitle="t`Last 12 months`"
      :loading="!isLoaded"
      :dir="isMobile ? 'ltr' : undefined"
      :data="rows"
      x="month"
      :y="['sales', 'purchases']"
      :series-config="seriesConfig"
      :x-axis="xAxis"
      :y-axis="yAxis"
    >
      <template #empty>
        <span class="text-p-sm text-ink-gray-5">
          {{ t`No sales or purchases yet` }}
        </span>
      </template>
    </FrappeBarChart>
  </div>
</template>
<script lang="ts">
import { BarChart as FrappeBarChart } from 'frappe-ui/charts';
import { fyo } from 'src/initFyo';
import { BusinessSummary, getBusinessSummary } from 'src/utils/businessSummary';
import { defineComponent } from 'vue';
import BaseDashboardChart from './BaseDashboardChart.vue';

/** Each month's sales beside its purchases, over the last year. */
export default defineComponent({
  name: 'SalesPurchases',
  components: { FrappeBarChart },
  extends: BaseDashboardChart,
  data() {
    return { summary: null as BusinessSummary | null };
  },
  computed: {
    rows() {
      const trends = this.summary?.trends;
      if (!trends || !trends.sales.some(Boolean) && !trends.purchases.some(Boolean)) {
        return [];
      }
      return trends.labels.map((month, i) => ({
        month,
        sales: trends.sales[i] ?? 0,
        purchases: trends.purchases[i] ?? 0,
      }));
    },
    seriesConfig() {
      return {
        sales: { label: this.t`Sales` },
        purchases: { label: this.t`Purchases` },
      };
    },
    xAxis() {
      return { type: 'category' as const };
    },
    yAxis() {
      const format = (value: number) => fyo.format(value ?? 0, 'Currency');
      return { format, echartOptions: this.axisLabels.y };
    },
  },
  // Shown only once the summary has loaded, after the dashboard was activated.
  mounted() {
    void this.loadData();
  },
  methods: {
    async setData() {
      this.summary = await getBusinessSummary(this.period);
    },
  },
});
</script>
