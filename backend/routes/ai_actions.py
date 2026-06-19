"""
routes/ai_actions.py — AI Action approval queue + the four automation agents.

Agents read live data, build a DETERMINISTIC draft, optionally ask Ollama to
phrase the human-facing text, and write one `ai_actions` row (status=pending).
Nothing is sent/created until a human approves it in the AI Inbox.

Mounted at /api/ai.
"""
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
import uuid
import logging

from server import db, get_current_user
from services import llm

router = APIRouter()
logger = logging.getLogger("ai_actions")

AGENTS = ["auto_quote", "demand_forecast", "smart_reorder", "collections"]


# ── helpers ──────────────────────────────────────────────────────────────────
async def _dedup_exists(agent: str, reference_id: str) -> bool:
    """A pending action for this agent+reference already queued today?"""
    if not reference_id:
        return False
    rows = await db.ai_actions.find({"agent": agent, "reference_id": reference_id,
                                     "status": "pending"}).to_list(1000)
    today = datetime.now(timezone.utc).date()
    for r in rows:
        ca = r.get("created_at")
        if isinstance(ca, datetime) and ca.date() == today:
            return True
        if isinstance(ca, str) and ca[:10] == today.isoformat():
            return True
    return bool(rows)


async def _queue(agent, action_type, title, summary, draft,
                 reference_type=None, reference_id=None, ai_generated=False):
    if await _dedup_exists(agent, reference_id):
        return None
    doc = {
        "id": str(uuid.uuid4()),
        "agent": agent, "action_type": action_type, "status": "pending",
        "title": title, "summary": summary or "", "draft": draft or {},
        "reference_type": reference_type, "reference_id": reference_id,
        "ai_generated": ai_generated,
        "created_at": datetime.now(timezone.utc),
    }
    await db.ai_actions.insert_one(doc)
    return doc["id"]


def _num(v):
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


# ── agents ───────────────────────────────────────────────────────────────────
async def run_auto_quote():
    """New/qualified leads with a product interest → draft quotation."""
    made = 0
    leads = await db.leads.find({}).to_list(100000)
    items = await db.items.find({"is_active": True}).to_list(100000)
    for lead in leads:
        status = str(lead.get("status") or "").lower()
        interest = lead.get("product_interest")
        if status not in ("new", "qualified") or not interest:
            continue
        match = next((i for i in items
                      if interest.lower() in (i.get("item_name") or "").lower()
                      or interest.lower() in (i.get("category") or "").lower()), None)
        rate = _num(match.get("selling_price")) if match else 0
        item_name = match.get("item_name") if match else interest
        company = lead.get("company_name") or lead.get("contact_person") or "Lead"
        summary = (f"Draft quotation for {company}: {item_name} @ ₹{rate:,.0f}. "
                   f"Est. value ₹{_num(lead.get('estimated_value')):,.0f}.")
        note = await llm.complete(
            "You are a B2B sales assistant for an adhesive tape maker. One short line.",
            f"Write a one-line internal note suggesting a quote for {company} "
            f"interested in {interest}.")
        draft = {"lead_id": lead.get("id"), "customer": company,
                 "item": item_name, "rate": rate,
                 "items": [{"item_name": item_name, "rate": rate, "qty": 1}]}
        if await _queue("auto_quote", "create_quotation",
                        f"Quote: {company}", note or summary, draft,
                        "lead", lead.get("id"), ai_generated=bool(note)):
            made += 1
    return made


async def run_demand_forecast():
    """Per-SKU 4-week forecast from recent sales (deterministic)."""
    items = await db.items.find({"is_active": True}).to_list(100000)
    invoices = await db.invoices.find({}).to_list(100000)
    # crude demand proxy: count invoice lines per item over recent window
    sold = {}
    for inv in invoices:
        for line in (inv.get("items") or inv.get("line_items") or []):
            code = line.get("item_code") or line.get("item_name")
            sold[code] = sold.get(code, 0) + _num(line.get("qty"))
    rows = []
    for it in items:
        code = it.get("item_code")
        recent = sold.get(code, 0)
        weekly = recent / 12 if recent else 0
        forecast_4w = round(weekly * 4, 1)
        rows.append({"item_code": code, "item_name": it.get("item_name"),
                     "weekly_avg": round(weekly, 1), "forecast_4w": forecast_4w})
    rows.sort(key=lambda r: r["forecast_4w"], reverse=True)
    top = rows[:10]
    summary = f"4-week demand forecast for {len(rows)} SKUs. Top mover: " + (
        f"{top[0]['item_name']} ({top[0]['forecast_4w']} units)" if top and top[0]["forecast_4w"] else "no recent sales")
    return await _queue("demand_forecast", "forecast_report",
                        "Weekly demand forecast", summary,
                        {"rows": top}, "report", f"forecast-{datetime.now(timezone.utc).date()}")


async def run_smart_reorder():
    """Items at/below reorder level → draft PO suggestion."""
    made = 0
    items = await db.items.find({"is_active": True}).to_list(100000)
    pos = await db.purchase_orders.find({}).to_list(100000)
    last_supplier = {}
    for po in pos:
        for line in (po.get("items") or []):
            last_supplier[line.get("item_code")] = po.get("supplier_name") or po.get("supplier")
    for it in items:
        stock = _num(it.get("current_stock"))
        reorder = _num(it.get("reorder_level"))
        if reorder <= 0 or stock > reorder:
            continue
        safety = _num(it.get("safety_stock")) or reorder
        suggest_qty = round(max(reorder * 2, safety + reorder - stock), 0)
        supplier = last_supplier.get(it.get("item_code")) or "—"
        summary = (f"{it.get('item_name')} low: stock {stock:g} ≤ reorder {reorder:g}. "
                   f"Suggest PO {suggest_qty:g} units" + (f" from {supplier}" if supplier != '—' else ""))
        draft = {"item_code": it.get("item_code"), "item_name": it.get("item_name"),
                 "suggest_qty": suggest_qty, "supplier": supplier,
                 "current_stock": stock, "reorder_level": reorder}
        if await _queue("smart_reorder", "create_po",
                        f"Reorder: {it.get('item_name')}", summary, draft,
                        "item", it.get("id")):
            made += 1
    return made


async def run_collections():
    """Overdue invoices → draft dunning message toned by age."""
    made = 0
    now = datetime.now(timezone.utc)
    invoices = await db.invoices.find({}).to_list(100000)
    accounts = {a.get("id"): a for a in await db.accounts.find({}).to_list(100000)}
    for inv in invoices:
        outstanding = _num(inv.get("balance_amount")) or (
            _num(inv.get("grand_total")) - _num(inv.get("paid_amount")))
        if outstanding <= 0:
            continue
        due = inv.get("due_date")
        if isinstance(due, str):
            try:
                due = datetime.fromisoformat(due.replace("Z", "+00:00"))
            except ValueError:
                due = None
        days = (now - due).days if isinstance(due, datetime) else 0
        if days <= 0:
            continue
        acct = accounts.get(inv.get("account_id"), {})
        cust = inv.get("customer_name") or acct.get("customer_name") or "Customer"
        tone = "gentle" if days < 15 else ("firm" if days <= 30 else "escalation")
        base = (f"Dear {cust}, invoice {inv.get('invoice_number') or inv.get('id')} of "
                f"₹{outstanding:,.0f} is {days} days overdue. Kindly arrange payment.")
        msg = await llm.complete(
            f"You are a polite accounts-receivable officer. Tone: {tone}. 2 sentences, India B2B.",
            f"Write a payment reminder to {cust} for ₹{outstanding:,.0f}, {days} days overdue.")
        draft = {"customer": cust, "invoice": inv.get("invoice_number") or inv.get("id"),
                 "amount": outstanding, "days_overdue": days, "tone": tone,
                 "message": msg or base}
        if await _queue("collections", "collection_message",
                        f"Collect ₹{outstanding:,.0f}: {cust}",
                        f"{days}d overdue ({tone})", draft,
                        "invoice", inv.get("id"), ai_generated=bool(msg)):
            made += 1
    return made


AGENT_FUNCS = {
    "auto_quote": run_auto_quote,
    "demand_forecast": run_demand_forecast,
    "smart_reorder": run_smart_reorder,
    "collections": run_collections,
}


async def run_all_agents():
    results = {}
    for name, fn in AGENT_FUNCS.items():
        try:
            results[name] = await fn()
        except Exception as e:
            logger.exception("agent %s failed", name)
            results[name] = f"error: {e}"
    return results


# ── apply handlers (on approve) ──────────────────────────────────────────────
async def _apply(action: dict):
    t = action.get("action_type")
    draft = action.get("draft") or {}
    if t == "create_quotation":
        await db.quotations.insert_one({
            "id": str(uuid.uuid4()), "customer_name": draft.get("customer"),
            "items": draft.get("items") or [], "status": "draft",
            "lead_id": draft.get("lead_id"), "created_at": datetime.now(timezone.utc),
        })
        return "quotation created (draft)"
    if t == "create_po":
        await db.purchase_orders.insert_one({
            "id": str(uuid.uuid4()), "supplier": draft.get("supplier"),
            "items": [{"item_code": draft.get("item_code"),
                       "item_name": draft.get("item_name"),
                       "qty": draft.get("suggest_qty")}],
            "status": "draft", "created_at": datetime.now(timezone.utc),
        })
        return "purchase order created (draft)"
    if t == "collection_message":
        return "message approved (logged)"
    return "acknowledged"


# ── routes ───────────────────────────────────────────────────────────────────
@router.get("/actions")
async def list_actions(status: str = "pending", current_user: dict = Depends(get_current_user)):
    q = {} if status in ("all", "") else {"status": status}
    rows = await db.ai_actions.find(q).to_list(500)
    rows.sort(key=lambda r: str(r.get("created_at")), reverse=True)
    return rows


@router.post("/actions/{action_id}/approve")
async def approve_action(action_id: str, current_user: dict = Depends(get_current_user)):
    action = await db.ai_actions.find_one({"id": action_id})
    if not action:
        raise HTTPException(404, "Action not found")
    if action.get("status") != "pending":
        raise HTTPException(400, f"Already {action.get('status')}")
    result = await _apply(action)
    await db.ai_actions.update_one({"id": action_id}, {"$set": {
        "status": "sent", "decided_by": current_user.get("email"),
        "decided_at": datetime.now(timezone.utc)}})
    return {"success": True, "result": result}


@router.post("/actions/{action_id}/reject")
async def reject_action(action_id: str, current_user: dict = Depends(get_current_user)):
    action = await db.ai_actions.find_one({"id": action_id})
    if not action:
        raise HTTPException(404, "Action not found")
    await db.ai_actions.update_one({"id": action_id}, {"$set": {
        "status": "rejected", "decided_by": current_user.get("email"),
        "decided_at": datetime.now(timezone.utc)}})
    return {"success": True}


@router.post("/agents/run")
async def run_agents(current_user: dict = Depends(get_current_user)):
    """Manually trigger all agents (also runs on the daily scheduler)."""
    return {"success": True, "results": await run_all_agents()}


@router.get("/status")
async def ai_status(current_user: dict = Depends(get_current_user)):
    return {"ollama_enabled": await llm.is_enabled(), "agents": AGENTS}
