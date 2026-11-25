// Tokyo business dashboard. Data: /api/method/tokyo_dashboard (Server Script "Tokyo Dashboard API").
// Source: github.com/hipersignerp-dev/frappe-books-hipersign, branch tokyo-workspace
(function () {
  const root = root_element;
  const $ = (sel) => root.querySelector(sel);
  const $$ = (sel) => Array.from(root.querySelectorAll(sel));
  const body = $("[data-body]");
  const state = { period: "month", tab: "overview", data: null };

  // ---------- helpers ----------
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = (v) => Number(v || 0);
  function money(v, full) {
    v = num(v);
    const sign = v < 0 ? "−" : "";
    const a = Math.abs(v);
    if (!full) {
      if (a >= 1e7) return sign + "₹" + (a / 1e7).toFixed(a >= 1e8 ? 0 : 2).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") + " Cr";
      if (a >= 1e5) return sign + "₹" + (a / 1e5).toFixed(a >= 1e6 ? 1 : 2).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "") + " L";
    }
    return sign + "₹" + a.toLocaleString("en-IN", { maximumFractionDigits: a < 100 ? 2 : 0 });
  }
  const count = (v) => num(v).toLocaleString("en-IN");
  const plural = (n, one, many) => count(n) + " " + (num(n) === 1 ? one : many);
  function short(v) {
    const a = Math.abs(v), s = v < 0 ? "−" : "";
    const trim = (x) => x.toFixed(x >= 10 ? 0 : 2).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
    if (a >= 1e7) return s + trim(a / 1e7) + " Cr";
    if (a >= 1e5) return s + trim(a / 1e5) + " L";
    if (a >= 1e3) return s + trim(a / 1e3) + "K";
    return s + Math.round(a);
  }
  const qty = (v) => num(v).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  const PERIOD_TEXT = { today: "today", week: "this week", month: "this month", quarter: "this quarter", year: "this year" };
  const PREV_TEXT = { today: "yesterday", week: "last week", month: "same days last month", quarter: "last quarter", year: "last year" };

  function chip(pct, invert) {
    if (pct == null) return "";
    const good = invert ? pct < 0 : pct > 0;
    const cls = pct === 0 ? "flat" : good ? "up" : "down";
    const arrow = pct > 0 ? "↑" : pct < 0 ? "↓" : "→";
    return `<span class="tk-chip ${cls}">${arrow} ${Math.abs(pct)}%</span>`;
  }

  const ICONS = {
    sales: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L22 8H6"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>',
    outbox: '<path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18"/><path d="M7 6h1v4"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
    bank: '<path d="M3 21h18"/><path d="M5 21V10"/><path d="M19 21V10"/><path d="M9 21V10"/><path d="M15 21V10"/><path d="m12 3 9 6H3z"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    truck: '<path d="M1 4h14v12H1z"/><path d="M15 8h4l4 4v4h-8"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    star: '<path d="m12 2 3 7h7l-5.5 4.5 2 7.5-6.5-4.5L5.5 21l2-7.5L2 9h7z"/>',
    x: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[n] || ICONS.file}</svg>`;
  const COLORS = {
    orange: ["#f26b1d", "rgba(242,107,29,.1)"], green: ["#16a34a", "rgba(22,163,74,.1)"],
    red: ["#dc2626", "rgba(220,38,38,.09)"], blue: ["#2563eb", "rgba(37,99,235,.09)"],
    violet: ["#7c3aed", "rgba(124,58,237,.09)"], amber: ["#d97706", "rgba(217,119,6,.1)"],
    teal: ["#0d9488", "rgba(13,148,136,.1)"], slate: ["#475569", "rgba(71,85,105,.1)"],
  };
  const PALETTE = ["#f26b1d", "#2563eb", "#16a34a", "#7c3aed", "#d97706", "#0d9488", "#db2777", "#475569"];

  // ---------- navigation ----------
  function go(target) {
    if (!target) return;
    const i = target.indexOf(":");
    const kind = target.slice(0, i), rest = target.slice(i + 1);
    if (kind === "form") return frappe.new_doc(rest);
    if (kind === "books") return (window.location.href = "/books" + rest);
    if (kind === "report") return frappe.set_route("query-report", rest);
    if (kind === "list") {
      const [dt, filters] = rest.split("|");
      if (filters) frappe.route_options = JSON.parse(filters);
      return frappe.set_route("List", dt);
    }
    if (kind === "doc") {
      const [dt, name] = rest.split("|");
      return frappe.set_route("Form", dt, name);
    }
    if (kind === "url") return (window.location.href = rest);
  }
  const L = (dt, f) => "list:" + dt + (f ? "|" + JSON.stringify(f) : "");

  // ---------- building blocks ----------
  function kpi(o) {
    const [c, cs] = COLORS[o.color || "orange"];
    return `<div class="tk-kpi${o.warn ? " warn" : ""}" style="--c:${c};--cs:${cs}" ${o.go ? `data-go='${esc(o.go)}'` : ""}>
      <div class="tk-kpi-top"><span class="tk-kpi-ic">${icon(o.icon)}</span><span class="tk-kpi-label">${esc(o.label)}</span></div>
      <div class="tk-kpi-val">${o.value}</div>
      <div class="tk-kpi-foot">${o.chip || ""}<span>${o.foot || ""}</span></div>
    </div>`;
  }
  const kpis = (list) => `<div class="tk-kpis">${list.map(kpi).join("")}</div>`;
  function panel(span, title, inner, opts) {
    opts = opts || {};
    return `<section class="tk-panel tk-span-${span}">
      <div class="tk-panel-head"><div><h3>${esc(title)}</h3>${opts.sub ? `<small>${esc(opts.sub)}</small>` : ""}</div>
      ${opts.legend || ""}${opts.link ? `<a class="tk-link" data-go='${esc(opts.link[1])}'>${esc(opts.link[0])} →</a>` : ""}</div>
      ${inner}</section>`;
  }
  const legend = (items) => `<div class="tk-legend">${items.map(([n, c]) => `<span><i style="background:${c}"></i>${esc(n)}</span>`).join("")}</div>`;
  const sectionTitle = (t, s) => `<div class="tk-sec-title"><h2>${esc(t)}</h2>${s ? `<span>${esc(s)}</span>` : ""}</div>`;

  // ---------- charts (plain SVG) ----------
  let chartId = 0;
  const pending = [];
  function chartSlot(fn) {
    const id = "tkc" + ++chartId;
    pending.push([id, fn]);
    return `<div class="tk-chart" id="${id}"></div>`;
  }
  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
  }
  function axes(W, H, pad, min, max, labels, step) {
    let g = "";
    for (let i = 0; i <= 4; i++) {
      const v = min + ((max - min) * i) / 4;
      const y = H - pad.b - ((H - pad.t - pad.b) * i) / 4;
      g += `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y}" y2="${y}"/><text x="${pad.l - 6}" y="${y + 3}" text-anchor="end">${short(v)}</text>`;
    }
    labels.forEach((l, i) => {
      if (labels.length > 8 && i % 2) return;
      const x = pad.l + step * i + step / 2;
      g += `<text x="${x}" y="${H - 6}" text-anchor="middle">${esc(l)}</text>`;
    });
    return g;
  }
  function scaleFor(series) {
    let lo = 0, hi = 0;
    series.forEach((s) => s.values.forEach((v) => { lo = Math.min(lo, v); hi = Math.max(hi, v); }));
    hi = niceMax(hi); lo = lo < 0 ? -niceMax(-lo) : 0;
    return [lo, hi];
  }
  function barChart(labels, series, H) {
    return chartSlot((el) => {
      const W = Math.max(el.clientWidth, 280); H = H || 230;
      const pad = { l: 46, r: 6, t: 10, b: 24 };
      const [lo, hi] = scaleFor(series);
      const step = (W - pad.l - pad.r) / labels.length;
      const y = (v) => H - pad.b - ((v - lo) / (hi - lo)) * (H - pad.t - pad.b);
      const bw = Math.min(18, (step * 0.7) / series.length);
      let g = axes(W, H, pad, lo, hi, labels, step);
      labels.forEach((l, i) => series.forEach((s, j) => {
        const v = s.values[i] || 0;
        const x = pad.l + step * i + step / 2 - (bw * series.length) / 2 + j * bw;
        const y0 = y(0), y1 = y(v);
        g += `<rect class="bar" x="${x + 1}" y="${Math.min(y0, y1)}" width="${bw - 2}" height="${Math.max(Math.abs(y0 - y1), v ? 1.5 : 0)}" rx="3" fill="${s.color}" data-tip="${esc(l + " · " + s.name + ": " + money(v, true))}"/>`;
      }));
      el.innerHTML = `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`;
    });
  }
  function lineChart(labels, series, H) {
    return chartSlot((el) => {
      const W = Math.max(el.clientWidth, 280); H = H || 230;
      const pad = { l: 46, r: 8, t: 10, b: 24 };
      const [lo, hi] = scaleFor(series);
      const step = (W - pad.l - pad.r) / labels.length;
      const x = (i) => pad.l + step * i + step / 2;
      const y = (v) => H - pad.b - ((v - lo) / (hi - lo)) * (H - pad.t - pad.b);
      let g = axes(W, H, pad, lo, hi, labels, step);
      series.forEach((s, j) => {
        const pts = s.values.map((v, i) => [x(i), y(v || 0)]);
        const path = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
        const gid = "tkg" + chartId + "_" + j;
        g += `<defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${s.color}" stop-opacity=".22"/><stop offset="1" stop-color="${s.color}" stop-opacity="0"/></linearGradient></defs>`;
        if (series.length === 1) g += `<path d="${path} L${pts[pts.length - 1][0]} ${y(Math.max(lo, 0))} L${pts[0][0]} ${y(Math.max(lo, 0))} Z" fill="url(#${gid})"/>`;
        g += `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
        pts.forEach((p, i) => { g += `<circle class="pt" cx="${p[0]}" cy="${p[1]}" r="3.2" fill="var(--tk-card)" stroke="${s.color}" stroke-width="2" data-tip="${esc(labels[i] + " · " + s.name + ": " + money(s.values[i], true))}"/>`; });
      });
      el.innerHTML = `<svg viewBox="0 0 ${W} ${H}">${g}</svg>`;
    });
  }
  function hbars(rows, color, fmt) {
    if (!rows.length) return `<div class="tk-empty">No sales in this period yet.</div>`;
    const max = Math.max(...rows.map((r) => Math.abs(num(r.value)))) || 1;
    return `<div class="tk-hbars">${rows.map((r) => `
      <div class="tk-hbar" ${r.go ? `data-go='${esc(r.go)}' style="cursor:pointer"` : ""}>
        <span class="tk-hbar-name" title="${esc(r.label)}">${esc(r.label)}</span>
        <span class="tk-hbar-val">${(fmt || money)(r.value)}${r.extra ? ` · ${esc(r.extra)}` : ""}</span>
        <div class="tk-hbar-track"><div class="tk-hbar-fill" style="width:${Math.max(2, (Math.abs(num(r.value)) / max) * 100)}%;--c:${r.color || color}"></div></div>
      </div>`).join("")}</div>`;
  }
  function donut(rows, fmt) {
    rows = rows.filter((r) => num(r.value) > 0);
    if (!rows.length) return `<div class="tk-empty">Nothing to show for this period.</div>`;
    const total = rows.reduce((a, r) => a + num(r.value), 0);
    const R = 52, C = 2 * Math.PI * R;
    let off = 0, arcs = "";
    rows.forEach((r, i) => {
      const len = (num(r.value) / total) * C;
      arcs += `<circle r="${R}" cx="66" cy="66" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="18" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 66 66)" data-tip="${esc(r.label + ": " + (fmt || money)(r.value))}"/>`;
      off += len;
    });
    return `<div class="tk-donut"><svg viewBox="0 0 132 132">${arcs}
      <text x="66" y="62" text-anchor="middle" style="font-size:10px;fill:var(--tk-muted)">Total</text>
      <text x="66" y="78" text-anchor="middle" style="font-size:13px;font-weight:700;fill:var(--tk-text)">${(fmt || money)(total)}</text></svg>
      <div class="tk-donut-list">${rows.map((r, i) => `<div class="tk-donut-row"><i style="background:${PALETTE[i % PALETTE.length]}"></i><span>${esc(r.label)}</span><b>${Math.round((num(r.value) / total) * 100)}%</b></div>`).join("")}</div></div>`;
  }
  function miniList(rows, empty) {
    if (!rows.length) return `<div class="tk-empty">${esc(empty)}</div>`;
    return `<div class="tk-mini-list">${rows.map((r) => `<div class="tk-mini-row" ${r.go ? `data-go='${esc(r.go)}'` : ""}><span>${esc(r.label)}</span>${r.right || ""}</div>`).join("")}</div>`;
  }
  function reportLinks(list) {
    return `<div class="tk-reports">${list.map(([n, t]) => `<a class="tk-report" data-go='${esc(t)}'><i>▤</i>${esc(n)}</a>`).join("")}</div>`;
  }

  // ---------- shared pieces ----------
  const REPORTS = {
    sales: [["Sales Register", "report:Sales Register"], ["Item-wise Sales", "report:Item-wise Sales"], ["Customer-wise Sales", "report:Customer-wise Sales"], ["Product & Variant Sales", "report:Product Variant Sales"], ["Daily Sales Summary", "report:Daily Sales Summary"], ["Sales Quote Status", "report:Sales Quote Status"], ["Accounts Receivable", "report:Accounts Receivable"], ["Gross Profit by Item", "report:Gross Profit by Item"]],
    stock: [["Stock Balance", "books:/report/StockBalance"], ["Stock Ledger", "books:/report/StockLedger"], ["Variant Stock Matrix", "report:Variant Stock Matrix"], ["Low & Out of Stock", "report:Low and Out of Stock"], ["Batch-wise Stock", "report:Batch-wise Stock"], ["Slow Moving Items", "report:Slow Moving Items"], ["Item-wise Purchase History", "report:Item-wise Purchase History"], ["Item-wise Sales History", "report:Item-wise Sales"]],
    purchase: [["Purchase Register", "report:Purchase Register"], ["Supplier-wise Purchase", "report:Supplier-wise Purchase"], ["Item-wise Purchase History", "report:Item-wise Purchase History"], ["Accounts Payable", "report:Accounts Payable"]],
    accounts: [["Profit and Loss", "books:/report/ProfitAndLoss"], ["Balance Sheet", "books:/report/BalanceSheet"], ["Trial Balance", "books:/report/TrialBalance"], ["General Ledger", "books:/report/GeneralLedger"], ["Accounts Receivable", "report:Accounts Receivable"], ["Accounts Payable", "report:Accounts Payable"], ["Sales Register", "report:Sales Register"], ["Purchase Register", "report:Purchase Register"], ["Payments Register", "report:Payments Register"], ["Chart of Accounts", "books:/chart-of-accounts"]],
    gst: [["GSTR-1 (Sales)", "books:/report/GSTR1"], ["GSTR-2 (Purchases)", "books:/report/GSTR2"], ["HSN/SAC Summary", "report:HSN-wise Sales Summary"], ["GST Tax Summary", "report:GST Tax Summary"]],
    customers: [["Customer-wise Sales", "report:Customer-wise Sales"], ["Lead Status", "report:Lead Status"], ["Accounts Receivable", "report:Accounts Receivable"], ["Sales Quote Status", "report:Sales Quote Status"]],
  };

  function alertDefs(d) {
    const c = d.counts, k = d.kpis, s = d.settings;
    return [
      { n: c.out_of_stock, t: "Out of stock", d: "Items with no stock left", color: "red", go: "report:Low and Out of Stock" },
      { n: c.low_stock, t: "Low stock", d: `${s.low_stock_at} or fewer left`, color: "amber", go: "report:Low and Out of Stock" },
      { n: c.overdue_sales, t: "Overdue payments", d: c.overdue_sales ? `${money(c.overdue_sales_amount)} unpaid over ${s.overdue_after_days} days` : `Unpaid over ${s.overdue_after_days} days`, color: "red", go: L("Books Sales Invoice", { docstatus: 1, outstanding_amount: [">", 0] }) },
      { n: c.unpaid_purchases, t: "Supplier payments due", d: c.unpaid_purchases ? `${money(k.payable)} to pay` : "Nothing due", color: "amber", go: L("Books Purchase Invoice", { docstatus: 1, outstanding_amount: [">", 0] }) },
      { n: c.pending_shipments, t: "Pending shipments", d: "Sold, not yet delivered", color: "blue", go: L("Books Sales Invoice", { docstatus: 1, stock_not_transferred: [">", 0] }) },
      { n: c.pending_receipts, t: "Pending receipts", d: "Bought, not yet received", color: "blue", go: L("Books Purchase Invoice", { docstatus: 1, stock_not_transferred: [">", 0] }) },
      { n: c.expiring_batches, t: "Expiring batches", d: `Within ${s.expiry_window_days} days`, color: "red", go: "report:Batch-wise Stock" },
      { n: c.pending_approvals, t: "Drafts to submit", d: `${c.draft_sales} sales · ${c.draft_purchases} purchase · ${c.draft_stock} stock`, color: "violet", go: L("Books Purchase Invoice", { docstatus: 0 }) },
      { n: c.old_quotes, t: "Old open quotes", d: `Quotes over ${s.overdue_after_days} days, not billed`, color: "amber", go: "report:Sales Quote Status" },
      { n: c.leads_open, t: "Leads to follow up", d: "Open or replied leads", color: "teal", go: L("Books Lead", { status: ["in", ["Open", "Replied"]] }) },
    ];
  }
  function alertCards(d, onlyActive) {
    const list = alertDefs(d).filter((a) => !onlyActive || num(a.n) > 0);
    if (!list.length) return `<div class="tk-empty">✓ All clear. Nothing needs attention right now.</div>`;
    return `<div class="tk-alerts">${list.map((a) => {
      const [c, cs] = COLORS[a.color];
      const ok = !num(a.n);
      return `<div class="tk-alert${ok ? " ok" : ""}" style="--c:${c};--cs:${ok ? "var(--tk-soft)" : cs}" data-go='${esc(a.go)}'>
        <span class="tk-alert-dot" style="${ok ? "color:var(--tk-green)" : ""}">${ok ? "✓" : count(a.n)}</span>
        <span class="tk-alert-txt"><b>${esc(a.t)}</b><span>${esc(a.d)}</span></span></div>`;
    }).join("")}</div>`;
  }
  function attentionList(d) {
    const list = alertDefs(d).filter((a) => num(a.n) > 0).slice(0, 7);
    if (!list.length) return `<div class="tk-empty">✓ All clear. Nothing needs attention right now.</div>`;
    return `<div class="tk-mini-list">${list.map((a) => {
      const [c, cs] = COLORS[a.color];
      return `<div class="tk-mini-row" data-go='${esc(a.go)}'><span><b style="font-weight:600">${esc(a.t)}</b><br><small style="color:var(--tk-muted)">${esc(a.d)}</small></span>
        <span class="tk-pill" style="background:${cs};color:${c};align-self:center">${count(a.n)}</span></div>`;
    }).join("")}</div>`;
  }
  function recentTable(d) {
    if (!d.recent.length) return `<div class="tk-empty">No invoices yet.</div>`;
    const pill = (r) => {
      if (r.docstatus === 0) return `<span class="tk-pill grey">Draft</span>`;
      if (r.docstatus === 2) return `<span class="tk-pill grey">Cancelled</span>`;
      const st = r.status || "";
      const cls = st === "Paid" ? "green" : st.indexOf("Return") === 0 ? "blue" : st === "Unpaid" ? "red" : "amber";
      return `<span class="tk-pill ${cls}">${esc(st)}</span>`;
    };
    return `<table class="tk-table"><thead><tr><th>Invoice</th><th>Customer</th><th>Date</th><th class="tk-num">Amount</th><th>Status</th></tr></thead><tbody>
      ${d.recent.map((r) => `<tr data-go='doc:Books Sales Invoice|${esc(r.name)}'>
        <td><b>${esc(r.name)}</b>${r.is_pos ? ` <span class="tk-pill grey">POS</span>` : ""}</td><td>${esc(r.party)}</td>
        <td>${esc(frappe.datetime ? frappe.datetime.str_to_user(String(r.date).slice(0, 10)) : String(r.date).slice(0, 10))}</td>
        <td class="tk-num">${money(r.grand_total, true)}</td><td>${pill(r)}</td></tr>`).join("")}
    </tbody></table>`;
  }
  const T = (d) => d.trends;
  const per = () => PERIOD_TEXT[state.period];
  const vs = () => "vs " + PREV_TEXT[state.period];

  // ---------- tabs ----------
  const VIEWS = {
    overview(d) {
      const k = d.kpis, c = d.counts;
      return kpis([
        { label: "Total Sales", value: money(k.sales), chip: chip(k.sales_change), foot: k.sales_change == null ? `${count(c.sales_invoices)} bills ${per()}` : vs(), icon: "sales", color: "orange", go: L("Books Sales Invoice", { docstatus: 1 }) },
        { label: "Total Purchase", value: money(k.purchases), chip: chip(k.purchases_change, true), foot: k.purchases_change == null ? `${count(c.purchase_invoices)} bills ${per()}` : vs(), icon: "cart", color: "blue", go: L("Books Purchase Invoice", { docstatus: 1 }) },
        { label: "Total Receivables", value: money(k.receivable), foot: plural(c.unpaid_sales, "unpaid invoice", "unpaid invoices"), icon: "inbox", color: "teal", go: "report:Accounts Receivable" },
        { label: "Total Payables", value: money(k.payable), foot: plural(c.unpaid_purchases, "unpaid bill", "unpaid bills"), icon: "outbox", color: "amber", go: "report:Accounts Payable" },
        { label: "Gross Profit", value: money(k.gross_profit), chip: chip(k.gross_change), foot: k.gross_margin == null ? "Sales − cost of goods" : `${k.gross_margin}% margin`, icon: "trend", color: k.gross_profit < 0 ? "red" : "green", warn: k.gross_profit < 0, go: "books:/report/ProfitAndLoss" },
        { label: "Net Profit", value: money(k.net_profit), chip: chip(k.net_change), foot: "Income − all expenses", icon: "coins", color: k.net_profit < 0 ? "red" : "green", warn: k.net_profit < 0, go: "books:/report/ProfitAndLoss" },
        { label: "Stock Valuation", value: money(k.stock_value), foot: `${qty(k.stock_qty)} units in stock`, icon: "box", color: "violet", go: "books:/report/StockBalance" },
        { label: "Cash & Bank", value: money(k.cash_bank), foot: `Cash ${money(k.cash)} · Bank ${money(k.bank)}`, icon: "bank", color: "green", go: "books:/report/GeneralLedger" },
        { label: "Total Expenses", value: money(k.expense), chip: chip(k.expense_change, true), foot: "Incl. cost of goods sold", icon: "receipt", color: "red", go: "books:/report/ProfitAndLoss" },
        { label: "Pending Shipments", value: count(c.pending_shipments), foot: "Sold, not yet delivered", icon: "truck", color: "blue", go: L("Books Sales Invoice", { docstatus: 1, stock_not_transferred: [">", 0] }) },
        { label: "Pending Receipts", value: count(c.pending_receipts), foot: "Bought, not yet received", icon: "download", color: "slate", go: L("Books Purchase Invoice", { docstatus: 1, stock_not_transferred: [">", 0] }) },
        { label: "Overdue Invoices", value: count(c.overdue_sales), foot: c.overdue_sales ? `${money(c.overdue_sales_amount)} over ${d.settings.overdue_after_days} days` : `None over ${d.settings.overdue_after_days} days`, icon: "clock", color: "red", warn: c.overdue_sales > 0, go: L("Books Sales Invoice", { docstatus: 1, outstanding_amount: [">", 0] }) },
      ]) + `<div class="tk-grid">
        ${panel(8, "Sales vs Purchase", barChart(T(d).labels, [{ name: "Sales", color: "#f26b1d", values: T(d).sales }, { name: "Purchase", color: "#2563eb", values: T(d).purchases }], 300), { sub: "Last 12 months", legend: legend([["Sales", "#f26b1d"], ["Purchase", "#2563eb"]]) })}
        ${panel(4, "Needs attention", attentionList(d), { link: ["All alerts", "tab:alerts"] })}
        ${panel(6, "Revenue vs Expenses", barChart(T(d).labels, [{ name: "Revenue", color: "#16a34a", values: T(d).income }, { name: "Expenses", color: "#dc2626", values: T(d).expense }]), { sub: "Last 12 months", legend: legend([["Revenue", "#16a34a"], ["Expenses", "#dc2626"]]) })}
        ${panel(6, "Gross Profit Trend", lineChart(T(d).labels, [{ name: "Gross profit", color: "#16a34a", values: T(d).gross_profit }]), { sub: "Last 12 months" })}
        ${panel(4, "Top 10 Selling Products", hbars(d.top_items.map((r) => ({ label: r.label, value: r.amount, extra: qty(r.qty) + " pcs" })), "#f26b1d"), { sub: per(), link: ["Report", "report:Item-wise Sales"] })}
        ${panel(4, "Top 10 Customers", hbars(d.top_customers.map((r) => ({ label: r.label, value: r.amount, extra: plural(r.bills, "bill", "bills") })), "#2563eb"), { sub: per(), link: ["Report", "report:Customer-wise Sales"] })}
        ${panel(4, "Sales by Item Group", donut(d.by_group.map((r) => ({ label: r.label, value: r.amount }))), { sub: per() })}
        ${panel(8, "Recent Invoices", recentTable(d), { link: ["All invoices", L("Books Sales Invoice")] })}
        ${panel(4, "Receivables vs Payables", hbars([{ label: "To receive from customers", value: k.receivable, color: "#0d9488" }, { label: "To pay suppliers", value: k.payable, color: "#d97706" }]) + `<div style="height:6px"></div>` + donut(d.by_channel.map((r) => ({ label: r.label, value: r.amount }))), { sub: "Money in · money out · sales channel" })}
      </div>`;
    },
    sales(d) {
      const k = d.kpis, c = d.counts;
      return kpis([
        { label: "Today's Sales", value: money(c.sales_today), foot: plural(c.bills_today, "bill", "bills") + " today", icon: "sales", go: L("Books Sales Invoice", { docstatus: 1 }) },
        { label: "Sales " + per(), value: money(k.sales), chip: chip(k.sales_change), foot: vs(), icon: "trend", color: "green", go: "report:Sales Register" },
        { label: "Invoices " + per(), value: count(c.sales_invoices), foot: c.sales_invoices ? `Avg ${money(k.sales / c.sales_invoices)} per bill` : "No bills yet", icon: "receipt", color: "blue", go: L("Books Sales Invoice", { docstatus: 1 }) },
        { label: "Quotes " + per(), value: count(c.quotes), foot: `${count(c.open_quotes)} still open`, icon: "file", color: "violet", go: L("Books Sales Quote") },
        { label: "Open Quotes", value: count(c.open_quotes), foot: "Not billed yet", icon: "clock", color: "amber", go: "report:Sales Quote Status" },
        { label: "Pending Shipments", value: count(c.pending_shipments), foot: "Sold, not delivered", icon: "truck", color: "blue", go: L("Books Sales Invoice", { docstatus: 1, stock_not_transferred: [">", 0] }) },
        { label: "Sales Returns", value: money(c.sales_returns), foot: per(), icon: "undo", color: "red", go: L("Books Sales Invoice", { docstatus: 1, return_against: ["is", "set"] }) },
        { label: "Outstanding Invoices", value: count(c.unpaid_sales), foot: `${money(k.receivable)} to collect`, icon: "inbox", color: "teal", warn: c.overdue_sales > 0, go: "report:Accounts Receivable" },
      ]) + `<div class="tk-grid">
        ${panel(8, "Monthly Sales Trend", lineChart(T(d).labels, [{ name: "Sales", color: "#f26b1d", values: T(d).sales }]), { sub: "Last 12 months" })}
        ${panel(4, "Sales Channel", donut(d.by_channel.map((r) => ({ label: r.label + " (" + r.bills + ")", value: r.amount }))), { sub: per() })}
        ${panel(6, "Top 10 Selling Products", hbars(d.top_items.map((r) => ({ label: r.label, value: r.amount, extra: qty(r.qty) + " pcs" })), "#f26b1d"), { sub: per() })}
        ${panel(6, "Top 10 Customers", hbars(d.top_customers.map((r) => ({ label: r.label, value: r.amount, extra: plural(r.bills, "bill", "bills") })), "#2563eb"), { sub: per() })}
        ${panel(12, "Sales Reports", reportLinks(REPORTS.sales))}
      </div>`;
    },
    stock(d) {
      const k = d.kpis, c = d.counts, a = d.alerts;
      const low = a.low_stock.map((r) => ({ label: r.name, right: `<span class="tk-pill amber">${qty(r.qty)} left</span>`, go: `doc:Books Item|${r.name}` }));
      const out = a.out_of_stock.map((r) => ({ label: r.name, right: `<span class="tk-pill red">0</span>`, go: `doc:Books Item|${r.name}` }));
      const exp = a.expiring_batches.map((r) => ({ label: `${r.name} · ${r.item}`, right: `<span class="tk-pill red">${esc(String(r.expiry).slice(0, 10))}</span>` }));
      return kpis([
        { label: "Total Items", value: count(c.items), foot: "Incl. every colour & size", icon: "tag", color: "slate", go: L("Books Item") },
        { label: "Products", value: count(c.products), foot: "With variants", icon: "layers", color: "violet", go: L("Product") },
        { label: "Stock Quantity", value: qty(k.stock_qty), foot: "Units across locations", icon: "box", color: "blue", go: "books:/report/StockBalance" },
        { label: "Stock Valuation", value: money(k.stock_value), foot: "At cost", icon: "coins", color: "green", go: "books:/report/StockBalance" },
        { label: "Low Stock Items", value: count(c.low_stock), foot: `${d.settings.low_stock_at} or fewer left`, icon: "alert", color: "amber", warn: c.low_stock > 0, go: "report:Low and Out of Stock" },
        { label: "Out of Stock", value: count(c.out_of_stock), foot: "Nothing left to sell", icon: "x", color: "red", warn: c.out_of_stock > 0, go: "report:Low and Out of Stock" },
        { label: "Expiring Batches", value: count(c.expiring_batches), foot: `Within ${d.settings.expiry_window_days} days`, icon: "clock", color: "red", warn: c.expiring_batches > 0, go: "report:Batch-wise Stock" },
        { label: "Draft Stock Entries", value: count(c.draft_stock), foot: "Not yet submitted", icon: "file", color: "amber", go: L("Books Stock Movement", { docstatus: 0 }) },
      ]) + `<div class="tk-grid">
        ${panel(4, "Low Stock", miniList(low, "No items running low."), { link: ["Report", "report:Low and Out of Stock"] })}
        ${panel(4, "Out of Stock", miniList(out, "Everything is in stock.") + (c.out_of_stock > out.length ? `<div class="tk-empty" style="padding:8px">+ ${c.out_of_stock - out.length} more</div>` : ""), { link: ["Report", "report:Low and Out of Stock"] })}
        ${panel(4, "Expiring Batches", miniList(exp, "No batches expiring soon."), { link: ["Batches", L("Books Batch")] })}
        ${panel(12, "Stock Reports", reportLinks(REPORTS.stock))}
      </div>`;
    },
    purchase(d) {
      const k = d.kpis, c = d.counts;
      return kpis([
        { label: "Purchases " + per(), value: money(k.purchases), chip: chip(k.purchases_change, true), foot: vs(), icon: "cart", color: "blue", go: "report:Purchase Register" },
        { label: "Purchase Bills", value: count(c.purchase_invoices), foot: per(), icon: "receipt", color: "slate", go: L("Books Purchase Invoice", { docstatus: 1 }) },
        { label: "Pending Receipts", value: count(c.pending_receipts), foot: "Bought, not yet received", icon: "download", color: "amber", go: L("Books Purchase Invoice", { docstatus: 1, stock_not_transferred: [">", 0] }) },
        { label: "Suppliers", value: count(c.suppliers), foot: "Active parties", icon: "users", color: "violet", go: L("Books Party", { role: ["in", ["Supplier", "Both"]] }) },
        { label: "Supplier Outstanding", value: money(k.payable), foot: plural(c.unpaid_purchases, "unpaid bill", "unpaid bills"), icon: "outbox", color: "amber", go: "report:Accounts Payable" },
        { label: "Overdue Supplier Bills", value: count(c.overdue_purchases), foot: c.overdue_purchases ? money(c.overdue_purchases_amount) : `None over ${d.settings.overdue_after_days} days`, icon: "clock", color: "red", warn: c.overdue_purchases > 0, go: L("Books Purchase Invoice", { docstatus: 1, outstanding_amount: [">", 0] }) },
        { label: "Purchase Returns", value: money(c.purchase_returns), foot: per(), icon: "undo", color: "red", go: L("Books Purchase Invoice", { docstatus: 1, return_against: ["is", "set"] }) },
        { label: "Draft Purchases", value: count(c.draft_purchases), foot: "Not yet submitted", icon: "file", color: "slate", go: L("Books Purchase Invoice", { docstatus: 0 }) },
      ]) + `<div class="tk-grid">
        ${panel(8, "Monthly Purchase Trend", lineChart(T(d).labels, [{ name: "Purchases", color: "#2563eb", values: T(d).purchases }]), { sub: "Last 12 months" })}
        ${panel(4, "Money owed", hbars([{ label: "To pay suppliers", value: k.payable, color: "#d97706" }, { label: "Overdue to suppliers", value: c.overdue_purchases_amount, color: "#dc2626" }]), { sub: "Supplier balances" })}
        ${panel(12, "Purchase Reports", reportLinks(REPORTS.purchase))}
      </div>`;
    },
    accounts(d) {
      const k = d.kpis, c = d.counts;
      return kpis([
        { label: "Total Income", value: money(k.income), foot: per(), icon: "sales", color: "green", go: "books:/report/ProfitAndLoss" },
        { label: "Total Expenses", value: money(k.expense), chip: chip(k.expense_change, true), foot: per(), icon: "receipt", color: "red", go: "books:/report/ProfitAndLoss" },
        { label: "Gross Profit", value: money(k.gross_profit), chip: chip(k.gross_change), foot: k.gross_margin == null ? "—" : `${k.gross_margin}% margin`, icon: "trend", color: k.gross_profit < 0 ? "red" : "green", warn: k.gross_profit < 0, go: "books:/report/ProfitAndLoss" },
        { label: "Net Profit", value: money(k.net_profit), chip: chip(k.net_change), foot: per(), icon: "coins", color: k.net_profit < 0 ? "red" : "green", warn: k.net_profit < 0, go: "books:/report/ProfitAndLoss" },
        { label: "Cash Balance", value: money(k.cash), foot: "Cash accounts", icon: "coins", color: "green", go: "books:/report/GeneralLedger" },
        { label: "Bank Balance", value: money(k.bank), foot: "Bank accounts", icon: "bank", color: "blue", go: "books:/report/GeneralLedger" },
        { label: "Accounts Receivable", value: money(k.receivable), foot: plural(c.unpaid_sales, "invoice", "invoices"), icon: "inbox", color: "teal", go: "report:Accounts Receivable" },
        { label: "Accounts Payable", value: money(k.payable), foot: plural(c.unpaid_purchases, "bill", "bills"), icon: "outbox", color: "amber", go: "report:Accounts Payable" },
        { label: "Overdue Receivables", value: money(c.overdue_sales_amount), foot: plural(c.overdue_sales, "invoice", "invoices"), icon: "clock", color: "red", warn: c.overdue_sales > 0, go: "report:Accounts Receivable" },
        { label: "Overdue Payables", value: money(c.overdue_purchases_amount), foot: plural(c.overdue_purchases, "bill", "bills"), icon: "clock", color: "amber", warn: c.overdue_purchases > 0, go: "report:Accounts Payable" },
        { label: "Stock Valuation", value: money(k.stock_value), foot: "Inventory at cost", icon: "box", color: "violet", go: "books:/report/StockBalance" },
        { label: "Sales Returns", value: money(c.sales_returns), foot: per(), icon: "undo", color: "slate", go: L("Books Sales Invoice", { docstatus: 1, return_against: ["is", "set"] }) },
      ]) + `<div class="tk-grid">
        ${panel(6, "Revenue vs Expenses", barChart(T(d).labels, [{ name: "Revenue", color: "#16a34a", values: T(d).income }, { name: "Expenses", color: "#dc2626", values: T(d).expense }]), { sub: "Last 12 months", legend: legend([["Revenue", "#16a34a"], ["Expenses", "#dc2626"]]) })}
        ${panel(6, "Gross Profit Trend", lineChart(T(d).labels, [{ name: "Gross profit", color: "#16a34a", values: T(d).gross_profit }]), { sub: "Last 12 months" })}
        ${panel(8, "Financial Reports", reportLinks(REPORTS.accounts))}
        ${panel(4, "GST Reports (India)", reportLinks(REPORTS.gst))}
      </div>`;
    },
    customers(d) {
      const c = d.counts;
      const funnel = [
        { label: "Open / replied", value: c.leads_open, color: "#2563eb" },
        { label: "Interested / quoted", value: c.leads_interested, color: "#7c3aed" },
        { label: "Converted", value: c.leads_converted, color: "#16a34a" },
        { label: "Do not contact", value: c.leads_lost, color: "#dc2626" },
      ];
      return kpis([
        { label: "Customers", value: count(c.customers), foot: `${count(c.new_customers)} new ${per()}`, icon: "users", color: "blue", go: L("Books Party", { role: ["in", ["Customer", "Both"]] }) },
        { label: "Total Leads", value: count(c.leads), foot: `${count(c.new_leads)} new ${per()}`, icon: "star", color: "violet", go: L("Books Lead") },
        { label: "Leads to Follow Up", value: count(c.leads_open), foot: "Open or replied", icon: "clock", color: "amber", go: L("Books Lead", { status: ["in", ["Open", "Replied"]] }) },
        { label: "Converted Leads", value: count(c.leads_converted), foot: c.leads ? `${Math.round((c.leads_converted / c.leads) * 100)}% of leads` : "—", icon: "check", color: "green", go: L("Books Lead", { status: "Converted" }) },
      ]) + `<div class="tk-grid">
        ${panel(6, "Lead Pipeline", c.leads ? hbars(funnel, "#2563eb", count) : `<div class="tk-empty">No leads yet. <a class="tk-link" data-go="form:Books Lead">Add a lead →</a></div>`, { link: ["Leads", L("Books Lead")] })}
        ${panel(6, "Top 10 Customers", hbars(d.top_customers.map((r) => ({ label: r.label, value: r.amount, extra: plural(r.bills, "bill", "bills") })), "#2563eb"), { sub: per() })}
        ${panel(12, "Customer Reports", reportLinks(REPORTS.customers))}
      </div>`;
    },
    alerts(d) {
      const a = d.alerts;
      return sectionTitle("Business Alerts", "Click any card to see the records") + alertCards(d, false) + `<div class="tk-grid">
        ${panel(4, "Low Stock", miniList(a.low_stock.map((r) => ({ label: r.name, right: `<span class="tk-pill amber">${qty(r.qty)} left</span>`, go: `doc:Books Item|${r.name}` })), "No items running low."))}
        ${panel(4, "Out of Stock", miniList(a.out_of_stock.map((r) => ({ label: r.name, right: `<span class="tk-pill red">0</span>`, go: `doc:Books Item|${r.name}` })), "Everything is in stock."))}
        ${panel(4, "Expiring Batches", miniList(a.expiring_batches.map((r) => ({ label: r.name + " · " + r.item, right: `<span class="tk-pill red">${esc(String(r.expiry).slice(0, 10))}</span>` })), "No batches expiring soon."))}
      </div>`;
    },
  };

  // ---------- render ----------
  function render() {
    const d = state.data;
    if (!d) return;
    pending.length = 0;
    body.innerHTML = VIEWS[state.tab](d);
    pending.forEach(([id, fn]) => { const el = root.querySelector("#" + id); if (el) fn(el); });
    const active = alertDefs(d).filter((a) => num(a.n) > 0 && a.t !== "Leads to follow up").length;
    const badge = $("[data-alert-count]");
    badge.hidden = !active;
    badge.textContent = active;
  }

  function greet() {
    const h = new Date().getHours();
    const part = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const name = (frappe.boot && frappe.boot.user && frappe.boot.user.first_name) || (frappe.session && frappe.session.user_fullname) || "";
    $("[data-hello]").textContent = part + (name ? ", " + name.split(" ")[0] : "") + "!";
    $("[data-sub]").textContent = "Here's what's happening in the shop · " + new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  function load() {
    const btn = $("[data-refresh]");
    btn.classList.add("spin");
    frappe.call({
      method: "tokyo_dashboard",
      args: { period: state.period },
      callback: (r) => { state.data = r.message; render(); },
      error: () => { body.innerHTML = `<div class="tk-error">Couldn't load the dashboard. Check that the "Tokyo Dashboard API" server script is enabled.</div>`; },
      always: () => btn.classList.remove("spin"),
    });
  }

  // ---------- events ----------
  root.addEventListener("click", (e) => {
    const p = e.target.closest("[data-period]");
    if (p) {
      state.period = p.dataset.period;
      $$("[data-period]").forEach((b) => b.classList.toggle("on", b === p));
      return load();
    }
    const t = e.target.closest("[data-tab]");
    if (t) return switchTab(t.dataset.tab);
    if (e.target.closest("[data-refresh]")) return load();
    const g = e.target.closest("[data-go]");
    if (g) {
      const target = g.dataset.go;
      if (target.indexOf("tab:") === 0) return switchTab(target.slice(4));
      go(target);
    }
  });
  function switchTab(tab) {
    state.tab = tab;
    $$("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    render();
  }

  // tooltips for chart marks
  let tip;
  const hideTip = () => { if (tip) tip.style.display = "none"; };
  root.addEventListener("mousemove", (e) => {
    const m = e.target.closest && e.target.closest("[data-tip]");
    if (!m) return hideTip();
    if (!tip) {
      tip = document.createElement("div");
      tip.style.cssText = "position:fixed;z-index:9999;pointer-events:none;background:#111827;color:#fff;font-size:11.5px;padding:6px 9px;border-radius:8px;box-shadow:0 6px 20px rgba(0,0,0,.2);white-space:nowrap;font-family:inherit";
      document.body.appendChild(tip);
    }
    tip.textContent = m.getAttribute("data-tip");
    tip.style.display = "block";
    tip.style.left = e.clientX + 12 + "px";
    tip.style.top = e.clientY - 30 + "px";
  });
  window.addEventListener("scroll", hideTip, { passive: true });

  let resizeTimer;
  window.addEventListener("resize", () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(render, 200); });

  greet();
  load();
})();
