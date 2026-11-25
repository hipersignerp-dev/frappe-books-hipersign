<template>
  <div v-if="summary" class="space-y-4 md:space-y-6">
    <div class="grid gap-6 md:grid-cols-3 md:gap-8">
      <section :class="cardClass">
        <h3 class="mb-3 text-lg font-medium text-ink-gray-8">
          {{ t`Needs attention` }}
        </h3>
        <p v-if="!alerts.length" class="text-p-sm text-ink-gray-5">
          {{ t`All clear` }}
        </p>
        <ul v-else class="divide-y divide-outline-gray-1">
          <li v-for="alert in alerts" :key="alert.title">
            <RouterLink
              :to="alert.route"
              class="flex items-center justify-between gap-3 py-2 hover:text-ink-gray-9"
            >
              <span class="min-w-0">
                <span class="block truncate text-base text-ink-gray-8">{{ alert.title }}</span>
                <span class="block truncate text-sm text-ink-gray-5">{{ alert.detail }}</span>
              </span>
              <span class="shrink-0 text-base font-medium tabular-nums" :class="alert.tone">
                {{ alert.count }}
              </span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <section v-for="list in rankings" :key="list.title" :class="cardClass">
        <h3 class="mb-3 text-lg font-medium text-ink-gray-8">{{ list.title }}</h3>
        <p v-if="!list.rows.length" class="text-p-sm text-ink-gray-5">
          {{ t`No sales in this period` }}
        </p>
        <ul v-else class="space-y-2.5">
          <li v-for="row in list.rows" :key="row.label">
            <div class="flex items-baseline justify-between gap-3 text-base">
              <span class="min-w-0 truncate text-ink-gray-8">{{ row.label }}</span>
              <span class="shrink-0 tabular-nums text-ink-gray-6">{{ row.amount }}</span>
            </div>
            <div class="mt-1 h-1 rounded-full bg-surface-gray-2">
              <div class="h-1 rounded-full bg-surface-gray-6" :style="{ width: row.width }" />
            </div>
          </li>
        </ul>
      </section>
    </div>

    <div class="border-t border-outline-gray-2 max-md:hidden" />

    <section :class="cardClass">
      <div class="mb-3 flex items-center justify-between">
        <h3 class="text-lg font-medium text-ink-gray-8">{{ t`Recent sales` }}</h3>
        <RouterLink to="/list/SalesInvoice" class="text-sm text-ink-gray-5 hover:text-ink-gray-8">
          {{ t`View all` }}
        </RouterLink>
      </div>
      <p v-if="!summary.recent.length" class="text-p-sm text-ink-gray-5">
        {{ t`No sales yet` }}
      </p>
      <table v-else class="w-full text-base">
        <tbody class="divide-y divide-outline-gray-1">
          <tr
            v-for="row in summary.recent"
            :key="row.name"
            class="cursor-pointer hover:bg-surface-gray-1"
            @click="$router.push(`/edit/SalesInvoice/${encodeURIComponent(row.name)}`)"
          >
            <td class="py-2 pe-3 font-medium text-ink-gray-8">{{ row.name }}</td>
            <td class="py-2 pe-3 text-ink-gray-7 max-sm:hidden">{{ row.party }}</td>
            <td class="py-2 pe-3 text-ink-gray-5 max-md:hidden">{{ formatDate(row.date) }}</td>
            <td class="py-2 pe-3 text-end tabular-nums text-ink-gray-8">
              {{ fyo.format(row.grand_total, 'Currency') }}
            </td>
            <td class="w-24 py-2 text-end">
              <span class="text-sm" :class="statusTone(row)">{{ statusLabel(row) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
<script lang="ts">
import { t } from 'fyo';
import { fyo } from 'src/initFyo';
import { BusinessSummary, getBusinessSummary, NamedAmount } from 'src/utils/businessSummary';
import { defineComponent } from 'vue';
import BaseDashboardChart from './BaseDashboardChart.vue';

type Filter = [string, string, unknown];

/** What needs doing, what sells, who buys, and the latest sales. */
export default defineComponent({
  name: 'BusinessLists',
  extends: BaseDashboardChart,
  setup() {
    return { fyo };
  },
  data() {
    return { summary: null as BusinessSummary | null };
  },
  computed: {
    alerts() {
      const s = this.summary;
      if (!s) {
        return [];
      }
      const c = s.counts;
      const days = s.settings.overdue_after_days;
      const list = (schema: string, title: string, filters: Filter[]) => ({
        path: `/list/${schema}/${title}`,
        query: { filters: JSON.stringify(filters) },
      });
      const red = 'text-ink-red-7';
      const amber = 'text-ink-amber-7';
      return [
        { count: c.out_of_stock, title: t`Out of stock`, detail: t`Items with none left`, tone: red, route: '/report/StockBalance' },
        { count: c.low_stock, title: t`Low stock`, detail: t`${s.settings.low_stock_at} or fewer left`, tone: amber, route: '/report/StockBalance' },
        { count: c.overdue_sales, title: t`Overdue invoices`, detail: t`Unpaid over ${days} days`, tone: red, route: list('SalesInvoice', t`Unpaid Sales Invoices`, [['docstatus', '=', 1], ['outstanding_amount', '>', 0]]) },
        { count: c.unpaid_purchases, title: t`Bills to pay`, detail: this.compactCurrency(Number(s.kpis.payable ?? 0)), tone: amber, route: list('PurchaseInvoice', t`Unpaid Purchase Invoices`, [['docstatus', '=', 1], ['outstanding_amount', '>', 0]]) },
        { count: c.pending_shipments, title: t`To deliver`, detail: t`Sold, not yet shipped`, tone: amber, route: list('SalesInvoice', t`Sales Invoices to ship`, [['docstatus', '=', 1], ['stock_not_transferred', '>', 0]]) },
        { count: c.pending_receipts, title: t`To receive`, detail: t`Bought, not yet received`, tone: amber, route: list('PurchaseInvoice', t`Purchase Invoices to receive`, [['docstatus', '=', 1], ['stock_not_transferred', '>', 0]]) },
        { count: c.expiring_batches, title: t`Expiring batches`, detail: t`Within ${s.settings.expiry_window_days} days`, tone: red, route: '/list/Batch' },
        { count: c.pending_approvals, title: t`Drafts`, detail: t`Saved, not submitted`, tone: 'text-ink-gray-6', route: list('PurchaseInvoice', t`Draft Purchase Invoices`, [['docstatus', '=', 0]]) },
      ]
        .filter((alert) => Number(alert.count) > 0)
        .slice(0, 6);
    },
    rankings() {
      const s = this.summary;
      const rows = (list: NamedAmount[]) => {
        const max = Math.max(...list.map((r) => Math.abs(Number(r.amount))), 1);
        return list.slice(0, 6).map((r) => ({
          label: r.label,
          amount: this.compactCurrency(Number(r.amount)),
          width: `${Math.max(3, (Math.abs(Number(r.amount)) / max) * 100)}%`,
        }));
      };
      return [
        { title: t`Top products`, rows: rows(s?.top_items ?? []) },
        { title: t`Top customers`, rows: rows(s?.top_customers ?? []) },
      ];
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
    formatDate(value: string) {
      return fyo.format(String(value).slice(0, 10), 'Date');
    },
    statusLabel(row: BusinessSummary['recent'][number]) {
      if (row.docstatus === 0) return t`Draft`;
      if (row.docstatus === 2) return t`Cancelled`;
      return row.status;
    },
    statusTone(row: BusinessSummary['recent'][number]) {
      if (row.docstatus !== 1) return 'text-ink-gray-5';
      if (row.status === 'Paid') return 'text-ink-green-7';
      if (row.status === 'Unpaid') return 'text-ink-red-7';
      return 'text-ink-gray-6';
    },
  },
});
</script>
