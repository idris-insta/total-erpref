"""
routes/finance.py — Finance Depth (D).

Deterministic analytics over existing accounts data:
  - 13-week cash-flow forecast
  - profit per SKU / per customer
  - credit-risk score
  - bank reconciliation (CSV import + auto-match)

Mounted at /api/finance.
"""
from fastapi import APIRouter, Depends, Body
from datetime import datetime, timezone, timedelta
import uuid
import re

from server import db, get_current_user

router = APIRouter()


def _num(v):
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def _parse_date(v):
    if isinstance(v, datetime):
        return v
    if isinstance(v, str):
        try:
            return datetime.fromisoformat(v.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _outstanding(inv):
    bal = _num(inv.get("balance_amount"))
    if bal:
        return bal
    return _num(inv.get("grand_total") or inv.get("total_amount")) - _num(inv.get("paid_amount"))


# ── 13-week cash-flow forecast ───────────────────────────────────────────────
@router.get("/cashflow-forecast")
async def cashflow_forecast(weeks: int = 13, current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    week_start = now - timedelta(days=now.weekday())
    buckets = [{"week": (week_start + timedelta(weeks=i)).date().isoformat(),
                "inflow": 0.0, "outflow": 0.0} for i in range(weeks)]

    def bucket_index(d):
        if not d:
            return None
        delta = (d.date() - week_start.date()).days
        idx = delta // 7
        return idx if 0 <= idx < weeks else None

    invoices = await db.invoices.find({}).to_list(100000)
    for inv in invoices:
        out = _outstanding(inv)
        if out <= 0:
            continue
        idx = bucket_index(_parse_date(inv.get("due_date")) or now)
        if idx is not None:
            buckets[idx]["inflow"] += out

    pos = await db.purchase_orders.find({}).to_list(100000)
    for po in pos:
        if str(po.get("status") or "").lower() in ("cancelled", "paid"):
            continue
        amt = _num(po.get("grand_total") or po.get("total_amount"))
        if amt <= 0:
            continue
        due = _parse_date(po.get("created_at")) or now
        idx = bucket_index(due + timedelta(days=30))
        if idx is not None:
            buckets[idx]["outflow"] += amt

    # rough payroll: monthly salary spread weekly
    employees = await db.employees.find({"is_active": True}).to_list(100000)
    monthly_payroll = sum(_num(e.get("basic_salary")) + _num(e.get("hra")) for e in employees)
    weekly_payroll = monthly_payroll / 4.0
    for b in buckets:
        b["outflow"] += weekly_payroll

    opening = 0.0
    balance = opening
    for b in buckets:
        b["inflow"] = round(b["inflow"], 2)
        b["outflow"] = round(b["outflow"], 2)
        b["net"] = round(b["inflow"] - b["outflow"], 2)
        balance += b["net"]
        b["closing"] = round(balance, 2)
        b["negative"] = b["closing"] < 0

    return {"opening": opening, "weeks": weeks, "buckets": buckets,
            "weekly_payroll": round(weekly_payroll, 2)}


# ── profitability ────────────────────────────────────────────────────────────
@router.get("/profit/by-sku")
async def profit_by_sku(current_user: dict = Depends(get_current_user)):
    items = {i.get("item_code"): i for i in await db.items.find({}).to_list(100000)}
    invoices = await db.invoices.find({}).to_list(100000)
    agg = {}
    for inv in invoices:
        for line in (inv.get("items") or []):
            code = line.get("item_code") or line.get("item_name")
            if not code:
                continue
            qty = _num(line.get("qty"))
            revenue = _num(line.get("amount") or (qty * _num(line.get("rate"))))
            it = items.get(code, {})
            cost = _num(it.get("cost_price") or it.get("purchase_price"))
            slot = agg.setdefault(code, {"item_code": code,
                                         "item_name": line.get("item_name") or code,
                                         "qty": 0.0, "revenue": 0.0, "cogs": 0.0})
            slot["qty"] += qty
            slot["revenue"] += revenue
            slot["cogs"] += qty * cost
    rows = []
    for s in agg.values():
        gp = s["revenue"] - s["cogs"]
        s["gross_profit"] = round(gp, 2)
        s["margin_pct"] = round(gp / s["revenue"] * 100, 1) if s["revenue"] else 0
        s["revenue"] = round(s["revenue"], 2)
        s["cogs"] = round(s["cogs"], 2)
        rows.append(s)
    rows.sort(key=lambda r: r["gross_profit"], reverse=True)
    return rows


@router.get("/profit/by-customer")
async def profit_by_customer(current_user: dict = Depends(get_current_user)):
    accounts = {a.get("id"): a for a in await db.accounts.find({}).to_list(100000)}
    items = {i.get("item_code"): i for i in await db.items.find({}).to_list(100000)}
    invoices = await db.invoices.find({}).to_list(100000)
    agg = {}
    for inv in invoices:
        acct = accounts.get(inv.get("account_id"), {})
        cust = inv.get("customer_name") or acct.get("customer_name") or "Unknown"
        slot = agg.setdefault(cust, {"customer": cust, "revenue": 0.0, "cogs": 0.0})
        for line in (inv.get("items") or []):
            qty = _num(line.get("qty"))
            slot["revenue"] += _num(line.get("amount") or (qty * _num(line.get("rate"))))
            it = items.get(line.get("item_code"), {})
            slot["cogs"] += qty * _num(it.get("cost_price") or it.get("purchase_price"))
    rows = []
    for s in agg.values():
        gp = s["revenue"] - s["cogs"]
        s["gross_profit"] = round(gp, 2)
        s["margin_pct"] = round(gp / s["revenue"] * 100, 1) if s["revenue"] else 0
        s["revenue"] = round(s["revenue"], 2)
        s["cogs"] = round(s["cogs"], 2)
        rows.append(s)
    rows.sort(key=lambda r: r["gross_profit"], reverse=True)
    return rows


# ── credit-risk score ────────────────────────────────────────────────────────
@router.get("/credit-risk")
async def credit_risk(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    accounts = await db.accounts.find({}).to_list(100000)
    invoices = await db.invoices.find({}).to_list(100000)
    by_acct = {}
    for inv in invoices:
        by_acct.setdefault(inv.get("account_id"), []).append(inv)

    rows = []
    for a in accounts:
        invs = by_acct.get(a.get("id"), [])
        outstanding = sum(_outstanding(i) for i in invs if _outstanding(i) > 0)
        max_overdue = 0
        for i in invs:
            if _outstanding(i) <= 0:
                continue
            due = _parse_date(i.get("due_date"))
            if due:
                max_overdue = max(max_overdue, (now - due).days)
        limit = _num(a.get("credit_limit"))
        util = (outstanding / limit) if limit else (1 if outstanding else 0)

        # score: start 100, subtract for utilisation and overdue
        score = 100
        score -= min(50, util * 50)
        score -= min(50, max_overdue)
        score = max(0, round(score))
        band = "Green" if score >= 70 else ("Amber" if score >= 40 else "Red")
        rows.append({"customer": a.get("customer_name"), "score": score, "band": band,
                     "outstanding": round(outstanding, 2), "credit_limit": round(limit, 2),
                     "utilisation_pct": round(util * 100, 1), "max_overdue_days": max_overdue})
    rows.sort(key=lambda r: r["score"])
    return rows


# ── bank reconciliation ──────────────────────────────────────────────────────
def _parse_amount(s):
    if s is None:
        return 0.0
    s = str(s).replace(",", "").strip()
    try:
        return float(s) if s else 0.0
    except ValueError:
        return 0.0


def _parse_csv_date(s):
    s = str(s).strip()
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d/%m/%y", "%d-%b-%Y"):
        try:
            return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


@router.post("/bank/import")
async def bank_import(payload: dict = Body(...), current_user: dict = Depends(get_current_user)):
    """Parse HDFC-style CSV text → bank_transactions (dedup on date+amount+ref)."""
    csv_text = payload.get("csv_text", "")
    bank_account = payload.get("bank_account", "")
    lines = [ln for ln in csv_text.splitlines() if ln.strip()]
    # find header row (contains Date + Narration/Description)
    start = 0
    for i, ln in enumerate(lines):
        low = ln.lower()
        if "date" in low and ("narration" in low or "description" in low or "particular" in low):
            start = i + 1
            break
    created = skipped = 0
    existing = await db.bank_transactions.find({}).to_list(100000)
    seen = {(str(e.get("txn_date"))[:10], _num(e.get("deposit")),
             _num(e.get("withdrawal")), e.get("ref_no")) for e in existing}
    for ln in lines[start:]:
        cols = [c.strip().strip('"') for c in re.split(r"\t|,", ln)]
        if len(cols) < 3:
            continue
        d = _parse_csv_date(cols[0])
        if not d:
            continue
        desc = cols[1] if len(cols) > 1 else ""
        ref = cols[2] if len(cols) > 2 else ""
        nums = [_parse_amount(c) for c in cols[3:]]
        withdrawal = next((n for n in nums if n > 0), 0.0)
        deposit = next((n for n in reversed(nums) if n > 0), 0.0)
        if len(nums) >= 2:
            withdrawal, deposit = nums[0], nums[1]
        if deposit == 0 and withdrawal == 0:
            continue
        key = (d.date().isoformat(), deposit, withdrawal, ref)
        if key in seen:
            skipped += 1
            continue
        seen.add(key)
        await db.bank_transactions.insert_one({
            "id": str(uuid.uuid4()), "txn_date": d, "description": desc, "ref_no": ref,
            "deposit": deposit, "withdrawal": withdrawal, "bank_account": bank_account,
            "reconciled": False, "matched_payment_id": None,
            "created_at": datetime.now(timezone.utc),
        })
        created += 1
    return {"created": created, "skipped": skipped}


@router.post("/bank/auto-match")
async def bank_auto_match(current_user: dict = Depends(get_current_user)):
    """Match unreconciled deposits to Payments by amount + date (±3 days)."""
    txns = await db.bank_transactions.find({"reconciled": False}).to_list(100000)
    payments = await db.payments.find({}).to_list(100000)
    used = set()
    matched = 0
    for t in txns:
        amt = _num(t.get("deposit")) or _num(t.get("withdrawal"))
        td = _parse_date(t.get("txn_date"))
        if amt <= 0 or not td:
            continue
        for p in payments:
            if p.get("id") in used:
                continue
            if abs(_num(p.get("amount")) - amt) > 0.01:
                continue
            pd = _parse_date(p.get("payment_date"))
            if pd and abs((pd.date() - td.date()).days) > 3:
                continue
            await db.bank_transactions.update_one({"id": t.get("id")}, {"$set": {
                "reconciled": True, "matched_payment_id": p.get("id")}})
            used.add(p.get("id"))
            matched += 1
            break
    return {"matched": matched}


@router.get("/bank/reconciliation")
async def bank_reconciliation(current_user: dict = Depends(get_current_user)):
    txns = await db.bank_transactions.find({}).to_list(100000)
    matched = [t for t in txns if t.get("reconciled")]
    unmatched = [t for t in txns if not t.get("reconciled")]
    unrec_total = sum(_num(t.get("deposit")) + _num(t.get("withdrawal")) for t in unmatched)
    return {"total": len(txns), "matched": len(matched), "unmatched": len(unmatched),
            "unreconciled_total": round(unrec_total, 2),
            "transactions": sorted(txns, key=lambda t: str(t.get("txn_date")), reverse=True)[:200]}
