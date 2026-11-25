// Tokyo workspace menu: quick tiles + grouped links, with search.
(function () {
  const root = root_element;
  const box = root.querySelector("[data-menu]");
  const C = {
    orange: ["#f26b1d", "rgba(242,107,29,.1)"], blue: ["#2563eb", "rgba(37,99,235,.09)"], green: ["#16a34a", "rgba(22,163,74,.1)"],
    violet: ["#7c3aed", "rgba(124,58,237,.09)"], teal: ["#0d9488", "rgba(13,148,136,.1)"], amber: ["#d97706", "rgba(217,119,6,.1)"],
    red: ["#dc2626", "rgba(220,38,38,.09)"], slate: ["#475569", "rgba(71,85,105,.1)"], pink: ["#db2777", "rgba(219,39,119,.09)"],
  };
  const I = {
    pos: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10M12 16v4"/>',
    sales: '<path d="M3 3v18h18"/><path d="m7 15 4-4 3 3 6-6"/>',
    cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.6 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.5L22 8H6"/>',
    box: '<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5"/><path d="M12 13v8"/>',
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.1 10.4A6 6 0 1 1 10.3 18"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    chart: '<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>',
    file: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/>',
    receipt: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
    barcode: '<path d="M4 5v14M8 5v14M11 5v14M15 5v14M18 5v14M21 5v14"/>',
    move: '<path d="M7 7h13l-4-4M17 17H4l4 4"/>',
    layers: '<path d="m12 2 10 5-10 5L2 7z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>',
    percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    bank: '<path d="M3 21h18"/><path d="M5 21V10M19 21V10M9 21V10M15 21V10"/><path d="m12 3 9 6H3z"/>',
  };
  const svg = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // link targets: l: list, s: single settings form, r: report, n: new form, u: url
  const QUICK = [
    ["Open POS", "Sell at the counter", "pos", "orange", "u:/books/pos"],
    ["New Sale", "Create a sales invoice", "sales", "orange", "n:Books Sales Invoice"],
    ["New Purchase", "Record a supplier bill", "cart", "blue", "n:Books Purchase Invoice"],
    ["Receive / Pay", "Record a payment", "coins", "green", "n:Books Payment"],
    ["Add Product", "With colours & sizes", "layers", "violet", "n:Product"],
    ["Print Barcodes", "Labels for items", "barcode", "slate", "l:Barcode Print"],
  ];
  const GROUPS = [
    ["Sales", "sales", "orange", [["Sales Invoices", "l:Books Sales Invoice"], ["Sales Quotes", "l:Books Sales Quote"], ["Shipments (Delivery)", "l:Books Shipment"], ["Payments", "l:Books Payment"], ["Customers", "l:Books Party"]]],
    ["Purchase", "cart", "blue", [["Purchase Invoices", "l:Books Purchase Invoice"], ["Purchase Receipts", "l:Books Purchase Receipt"], ["Payments", "l:Books Payment"], ["Suppliers", "l:Books Party"]]],
    ["Stock & Inventory", "box", "violet", [["Products (with variants)", "l:Product"], ["Items", "l:Books Item"], ["Item Groups", "l:Books Item Group"], ["Stock Movements", "l:Books Stock Movement"], ["Locations (Warehouses)", "l:Books Location"], ["Batches", "l:Books Batch"], ["Serial Numbers", "l:Books Serial Number"], ["Barcode Print", "l:Barcode Print"], ["Units of Measure", "l:Books Uom"]]],
    ["Accounts & Finance", "bank", "green", [["Chart of Accounts", "l:Books Account"], ["Journal Entries", "l:Books Journal Entry"], ["Payments", "l:Books Payment"], ["Ledger Entries", "l:Books Ledger Entry"], ["Tax Templates", "l:Books Tax"], ["Payment Methods", "l:Books Payment Method"]]],
    ["Customers & CRM", "users", "teal", [["Leads", "l:Books Lead"], ["Customers & Suppliers", "l:Books Party"], ["Addresses", "l:Books Address"], ["Item Enquiries", "l:Books Item Enquiry"], ["Loyalty Programs", "l:Books Loyalty Program"], ["Loyalty Points", "l:Books Loyalty Point Entry"]]],
    ["Point of Sale", "pos", "orange", [["Open POS", "u:/books/pos"], ["POS Profiles", "l:Books Pos Profile"], ["Opening Shifts", "l:Books Pos Opening Shift"], ["Closing Shifts", "l:Books Pos Closing Shift"], ["POS Settings", "s:Books Pos Settings"]]],
    ["Pricing & Offers", "percent", "pink", [["Price Lists", "l:Books Price List"], ["Pricing Rules", "l:Books Pricing Rule"], ["Coupon Codes", "l:Books Coupon Code"]]],
    ["Setup", "gear", "slate", [["Number Series", "l:Books Number Series"], ["Accounting Settings", "s:Books Accounting Settings"], ["Inventory Settings", "s:Books Inventory Settings"], ["Print Settings", "s:Books Print Settings"], ["Defaults", "s:Books Defaults"], ["System Settings", "s:Books System Settings"]]],
  ];
  const REPORTS = [
    ["Sales Reports", "chart", "orange", [["Sales Register", "r:Sales Register"], ["Daily Sales Summary", "r:Daily Sales Summary"], ["Item-wise Sales", "r:Item-wise Sales"], ["Product & Variant Sales", "r:Product Variant Sales"], ["Customer-wise Sales", "r:Customer-wise Sales"], ["Gross Profit by Item", "r:Gross Profit by Item"], ["Sales Quote Status", "r:Sales Quote Status"]]],
    ["Purchase Reports", "receipt", "blue", [["Purchase Register", "r:Purchase Register"], ["Supplier-wise Purchase", "r:Supplier-wise Purchase"], ["Item-wise Purchase History", "r:Item-wise Purchase History"], ["Accounts Payable", "r:Accounts Payable"]]],
    ["Stock Reports", "box", "violet", [["Stock Balance", "r:Books Stock Balance"], ["Stock Ledger", "r:Books Stock Ledger"], ["Variant Stock Matrix", "r:Variant Stock Matrix"], ["Low & Out of Stock", "r:Low and Out of Stock"], ["Batch-wise Stock", "r:Batch-wise Stock"], ["Slow Moving Items", "r:Slow Moving Items"]]],
    ["Financial Statements", "bank", "green", [["Profit and Loss", "r:Books Profit and Loss"], ["Balance Sheet", "r:Books Balance Sheet"], ["Trial Balance", "r:Books Trial Balance"], ["General Ledger", "r:Books General Ledger"], ["Accounts Receivable", "r:Accounts Receivable"], ["Accounts Payable", "r:Accounts Payable"], ["Payments Register", "r:Payments Register"]]],
    ["GST (India)", "file", "red", [["GSTR-1 (Sales)", "r:Books GSTR-1"], ["GSTR-2 (Purchases)", "r:Books GSTR-2"], ["HSN/SAC Summary", "r:HSN-wise Sales Summary"], ["GST Tax Summary", "r:GST Tax Summary"]]],
    ["Customer Reports", "users", "teal", [["Customer-wise Sales", "r:Customer-wise Sales"], ["Lead Status", "r:Lead Status"], ["Accounts Receivable", "r:Accounts Receivable"]]],
  ];

  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>';
  const card = ([title, ic, col, links], kind) => {
    const [c, cs] = C[col];
    return `<div class="tm-card" data-card style="--c:${c};--cs:${cs}">
      <div class="tm-card-head"><span class="tm-ic">${svg(ic)}</span><b>${esc(title)}</b><span class="tm-n">${links.length}</span></div>
      ${links.map(([n, t]) => `<a class="tm-link" data-go="${esc(t)}" data-text="${esc((n + " " + title).toLowerCase())}"><i></i>${esc(n)}${t[0] === "s" ? "<em>settings</em>" : ""}${arrow}</a>`).join("")}
    </div>`;
  };
  box.innerHTML = `
    <div class="tm-quick" data-quick>${QUICK.map(([n, d, ic, col, t]) => { const [c, cs] = C[col]; return `<a class="tm-q" data-go="${esc(t)}" style="--c:${c};--cs:${cs}"><span class="tm-ic">${svg(ic)}</span><b>${esc(n)}</b><small>${esc(d)}</small></a>`; }).join("")}</div>
    <div class="tm-sec" data-sec><h3>Work</h3><span>Documents and records</span></div>
    <div class="tm-grid" data-grid>${GROUPS.map((g) => card(g)).join("")}</div>
    <div class="tm-sec" data-sec><h3>Reports</h3><span>Registers, stock, accounts and GST</span></div>
    <div class="tm-grid" data-grid>${REPORTS.map((g) => card(g)).join("")}</div>
    <div class="tm-empty tm-hide" data-none>Nothing matches that search.</div>`;

  function go(t) {
    const k = t[0], v = t.slice(2);
    if (k === "u") return (window.location.href = v);
    if (k === "n") return frappe.new_doc(v);
    if (k === "l") return frappe.set_route("List", v);
    if (k === "s") return frappe.set_route("Form", v);
    if (k === "r") return frappe.set_route("query-report", v);
  }
  root.addEventListener("click", (e) => { const a = e.target.closest("[data-go]"); if (a) go(a.dataset.go); });

  const q = root.querySelector("[data-q]");
  q.addEventListener("input", () => {
    const s = q.value.trim().toLowerCase();
    let any = false;
    root.querySelectorAll("[data-card]").forEach((cd) => {
      let n = 0;
      cd.querySelectorAll(".tm-link").forEach((l) => { const hit = !s || l.dataset.text.indexOf(s) > -1; l.classList.toggle("tm-hide", !hit); if (hit) n++; });
      cd.classList.toggle("tm-hide", !n); if (n) any = true;
    });
    root.querySelector("[data-quick]").classList.toggle("tm-hide", !!s);
    root.querySelectorAll("[data-sec]").forEach((x) => x.classList.toggle("tm-hide", !!s));
    root.querySelector("[data-none]").classList.toggle("tm-hide", any);
  });
  q.addEventListener("keydown", (e) => { if (e.key === "Enter") { const first = root.querySelector(".tm-link:not(.tm-hide)"); if (first) go(first.dataset.go); } });
})();
