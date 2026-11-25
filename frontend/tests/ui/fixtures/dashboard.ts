import { fyo } from 'src/initFyo';
import 'src/router';
import { FrappeUI, FrappeUIProvider } from 'frappe-ui';
import Dashboard from 'src/pages/Dashboard/Dashboard.vue';
import { loadFrappeFixture } from './frappe';
import { languageDirectionKey } from 'src/utils/injectionKeys';
import { createApp, h, KeepAlive, markRaw, ref } from 'vue';
import { createMemoryHistory, createRouter } from 'vue-router';
import 'src/styles/index.css';

// The dashboard's figures exist only in browser memory, shaped as the server sends them.
const months = Array.from({ length: 12 }, (_, i) => {
  const date = new Date(2025, 11 + i, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
});
const names = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
const sales = [182, 205, 176, 231, 248, 262, 240, 281, 299, 315, 342, 268].map((v) => v * 1000);
const purchases = [120, 150, 98, 170, 160, 190, 150, 210, 205, 220, 260, 191].map((v) => v * 1000);

const params = new URLSearchParams(window.location.search);
const withSummary = params.get('summary') !== 'none';

const summary = {
  period: 'year',
  settings: { low_stock_at: 3, overdue_after_days: 30, expiry_window_days: 30 },
  kpis: {
    gross_profit: 964000, gross_change: 8.7, gross_margin: 35.9,
    net_profit: 494500, net_change: -2.3,
    stock_value: 1452000, stock_qty: 612,
    cash: 84200, bank: 312000, cash_bank: 396200, payable: 63500,
  },
  counts: {
    out_of_stock: 6, low_stock: 5, overdue_sales: 2, unpaid_purchases: 4,
    pending_shipments: 3, pending_receipts: 0, expiring_batches: 0, pending_approvals: 2,
  },
  trends: {
    labels: names.map((n, i) => `${n} ${i === 0 ? '25' : '26'}`),
    sales, purchases,
    income: sales, expense: sales.map((v) => v * 0.82), gross_profit: sales.map((v) => v * 0.36),
  },
  top_items: [
    { label: 'JORDAN 1', qty: 14, amount: 125986 },
    { label: 'ULTRABOOST', qty: 9, amount: 67491 },
    { label: 'PUMA SMASH', qty: 17, amount: 56083 },
    { label: 'Nike Air Max', qty: 4, amount: 31996 },
    { label: 'Crocs Classic', qty: 8, amount: 23992 },
  ],
  top_customers: [
    { label: 'Walk-in Customer', bills: 142, amount: 198400 },
    { label: 'Shamil', bills: 12, amount: 22100 },
    { label: 'Arjun K', bills: 4, amount: 17996 },
    { label: 'Fathima S', bills: 3, amount: 12497 },
  ],
  recent: [
    { name: 'SINV-1189', party: 'Walk-in Customer', date: '2026-11-25 10:42:00', grand_total: 8999, outstanding_amount: 0, status: 'Paid', docstatus: 1, is_pos: 1 },
    { name: 'SINV-1188', party: 'Arjun K', date: '2026-11-25 10:05:00', grand_total: 16498, outstanding_amount: 16498, status: 'Unpaid', docstatus: 1, is_pos: 0 },
    { name: 'SINV-1187', party: 'Walk-in Customer', date: '2026-11-24 19:31:00', grand_total: 3299, outstanding_amount: 0, status: 'Paid', docstatus: 1, is_pos: 1 },
    { name: 'SINV-1186', party: 'Shamil', date: '2026-11-24 18:12:00', grand_total: -473, outstanding_amount: 0, status: 'Return', docstatus: 1, is_pos: 1 },
    { name: 'SINV-1185', party: 'Fathima S', date: '2026-11-24 16:40:00', grand_total: 7499, outstanding_amount: 2000, status: 'Partly Paid', docstatus: 1, is_pos: 0 },
  ],
};

function answer(path: string) {
  if (path.endsWith('tokyo_dashboard')) {
    return withSummary ? { message: summary } : new Response('{}', { status: 404 });
  }
  if (path.endsWith('get_invoice_summary')) {
    return { message: { paid: 2681000, unpaid: 48200, paid_count: 177, unpaid_count: 7, from_date: '2026-01-01', before_date: '2026-11-26' } };
  }
  if (path.endsWith('get_cashflow')) {
    return { message: { has_data: true, months: months.map((m, i) => ({ yearmonth: m, inflow: sales[i], outflow: purchases[i] * 0.9 })) } };
  }
  if (path.endsWith('get_profit_and_loss')) {
    return { message: { has_data: true, months: months.map((m, i) => ({ yearmonth: m, balance: sales[i] * 0.18 })) } };
  }
  if (path.endsWith('get_top_expenses')) {
    return { message: [{ account: 'Cost of Goods Sold', total: 1820000 }, { account: 'Rent', total: 240000 }, { account: 'Salaries', total: 180000 }] };
  }
  return { message: [], data: [] };
}

async function mount() {
  await loadFrappeFixture(answer);
  markRaw(fyo);
  fyo.singles.SystemSettings = { currency: 'INR', locale: 'en-IN', display_precision: 2, date_format: 'MMM d, y' } as any;
  fyo.can = () => true;

  const app = createApp({
    render: () =>
      h(FrappeUIProvider, {}, {
        default: () =>
          h('main', { class: 'flex h-screen flex-col bg-surface-base' }, [h(KeepAlive, null, [h(Dashboard)])]),
      }),
  });
  app.use(FrappeUI);
  app.use(createRouter({ history: createMemoryHistory(), routes: [{ path: '/:p(.*)*', component: { render: () => null } }] }));
  app.mixin({ computed: { fyo: () => fyo, platform: () => 'Web' }, methods: { t: fyo.t, T: fyo.T } });
  app.provide(languageDirectionKey, ref('ltr'));
  app.mount('#app');
}

void mount();
