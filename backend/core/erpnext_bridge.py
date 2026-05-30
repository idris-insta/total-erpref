"""
ERPNext Integration Bridge
==========================
Connects instabiz-erp-unified FastAPI backend to the live ERPNext Frappe v15
instance running on MariaDB at /home/dev/frappe-bench/ (site: frontend).

Architecture:
  READS  → Direct async MariaDB queries (fast, no HTTP overhead)
  WRITES → ERPNext REST API  (safe — triggers all Frappe hooks, validators,
           GL entries, stock ledger, e-Invoice, e-Way Bill, notifications)

ERPNext REST API base:  http://localhost:8000   (or ERPNEXT_URL env var)
Auth:                   API Key + API Secret     (generate in ERPNext User → API Access)
MariaDB DB name:        frontend                 (site name = DB name in ERPNext bench)

How to generate API credentials in ERPNext:
  1. ERPNext → Settings → Users → open your System Manager user
  2. API Access section → Generate Keys
  3. Copy api_key + api_secret into .env
"""

import os
import httpx
import logging
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)

ERPNEXT_URL     = os.environ.get("ERPNEXT_URL", "http://localhost:8000")
ERPNEXT_API_KEY = os.environ.get("ERPNEXT_API_KEY", "")
ERPNEXT_API_SEC = os.environ.get("ERPNEXT_API_SECRET", "")

_AUTH_HEADER = f"token {ERPNEXT_API_KEY}:{ERPNEXT_API_SEC}"


def _headers() -> Dict[str, str]:
    return {
        "Authorization": f"token {ERPNEXT_API_KEY}:{ERPNEXT_API_SEC}",
        "Content-Type":  "application/json",
        "Accept":        "application/json",
    }


# ─── Low-level HTTP helpers ────────────────────────────────────────────────────

async def erp_get(path: str, params: Optional[Dict] = None) -> Dict:
    """GET /api/... from ERPNext."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{ERPNEXT_URL}{path}", headers=_headers(), params=params or {})
        r.raise_for_status()
        return r.json()


async def erp_post(path: str, data: Dict) -> Dict:
    """POST /api/... to ERPNext."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.post(f"{ERPNEXT_URL}{path}", headers=_headers(), json=data)
        r.raise_for_status()
        return r.json()


async def erp_put(path: str, data: Dict) -> Dict:
    """PUT /api/... to ERPNext."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.put(f"{ERPNEXT_URL}{path}", headers=_headers(), json=data)
        r.raise_for_status()
        return r.json()


async def erp_delete(path: str) -> Dict:
    """DELETE /api/... to ERPNext."""
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.delete(f"{ERPNEXT_URL}{path}", headers=_headers())
        r.raise_for_status()
        return r.json()


# ─── Resource CRUD (ERPNext REST API pattern) ──────────────────────────────────

async def get_doc(doctype: str, name: str) -> Dict:
    """Fetch a single ERPNext document by name."""
    return await erp_get(f"/api/resource/{doctype}/{name}")


async def get_list(
    doctype: str,
    filters: Optional[List] = None,
    fields: Optional[List[str]] = None,
    order_by: str = "modified desc",
    limit_page_length: int = 500,
    limit_start: int = 0,
) -> List[Dict]:
    """
    Fetch a list of ERPNext documents.
    filters: [["field", "operator", "value"], ...]
    fields:  ["name", "customer_name", ...]  — use ["*"] for all
    """
    params: Dict[str, Any] = {
        "order_by":          order_by,
        "limit_page_length": limit_page_length,
        "limit_start":       limit_start,
    }
    if filters:
        import json
        params["filters"] = json.dumps(filters)
    if fields:
        import json
        params["fields"] = json.dumps(fields)

    result = await erp_get(f"/api/resource/{doctype}", params)
    return result.get("data", [])


async def create_doc(doctype: str, data: Dict) -> Dict:
    """
    Create a new ERPNext document. Triggers all Frappe hooks (validate, before_insert,
    after_insert, etc.). Returns the created document.
    """
    payload = {"doctype": doctype, **data}
    result = await erp_post(f"/api/resource/{doctype}", payload)
    return result.get("data", result)


async def update_doc(doctype: str, name: str, data: Dict) -> Dict:
    """Update an existing ERPNext document. Triggers validate + on_update hooks."""
    result = await erp_put(f"/api/resource/{doctype}/{name}", data)
    return result.get("data", result)


async def delete_doc(doctype: str, name: str) -> Dict:
    """Delete (cancel + delete) an ERPNext document."""
    return await erp_delete(f"/api/resource/{doctype}/{name}")


# ─── Whitelisted method calls ──────────────────────────────────────────────────

async def call_method(method: str, **kwargs) -> Any:
    """
    Call a whitelisted Frappe/ERPNext server method.
    e.g. call_method("instabiz.overrides.lead.set_lead_status", lead="LEAD-001", status="Warm")
    """
    result = await erp_post(f"/api/method/{method}", kwargs)
    return result.get("message", result)


# ─── Submit / Cancel ──────────────────────────────────────────────────────────

async def submit_doc(doctype: str, name: str) -> Dict:
    """Submit an ERPNext document (docstatus 0 → 1). Triggers on_submit hooks."""
    return await call_method("frappe.client.submit", doctype=doctype, name=name)


async def cancel_doc(doctype: str, name: str) -> Dict:
    """Cancel a submitted ERPNext document (docstatus 1 → 2). Triggers on_cancel."""
    return await call_method("frappe.client.cancel", doctype=doctype, name=name)


# ─── Domain-specific helpers ───────────────────────────────────────────────────

class ERPNextCRM:
    """CRM operations — reads from MariaDB, writes via REST API."""

    @staticmethod
    async def get_leads(filters: Optional[List] = None, limit: int = 200) -> List[Dict]:
        return await get_list("Lead", filters=filters, fields=[
            "name", "lead_name", "email_id", "mobile_no", "status",
            "custom_status", "lead_owner", "territory", "source",
            "custom_lead_score", "custom_next_follow_up_date",
            "custom_sales_person_user", "creation", "modified"
        ], limit_page_length=limit)

    @staticmethod
    async def create_lead(data: Dict) -> Dict:
        """Creates lead in ERPNext — triggers round-robin assignment, scoring, pincode autofill."""
        return await create_doc("Lead", data)

    @staticmethod
    async def get_customers(filters: Optional[List] = None, limit: int = 500) -> List[Dict]:
        return await get_list("Customer", filters=filters, fields=[
            "name", "customer_name", "customer_type", "territory",
            "customer_group", "custom_overdue_block", "creation", "modified"
        ], limit_page_length=limit)

    @staticmethod
    async def create_customer(data: Dict) -> Dict:
        return await create_doc("Customer", data)


class ERPNextSales:
    """Sales document operations."""

    @staticmethod
    async def get_quotations(filters: Optional[List] = None, limit: int = 200) -> List[Dict]:
        return await get_list("Quotation", filters=filters, fields=[
            "name", "party_name", "status", "custom_status", "valid_till",
            "grand_total", "custom_location", "custom_sales_person_user",
            "custom_sales_person", "transaction_date", "creation"
        ], limit_page_length=limit)

    @staticmethod
    async def get_sales_orders(filters: Optional[List] = None, limit: int = 200) -> List[Dict]:
        return await get_list("Sales Order", filters=filters, fields=[
            "name", "customer", "customer_name", "status", "custom_status",
            "grand_total", "custom_location", "custom_sales_person_user",
            "transaction_date", "delivery_date", "creation"
        ], limit_page_length=limit)

    @staticmethod
    async def get_sales_invoices(filters: Optional[List] = None, limit: int = 200) -> List[Dict]:
        return await get_list("Sales Invoice", filters=filters, fields=[
            "name", "customer", "customer_name", "status", "grand_total",
            "outstanding_amount", "due_date", "custom_sales_person_user",
            "posting_date", "creation"
        ], limit_page_length=limit)

    @staticmethod
    async def get_delivery_notes(filters: Optional[List] = None, limit: int = 200) -> List[Dict]:
        return await get_list("Delivery Note", filters=filters, fields=[
            "name", "customer", "customer_name", "status", "custom_status",
            "custom_lr_number", "custom_location", "custom_sales_person_user",
            "posting_date", "creation"
        ], limit_page_length=limit)


class ERPNextInventory:
    """Inventory / stock operations."""

    @staticmethod
    async def get_items(filters: Optional[List] = None, limit: int = 500) -> List[Dict]:
        return await get_list("Item", filters=filters, fields=[
            "name", "item_name", "item_group", "stock_uom", "valuation_rate",
            "custom_is_discontinued", "has_batch_no", "reorder_level",
            "custom_rolls_per_box", "custom_carton_weight_kg"
        ], limit_page_length=limit)

    @staticmethod
    async def get_stock(warehouse: Optional[str] = None, item_code: Optional[str] = None) -> List[Dict]:
        """Get current stock from tabBin."""
        filters = []
        if warehouse:
            filters.append(["warehouse", "=", warehouse])
        if item_code:
            filters.append(["item_code", "=", item_code])
        return await get_list("Bin", filters=filters, fields=[
            "item_code", "warehouse", "actual_qty", "reserved_qty",
            "ordered_qty", "projected_qty", "valuation_rate", "stock_value"
        ], limit_page_length=1000)

    @staticmethod
    async def create_stock_entry(data: Dict) -> Dict:
        """Create stock transfer/adjustment — triggers stock ledger entries."""
        return await create_doc("Stock Entry", data)


class ERPNextHRMS:
    """HRMS operations."""

    @staticmethod
    async def get_employees(filters: Optional[List] = None) -> List[Dict]:
        return await get_list("Employee", filters=filters, fields=[
            "name", "employee_name", "designation", "department",
            "status", "user_id", "date_of_joining", "relieving_date",
            "custom_location_state", "holiday_list"
        ], limit_page_length=500)

    @staticmethod
    async def get_attendance(employee: Optional[str] = None, from_date: Optional[str] = None) -> List[Dict]:
        filters = []
        if employee:
            filters.append(["employee", "=", employee])
        if from_date:
            filters.append(["attendance_date", ">=", from_date])
        return await get_list("Attendance", filters=filters, fields=[
            "name", "employee", "employee_name", "attendance_date",
            "status", "in_time", "out_time", "late_entry", "early_exit"
        ], limit_page_length=1000)


class ERPNextAccounts:
    """Accounts / finance operations."""

    @staticmethod
    async def get_payment_entries(filters: Optional[List] = None, limit: int = 200) -> List[Dict]:
        return await get_list("Payment Entry", filters=filters, fields=[
            "name", "payment_type", "party_type", "party", "party_name",
            "paid_amount", "reference_no", "posting_date", "docstatus"
        ], limit_page_length=limit)

    @staticmethod
    async def get_gl_entries(filters: Optional[List] = None, limit: int = 1000) -> List[Dict]:
        return await get_list("GL Entry", filters=filters, fields=[
            "name", "posting_date", "account", "debit", "credit",
            "voucher_type", "voucher_no", "party_type", "party", "remarks"
        ], limit_page_length=limit)


class ERPNextCustom:
    """Custom IB DocTypes already defined in instabiz-develop."""

    @staticmethod
    async def get_customer_assignments(date: Optional[str] = None, user: Optional[str] = None) -> List[Dict]:
        filters = []
        if date:
            filters.append(["assigned_date", "=", date])
        if user:
            filters.append(["assigned_to", "=", user])
        return await get_list("IB Customer Assignment", filters=filters, fields=["*"])

    @staticmethod
    async def create_customer_assignment(data: Dict) -> Dict:
        return await create_doc("IB Customer Assignment", data)

    @staticmethod
    async def get_sales_targets(user: Optional[str] = None, month: Optional[str] = None) -> List[Dict]:
        filters = []
        if user:
            filters.append(["sales_user", "=", user])
        if month:
            filters.append(["month", "=", month])
        return await get_list("IB Sales Target", filters=filters, fields=["*"])

    @staticmethod
    async def get_customer_scores(customer: Optional[str] = None) -> List[Dict]:
        filters = [["score_date", "=", "Today"]] if not customer else [["customer", "=", customer]]
        return await get_list("IB Customer Score", filters=filters, fields=["*"])

    @staticmethod
    async def get_branding() -> Optional[Dict]:
        docs = await get_list("IB Branding", fields=["*"], limit_page_length=1)
        return docs[0] if docs else None

    @staticmethod
    async def get_transporters(filters: Optional[List] = None) -> List[Dict]:
        return await get_list("IB Transport", filters=filters, fields=["*"])

    @staticmethod
    async def get_lead_sales_teams(filters: Optional[List] = None) -> List[Dict]:
        teams = await get_list("Lead Sales Team", filters=filters, fields=["*"])
        # Enrich with child table members and territories
        enriched = []
        for team in teams:
            detail = await get_doc("Lead Sales Team", team["name"])
            enriched.append(detail.get("data", team))
        return enriched

    @staticmethod
    async def get_jumbo_rolls(filters: Optional[List] = None) -> List[Dict]:
        return await get_list("IB Jumbo Roll", filters=filters, fields=["*"])

    @staticmethod
    async def get_pdc_list(filters: Optional[List] = None) -> List[Dict]:
        return await get_list("IB PDC", filters=filters, fields=["*"])


# ─── Health check ──────────────────────────────────────────────────────────────

async def ping_erpnext() -> Dict:
    """Check ERPNext connectivity. Returns version info."""
    try:
        result = await erp_get("/api/method/frappe.utils.version.get_versions")
        return {"status": "ok", "versions": result.get("message", {})}
    except Exception as e:
        return {"status": "error", "detail": str(e)}
