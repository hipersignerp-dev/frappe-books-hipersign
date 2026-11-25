# GET /api/method/tokyo_dashboard?period=month
# Everything the Tokyo workspace dashboard shows, in one call.
# period: today | week | month | quarter | year  (KPIs, tops, mix use it; trends are always 12 months)

LOW_STOCK_AT = 3          # an item with this many or fewer left is "low stock"
OVERDUE_AFTER_DAYS = 30   # Books has no due date: unpaid after this many days counts as overdue
EXPIRY_WINDOW_DAYS = 30   # batches expiring within this many days

U = frappe.utils
today = U.getdate(U.today())
# The same script runs as the API and, for testing, on save of a Tokyo Debug doc.
try:
    period = doc.period
    debug = True
except Exception:
    period = frappe.form_dict.get("period")
    debug = False
period = (period or "month").lower()

if period == "today":
    p_from = today
elif period == "week":
    p_from = U.getdate(U.get_first_day_of_week(today))
elif period == "quarter":
    p_from = U.getdate(U.get_quarter_start(today))
elif period == "year":
    p_from = U.getdate(U.get_year_start(today))
else:
    period = "month"
    p_from = U.getdate(U.get_first_day(today))
p_to = today

# the same length of time just before, for the change arrows
span = U.date_diff(p_to, p_from) + 1
prev_to = U.add_days(p_from, -1)
prev_from = U.add_days(p_from, -span)
if period == "month":
    prev_from = U.getdate(U.get_first_day(U.add_months(today, -1)))
    prev_to = U.add_days(prev_from, U.date_diff(today, p_from))

def one(sql, params=None, frappe=frappe):
    rows = frappe.db.sql(sql, params or {})
    if not rows or rows[0][0] is None:
        return 0
    return rows[0][0]

def rows(sql, params=None, frappe=frappe):
    return frappe.db.sql(sql, params or {}, as_dict=True)

R = {"from": p_from, "to": p_to}
P = {"from": prev_from, "to": prev_to}

def sales_total(rng, U=U, one=one):
    return U.flt(one("select sum(grand_total) from `tabBooks Sales Invoice` where docstatus = 1 and date(`date`) between %(from)s and %(to)s", rng))

def purchase_total(rng, U=U, one=one):
    return U.flt(one("select sum(grand_total) from `tabBooks Purchase Invoice` where docstatus = 1 and date(`date`) between %(from)s and %(to)s", rng))

def ledger(rng, cond, sign, U=U, one=one):
    # sign "cr" = credit - debit, "dr" = debit - credit
    expr = "sum(le.credit - le.debit)" if sign == "cr" else "sum(le.debit - le.credit)"
    sql = "select " + expr + " from `tabBooks Ledger Entry` le join `tabBooks Account` a on a.name = le.account where " + cond
    if rng:
        sql += " and le.posting_date between %(from)s and %(to)s"
    return U.flt(one(sql, rng or {}))

def pl(rng, ledger=ledger):
    income = ledger(rng, "a.root_type = 'Income'", "cr")
    expense = ledger(rng, "a.root_type = 'Expense'", "dr")
    cogs = ledger(rng, "a.account_type = 'Cost of Goods Sold'", "dr")
    return {"income": income, "expense": expense, "cogs": cogs, "gross": income - cogs, "net": income - expense}

now_pl = pl(R)
prev_pl = pl(P)

def change(cur, prev):
    if not prev:
        return None
    return round((cur - prev) / abs(prev) * 100, 1)

sales = sales_total(R)
prev_sales = sales_total(P)
purchases = purchase_total(R)
prev_purchases = purchase_total(P)
receivable = U.flt(one("select sum(outstanding_amount) from `tabBooks Sales Invoice` where docstatus = 1"))
payable = U.flt(one("select sum(outstanding_amount) from `tabBooks Purchase Invoice` where docstatus = 1"))
cash = ledger(None, "a.account_type = 'Cash'", "dr")
bank = ledger(None, "a.account_type = 'Bank'", "dr")
stock_value = U.flt(one("select sum(value_change) from `tabBooks Stock Ledger Entry`"))
stock_qty = U.flt(one("select sum(quantity) from `tabBooks Stock Ledger Entry`"))
overdue_cut = U.add_days(today, -OVERDUE_AFTER_DAYS)

# ---- stock per item ----
qty_rows = rows("""select i.name, i.item_code, ifnull(sum(sle.quantity), 0) as qty
    from `tabBooks Item` i
    left join `tabBooks Stock Ledger Entry` sle on sle.item = i.name
    where i.track_item = 1 and i.item_type = 'Product'
    group by i.name, i.item_code""")
low = []
out = []
for r in qty_rows:
    q = U.flt(r["qty"])
    r["qty"] = q
    if q <= 0:
        out.append(r)
    elif q <= LOW_STOCK_AT:
        low.append(r)
low.sort(key=lambda r: r["qty"])

batch_rows = rows("""select b.name, b.item, b.expiry_date, sum(sle.quantity) as qty
    from `tabBooks Batch` b join `tabBooks Stock Ledger Entry` sle on sle.batch = b.name
    where b.expiry_date is not null and b.expiry_date <= %(until)s
    group by b.name, b.item, b.expiry_date having sum(sle.quantity) > 0
    order by b.expiry_date""", {"until": U.add_days(today, EXPIRY_WINDOW_DAYS)})

# ---- counts ----
counts = {
    "sales_invoices": one("select count(*) from `tabBooks Sales Invoice` where docstatus = 1 and date(`date`) between %(from)s and %(to)s", R),
    "purchase_invoices": one("select count(*) from `tabBooks Purchase Invoice` where docstatus = 1 and date(`date`) between %(from)s and %(to)s", R),
    "sales_today": U.flt(one("select sum(grand_total) from `tabBooks Sales Invoice` where docstatus = 1 and date(`date`) = %(d)s", {"d": today})),
    "bills_today": one("select count(*) from `tabBooks Sales Invoice` where docstatus = 1 and date(`date`) = %(d)s", {"d": today}),
    "sales_returns": U.flt(one("select -sum(grand_total) from `tabBooks Sales Invoice` where docstatus = 1 and ifnull(return_against, '') != '' and date(`date`) between %(from)s and %(to)s", R)),
    "purchase_returns": U.flt(one("select -sum(grand_total) from `tabBooks Purchase Invoice` where docstatus = 1 and ifnull(return_against, '') != '' and date(`date`) between %(from)s and %(to)s", R)),
    "unpaid_sales": one("select count(*) from `tabBooks Sales Invoice` where docstatus = 1 and outstanding_amount > 0"),
    "unpaid_purchases": one("select count(*) from `tabBooks Purchase Invoice` where docstatus = 1 and outstanding_amount > 0"),
    "overdue_sales": one("select count(*) from `tabBooks Sales Invoice` where docstatus = 1 and outstanding_amount > 0 and date(`date`) < %(d)s", {"d": overdue_cut}),
    "overdue_sales_amount": U.flt(one("select sum(outstanding_amount) from `tabBooks Sales Invoice` where docstatus = 1 and outstanding_amount > 0 and date(`date`) < %(d)s", {"d": overdue_cut})),
    "overdue_purchases": one("select count(*) from `tabBooks Purchase Invoice` where docstatus = 1 and outstanding_amount > 0 and date(`date`) < %(d)s", {"d": overdue_cut}),
    "overdue_purchases_amount": U.flt(one("select sum(outstanding_amount) from `tabBooks Purchase Invoice` where docstatus = 1 and outstanding_amount > 0 and date(`date`) < %(d)s", {"d": overdue_cut})),
    "pending_shipments": one("select count(*) from `tabBooks Sales Invoice` where docstatus = 1 and stock_not_transferred > 0"),
    "pending_receipts": one("select count(*) from `tabBooks Purchase Invoice` where docstatus = 1 and stock_not_transferred > 0"),
    "draft_sales": one("select count(*) from `tabBooks Sales Invoice` where docstatus = 0"),
    "draft_purchases": one("select count(*) from `tabBooks Purchase Invoice` where docstatus = 0"),
    "draft_stock": one("select count(*) from `tabBooks Stock Movement` where docstatus = 0"),
    "quotes": one("select count(*) from `tabBooks Sales Quote` where docstatus = 1 and date(`date`) between %(from)s and %(to)s", R),
    "open_quotes": one("""select count(*) from `tabBooks Sales Quote` q where q.docstatus = 1
        and not exists (select 1 from `tabBooks Sales Invoice` s where s.quote = q.name and s.docstatus < 2)"""),
    "old_quotes": one("""select count(*) from `tabBooks Sales Quote` q where q.docstatus = 1 and date(q.`date`) < %(d)s
        and not exists (select 1 from `tabBooks Sales Invoice` s where s.quote = q.name and s.docstatus < 2)""", {"d": overdue_cut}),
    "customers": one("select count(*) from `tabBooks Party` where role in ('Customer', 'Both')"),
    "suppliers": one("select count(*) from `tabBooks Party` where role in ('Supplier', 'Both')"),
    "new_customers": one("select count(*) from `tabBooks Party` where role in ('Customer', 'Both') and date(creation) between %(from)s and %(to)s", R),
    "items": one("select count(*) from `tabBooks Item`"),
    "products": one("select count(*) from `tabProduct`"),
    "low_stock": len(low),
    "out_of_stock": len(out),
    "expiring_batches": len(batch_rows),
    "leads": one("select count(*) from `tabBooks Lead`"),
    "new_leads": one("select count(*) from `tabBooks Lead` where date(creation) between %(from)s and %(to)s", R),
    "leads_open": one("select count(*) from `tabBooks Lead` where status in ('Open', 'Replied')"),
    "leads_interested": one("select count(*) from `tabBooks Lead` where status in ('Interested', 'Opportunity', 'Quotation')"),
    "leads_converted": one("select count(*) from `tabBooks Lead` where status = 'Converted'"),
    "leads_lost": one("select count(*) from `tabBooks Lead` where status = 'Do not Contact'"),
    "payments": U.flt(one("select sum(amount) from `tabBooks Payment` where docstatus = 1 and payment_type = 'Receive' and date(`date`) between %(from)s and %(to)s", R)),
}
counts["pending_approvals"] = counts["draft_sales"] + counts["draft_purchases"] + counts["draft_stock"]

kpis = {
    "sales": sales, "sales_change": change(sales, prev_sales),
    "purchases": purchases, "purchases_change": change(purchases, prev_purchases),
    "receivable": receivable, "payable": payable,
    "income": now_pl["income"], "expense": now_pl["expense"],
    "expense_change": change(now_pl["expense"], prev_pl["expense"]),
    "gross_profit": now_pl["gross"], "gross_change": change(now_pl["gross"], prev_pl["gross"]),
    "net_profit": now_pl["net"], "net_change": change(now_pl["net"], prev_pl["net"]),
    "gross_margin": round(now_pl["gross"] / now_pl["income"] * 100, 1) if now_pl["income"] else None,
    "cash": cash, "bank": bank, "cash_bank": cash + bank,
    "stock_value": stock_value, "stock_qty": stock_qty,
}

# ---- 12-month trends ----
months = []
start = U.getdate(U.get_first_day(U.add_months(today, -11)))
for i in range(12):
    m = U.add_months(start, i)
    months.append(str(U.getdate(m))[:7])
T = {"from": start, "to": today}

def by_month(sql, params, frappe=frappe, U=U, months=months):
    found = {}
    for r in frappe.db.sql(sql, params, as_dict=True):
        found[r["m"]] = U.flt(r["v"])
    return [found.get(m, 0) for m in months]

s_month = by_month("select date_format(`date`, '%%Y-%%m') as m, sum(grand_total) as v from `tabBooks Sales Invoice` where docstatus = 1 and date(`date`) between %(from)s and %(to)s group by m", T)
p_month = by_month("select date_format(`date`, '%%Y-%%m') as m, sum(grand_total) as v from `tabBooks Purchase Invoice` where docstatus = 1 and date(`date`) between %(from)s and %(to)s group by m", T)
inc_month = by_month("select date_format(le.posting_date, '%%Y-%%m') as m, sum(le.credit - le.debit) as v from `tabBooks Ledger Entry` le join `tabBooks Account` a on a.name = le.account where a.root_type = 'Income' and le.posting_date between %(from)s and %(to)s group by m", T)
exp_month = by_month("select date_format(le.posting_date, '%%Y-%%m') as m, sum(le.debit - le.credit) as v from `tabBooks Ledger Entry` le join `tabBooks Account` a on a.name = le.account where a.root_type = 'Expense' and le.posting_date between %(from)s and %(to)s group by m", T)
cogs_month = by_month("select date_format(le.posting_date, '%%Y-%%m') as m, sum(le.debit - le.credit) as v from `tabBooks Ledger Entry` le join `tabBooks Account` a on a.name = le.account where a.account_type = 'Cost of Goods Sold' and le.posting_date between %(from)s and %(to)s group by m", T)

MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
labels = []
for m in months:
    labels.append(MONTH_NAMES[int(m[5:7]) - 1] + " " + m[2:4])
gp_month = []
for i in range(12):
    gp_month.append(inc_month[i] - cogs_month[i])
trends = {
    "labels": labels,
    "sales": s_month,
    "purchases": p_month,
    "income": inc_month,
    "expense": exp_month,
    "gross_profit": gp_month,
}

# ---- tops and mix for the period ----
top_items = rows("""select coalesce(nullif(i.product, ''), sii.item) as label, sum(sii.quantity) as qty, sum(sii.amount) as amount
    from `tabBooks Sales Invoice Item` sii
    join `tabBooks Sales Invoice` si on si.name = sii.parent
    left join `tabBooks Item` i on i.name = sii.item
    where si.docstatus = 1 and date(si.`date`) between %(from)s and %(to)s
    group by label order by amount desc limit 10""", R)
top_customers = rows("""select party as label, count(*) as bills, sum(grand_total) as amount
    from `tabBooks Sales Invoice` where docstatus = 1 and date(`date`) between %(from)s and %(to)s
    group by party order by amount desc limit 10""", R)
by_group = rows("""select coalesce(nullif(i.item_group, ''), 'Ungrouped') as label, sum(sii.amount) as amount
    from `tabBooks Sales Invoice Item` sii
    join `tabBooks Sales Invoice` si on si.name = sii.parent
    left join `tabBooks Item` i on i.name = sii.item
    where si.docstatus = 1 and date(si.`date`) between %(from)s and %(to)s
    group by label order by amount desc limit 8""", R)
by_channel = rows("""select if(is_pos = 1, 'POS counter', 'Invoices') as label, sum(grand_total) as amount, count(*) as bills
    from `tabBooks Sales Invoice` where docstatus = 1 and date(`date`) between %(from)s and %(to)s
    group by label""", R)

recent = rows("""select name, party, `date`, grand_total, outstanding_amount, status, docstatus, is_pos
    from `tabBooks Sales Invoice` order by `date` desc, creation desc limit 8""")

alerts = {"low_stock": [], "out_of_stock": [], "expiring_batches": []}
for r in low[:8]:
    alerts["low_stock"].append({"name": r["name"], "qty": r["qty"]})
for r in out[:8]:
    alerts["out_of_stock"].append({"name": r["name"]})
for r in batch_rows[:8]:
    alerts["expiring_batches"].append({"name": r["name"], "item": r["item"], "expiry": r["expiry_date"], "qty": U.flt(r["qty"])})

msg = {
    "period": period, "from": p_from, "to": p_to,
    "settings": {"low_stock_at": LOW_STOCK_AT, "overdue_after_days": OVERDUE_AFTER_DAYS, "expiry_window_days": EXPIRY_WINDOW_DAYS},
    "currency": frappe.db.get_default("currency") or "INR",
    "kpis": kpis, "counts": counts, "trends": trends,
    "top_items": top_items, "top_customers": top_customers,
    "by_group": by_group, "by_channel": by_channel,
    "recent": recent, "alerts": alerts,
}

if debug:
    doc.output = str(msg)
else:
    frappe.response["message"] = msg
