import { call } from 'src/web/api';
import { PeriodKey } from 'src/utils/types';

/**
 * The site's business summary, from its `tokyo_dashboard` API (a Server Script
 * the Hipersign setup adds). A site without it has no summary, and the
 * dashboard widgets built on it stay hidden.
 */
export const BUSINESS_SUMMARY_METHOD = 'tokyo_dashboard';

export type NamedAmount = { label: string; amount: number; qty?: number; bills?: number };

export type BusinessSummary = {
  period: string;
  settings: { low_stock_at: number; overdue_after_days: number; expiry_window_days: number };
  kpis: Record<string, number | null>;
  counts: Record<string, number>;
  trends: {
    labels: string[];
    sales: number[];
    purchases: number[];
    income: number[];
    expense: number[];
    gross_profit: number[];
  };
  top_items: NamedAmount[];
  top_customers: NamedAmount[];
  recent: {
    name: string;
    party: string;
    date: string;
    grand_total: number;
    outstanding_amount: number;
    status: string;
    docstatus: number;
    is_pos: number;
  }[];
};

const PERIODS: Record<PeriodKey, string> = {
  'This Year': 'year',
  YTD: 'year',
  'This Quarter': 'quarter',
  'This Month': 'month',
};

// The widgets on one dashboard ask together; they share one request per period.
const pending = new Map<string, Promise<BusinessSummary | null>>();

export function getBusinessSummary(period: PeriodKey): Promise<BusinessSummary | null> {
  const key = PERIODS[period] ?? 'year';
  let request = pending.get(key);
  if (!request) {
    request = call<BusinessSummary>(BUSINESS_SUMMARY_METHOD, { period: key })
      .then((data) => data ?? null)
      .catch(() => null)
      .finally(() => setTimeout(() => pending.delete(key), 2000));
    pending.set(key, request);
  }
  return request;
}
