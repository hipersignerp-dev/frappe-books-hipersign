import json, random, string
rid = lambda: "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
random.seed(7)

shortcuts = [
  # label, type, link_to, url, color
  ("Open POS", "URL", None, "/books/pos", "Orange"),
  ("Sales Invoices", "DocType", "Books Sales Invoice", None, "Orange"),
  ("Purchase Invoices", "DocType", "Books Purchase Invoice", None, "Blue"),
  ("Payments", "DocType", "Books Payment", None, "Green"),
  ("Products", "DocType", "Product", None, "Purple"),
  ("Items", "DocType", "Books Item", None, "Purple"),
  ("Stock Entries", "DocType", "Books Stock Movement", None, "Cyan"),
  ("Print Barcodes", "DocType", "Barcode Print", None, "Grey"),
  ("Customers & Suppliers", "DocType", "Books Party", None, "Blue"),
  ("Sales Register", "Report", "Sales Register", None, "Orange"),
  ("Stock Balance", "Report", "Books Stock Balance", None, "Cyan"),
  ("Profit and Loss", "Report", "Books Profit and Loss", None, "Green"),
]
REF = {"Books Stock Balance": "Books Stock Ledger Entry", "Books Profit and Loss": "Books Ledger Entry", "Sales Register": "Books Sales Invoice"}

D = lambda label, dt: ("DocType", label, dt, None)
R = lambda label, rep, ref: ("Report", label, rep, ref)
cards = {
  "Sales": [D("Sales Invoice", "Books Sales Invoice"), D("Sales Quote", "Books Sales Quote"), D("Shipment (Delivery)", "Books Shipment"), D("Payment", "Books Payment"), D("Customer", "Books Party")],
  "Purchase": [D("Purchase Invoice", "Books Purchase Invoice"), D("Purchase Receipt", "Books Purchase Receipt"), D("Payment", "Books Payment"), D("Supplier", "Books Party")],
  "Stock & Inventory": [D("Product (with variants)", "Product"), D("Item", "Books Item"), D("Item Group", "Books Item Group"), D("Stock Movement", "Books Stock Movement"), D("Location (Warehouse)", "Books Location"), D("Batch", "Books Batch"), D("Serial Number", "Books Serial Number"), D("Barcode Print", "Barcode Print"), D("Unit of Measure", "Books Uom")],
  "Accounts & Finance": [D("Chart of Accounts", "Books Account"), D("Journal Entry", "Books Journal Entry"), D("Payment", "Books Payment"), D("Ledger Entry", "Books Ledger Entry"), D("Tax Template", "Books Tax"), D("Payment Method", "Books Payment Method")],
  "Customers & CRM": [D("Lead", "Books Lead"), D("Customer / Supplier", "Books Party"), D("Address", "Books Address"), D("Item Enquiry", "Books Item Enquiry"), D("Loyalty Program", "Books Loyalty Program"), D("Loyalty Points", "Books Loyalty Point Entry")],
  "Point of Sale": [D("POS Profile", "Books Pos Profile"), D("Opening Shift", "Books Pos Opening Shift"), D("Closing Shift", "Books Pos Closing Shift"), D("POS Settings", "Books Pos Settings")],
  "Pricing & Offers": [D("Price List", "Books Price List"), D("Pricing Rule", "Books Pricing Rule"), D("Coupon Code", "Books Coupon Code")],
  "Sales Reports": [R("Sales Register", "Sales Register", "Books Sales Invoice"), R("Daily Sales Summary", "Daily Sales Summary", "Books Sales Invoice"), R("Item-wise Sales", "Item-wise Sales", "Books Sales Invoice"), R("Product & Variant Sales", "Product Variant Sales", "Books Sales Invoice"), R("Customer-wise Sales", "Customer-wise Sales", "Books Sales Invoice"), R("Gross Profit by Item", "Gross Profit by Item", "Books Sales Invoice"), R("Sales Quote Status", "Sales Quote Status", "Books Sales Quote")],
  "Purchase Reports": [R("Purchase Register", "Purchase Register", "Books Purchase Invoice"), R("Supplier-wise Purchase", "Supplier-wise Purchase", "Books Purchase Invoice"), R("Item-wise Purchase History", "Item-wise Purchase History", "Books Purchase Invoice")],
  "Stock Reports": [R("Stock Balance", "Books Stock Balance", "Books Stock Ledger Entry"), R("Stock Ledger", "Books Stock Ledger", "Books Stock Ledger Entry"), R("Variant Stock Matrix", "Variant Stock Matrix", "Books Item"), R("Low & Out of Stock", "Low and Out of Stock", "Books Item"), R("Batch-wise Stock", "Batch-wise Stock", "Books Batch"), R("Slow Moving Items", "Slow Moving Items", "Books Item")],
  "Financial Statements": [R("Profit and Loss", "Books Profit and Loss", "Books Ledger Entry"), R("Balance Sheet", "Books Balance Sheet", "Books Ledger Entry"), R("Trial Balance", "Books Trial Balance", "Books Ledger Entry"), R("General Ledger", "Books General Ledger", "Books Ledger Entry"), R("Accounts Receivable", "Accounts Receivable", "Books Sales Invoice"), R("Accounts Payable", "Accounts Payable", "Books Purchase Invoice"), R("Payments Register", "Payments Register", "Books Payment")],
  "GST (India)": [R("GSTR-1 (Sales)", "Books GSTR-1", "Books Sales Invoice"), R("GSTR-2 (Purchases)", "Books GSTR-2", "Books Purchase Invoice"), R("HSN/SAC Summary", "HSN-wise Sales Summary", "Books Sales Invoice"), R("GST Tax Summary", "GST Tax Summary", "Books Sales Invoice")],
  "Customer Reports": [R("Customer-wise Sales", "Customer-wise Sales", "Books Sales Invoice"), R("Lead Status", "Lead Status", "Books Lead"), R("Accounts Receivable", "Accounts Receivable", "Books Sales Invoice")],
  "Setup": [D("Number Series", "Books Number Series"), D("Accounting Settings", "Books Accounting Settings"), D("Inventory Settings", "Books Inventory Settings"), D("Print Settings", "Books Print Settings"), D("Defaults", "Books Defaults"), D("System Settings", "Books System Settings")],
}

content = []
def block(t, data): content.append({"id": rid(), "type": t, "data": data})
def header(text): block("header", {"text": f'<span class="h4"><b>{text}</b></span>', "col": 12})
block("custom_block", {"custom_block_name": "Tokyo Business Dashboard", "col": 12})
block("spacer", {"col": 12})
header("Quick Access")
for s in shortcuts: block("shortcut", {"shortcut_name": s[0], "col": 3})
block("spacer", {"col": 12})
header("Sales, Purchase &amp; Stock")
for c in ["Sales", "Purchase", "Stock & Inventory"]: block("card", {"card_name": c, "col": 4})
header("Money &amp; Customers")
for c in ["Accounts & Finance", "Customers & CRM", "Point of Sale", "Pricing & Offers"]: block("card", {"card_name": c, "col": 3 if c != "Accounts & Finance" else 3})
block("spacer", {"col": 12})
header("Reports")
for c in ["Sales Reports", "Purchase Reports", "Stock Reports"]: block("card", {"card_name": c, "col": 4})
for c in ["Financial Statements", "GST (India)", "Customer Reports"]: block("card", {"card_name": c, "col": 4})
block("spacer", {"col": 12})
header("Setup")
block("card", {"card_name": "Setup", "col": 4})

links = []
for card, items in cards.items():
    links.append({"type": "Card Break", "label": card, "link_count": len(items)})
    for kind, label, to, ref in items:
        l = {"type": "Link", "label": label, "link_type": kind, "link_to": to, "onboard": 0}
        if kind == "Report":
            l["is_query_report"] = 1
            l["report_ref_doctype"] = ref
        links.append(l)

sc = []
for label, t, to, url, color in shortcuts:
    d = {"label": label, "type": t, "color": color}
    if t == "URL": d["url"] = url
    else: d["link_to"] = to
    if t == "DocType": d["doc_view"] = "List"
    if t == "Report": d["report_ref_doctype"] = REF[to]
    sc.append(d)

payload = {
  "label": "Tokyo", "title": "Tokyo", "icon": "dashboard", "indicator_color": "orange",
  "content": json.dumps(content, separators=(",", ":")),
  "custom_blocks": [{"custom_block_name": "Tokyo Business Dashboard", "label": "Tokyo Business Dashboard"}],
  "shortcuts": sc, "links": links,
}
json.dump(payload, open("ws.json", "w"), ensure_ascii=False)
print(len(json.dumps(payload)))
