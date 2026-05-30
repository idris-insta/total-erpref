"""
MariaDB Direct Read Layer
=========================
Async connection to ERPNext's MariaDB database for fast direct reads.
ERPNext site `frontend` → MariaDB database named `frontend`.

All ERPNext DocTypes are stored as `tab{DocType Name}` tables.
e.g.:  Lead → tabLead,  Customer → tabCustomer,  Sales Order → tabSales Order

IMPORTANT:
  - Use this for READ operations only (dashboard counts, analytics, reporting).
  - For WRITE operations (create/update/submit/cancel), always use erpnext_bridge.py
    so that Frappe hooks, validators, GL entries, and stock ledger fire correctly.

Bench root:  /home/dev/frappe-bench/
Site name:   frontend
DB host:     localhost:3306 (MariaDB)
DB name:     frontend   (same as site name)
DB user:     root  or  site-specific user (see sites/frontend/site_config.json)
"""

import os
import logging
import aiomysql
from typing import Any, Dict, List, Optional, Tuple
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

# ─── Connection settings ───────────────────────────────────────────────────────
# These must match the values in /home/dev/frappe-bench/sites/frontend/site_config.json
# Keys in site_config.json: db_host, db_name, db_user (root), db_password

MARIADB_HOST     = os.environ.get("MARIADB_HOST", "localhost")
MARIADB_PORT     = int(os.environ.get("MARIADB_PORT", "3306"))
MARIADB_DB       = os.environ.get("MARIADB_DB", "frontend")        # ERPNext site name
MARIADB_USER     = os.environ.get("MARIADB_USER", "root")
MARIADB_PASSWORD = os.environ.get("MARIADB_PASSWORD", "")

_pool: Optional[aiomysql.Pool] = None


async def init_mariadb():
    """Create the connection pool. Call on FastAPI startup."""
    global _pool
    if _pool is not None:
        return
    try:
        _pool = await aiomysql.create_pool(
            host=MARIADB_HOST,
            port=MARIADB_PORT,
            db=MARIADB_DB,
            user=MARIADB_USER,
            password=MARIADB_PASSWORD,
            charset="utf8mb4",
            autocommit=True,
            minsize=2,
            maxsize=10,
            connect_timeout=10,
        )
        logger.info(f"MariaDB pool ready → {MARIADB_DB}@{MARIADB_HOST}:{MARIADB_PORT}")
    except Exception as e:
        logger.error(f"MariaDB connection failed: {e}")
        raise


async def close_mariadb():
    """Close the connection pool. Call on FastAPI shutdown."""
    global _pool
    if _pool:
        _pool.close()
        await _pool.wait_closed()
        _pool = None


@asynccontextmanager
async def get_conn():
    """Async context manager for a single connection from the pool."""
    if _pool is None:
        await init_mariadb()
    async with _pool.acquire() as conn:
        yield conn


# ─── Query helpers ─────────────────────────────────────────────────────────────

async def query(sql: str, args: Optional[Tuple] = None) -> List[Dict]:
    """
    Execute a raw SELECT and return list of dicts.
    Always use parameterised queries — never format user input into SQL.
    """
    async with get_conn() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute(sql, args or ())
            return await cur.fetchall()


async def query_one(sql: str, args: Optional[Tuple] = None) -> Optional[Dict]:
    """Execute a SELECT and return the first row, or None."""
    rows = await query(sql, args)
    return rows[0] if rows else None


async def scalar(sql: str, args: Optional[Tuple] = None) -> Any:
    """Execute a SELECT and return the first column of the first row."""
    async with get_conn() as conn:
        async with conn.cursor() as cur:
            await cur.execute(sql, args or ())
            row = await cur.fetchone()
            return row[0] if row else None


# ─── ERPNext table name helper ─────────────────────────────────────────────────

def tab(doctype: str) -> str:
    """Return the MariaDB table name for an ERPNext DocType."""
    return f"tab{doctype}"


# ─── Prebuilt read queries for common ERPNext tables ──────────────────────────

class MariaDBReads:
    """
    Fast direct MariaDB reads for dashboard analytics and reporting.
    Table names follow ERPNext convention: tab{DocType}.
    All custom fields added by instabiz fixtures are available as columns.
    """

    # ── Dashboard KPIs ─────────────────────────────────────────────────────────

    @staticmethod
    async def count_active_leads() -> int:
        """Leads not in terminal statuses."""
        return await scalar(
            "SELECT COUNT(*) FROM `tabLead` "
            "WHERE custom_status NOT IN ('Lost','Converted') AND docstatus < 2"
        )

    @staticmethod
    async def count_customers() -> int:
        return await scalar("SELECT COUNT(*) FROM `tabCustomer` WHERE docstatus < 2")

    @staticmethod
    async def monthly_revenue(year_month: str) -> float:
        """Sum of submitted Sales Invoice grand_total for a given YYYY-MM."""
        return await scalar(
            "SELECT COALESCE(SUM(grand_total), 0) FROM `tabSales Invoice` "
            "WHERE DATE_FORMAT(posting_date, '%%Y-%%m') = %s AND docstatus = 1 AND is_return = 0",
            (year_month,)
        ) or 0.0

    @staticmethod
    async def total_revenue() -> float:
        return await scalar(
            "SELECT COALESCE(SUM(grand_total), 0) FROM `tabSales Invoice` "
            "WHERE docstatus = 1 AND is_return = 0"
        ) or 0.0

    @staticmethod
    async def count_open_work_orders() -> int:
        return await scalar(
            "SELECT COUNT(*) FROM `tabWork Order` WHERE status NOT IN ('Completed','Cancelled')"
        )

    @staticmethod
    async def count_low_stock_items(threshold: int = 0) -> int:
        """Items where bin actual_qty <= reorder_level."""
        return await scalar(
            "SELECT COUNT(DISTINCT b.item_code) FROM `tabBin` b "
            "JOIN `tabItem` i ON i.name = b.item_code "
            "WHERE b.actual_qty <= COALESCE(i.reorder_level, %s) AND i.disabled = 0",
            (threshold,)
        )

    @staticmethod
    async def count_pending_approvals() -> int:
        """Leaves + Overtime Requests pending approval."""
        leaves = await scalar(
            "SELECT COUNT(*) FROM `tabLeave Application` WHERE status = 'Open' AND docstatus = 0"
        ) or 0
        ot = await scalar(
            "SELECT COUNT(*) FROM `tabIB Overtime Request` WHERE status = 'Pending Approval'"
        ) or 0
        return (leaves or 0) + (ot or 0)

    # ── Sales & Revenue ────────────────────────────────────────────────────────

    @staticmethod
    async def revenue_by_month(months: int = 6) -> List[Dict]:
        return await query(
            "SELECT DATE_FORMAT(posting_date, '%%Y-%%m') as month, "
            "  COUNT(*) as invoice_count, "
            "  SUM(grand_total) as revenue "
            "FROM `tabSales Invoice` "
            "WHERE docstatus = 1 AND is_return = 0 "
            "  AND posting_date >= DATE_SUB(CURDATE(), INTERVAL %s MONTH) "
            "GROUP BY month ORDER BY month",
            (months,)
        )

    @staticmethod
    async def revenue_by_location() -> List[Dict]:
        return await query(
            "SELECT custom_location as location, "
            "  COUNT(*) as order_count, SUM(grand_total) as revenue "
            "FROM `tabSales Order` "
            "WHERE docstatus = 1 "
            "GROUP BY custom_location ORDER BY revenue DESC"
        )

    @staticmethod
    async def top_customers(limit: int = 10) -> List[Dict]:
        return await query(
            "SELECT customer, customer_name, "
            "  COUNT(*) as orders, SUM(grand_total) as revenue "
            "FROM `tabSales Invoice` "
            "WHERE docstatus = 1 AND is_return = 0 "
            "GROUP BY customer, customer_name "
            "ORDER BY revenue DESC LIMIT %s",
            (limit,)
        )

    @staticmethod
    async def sales_by_person() -> List[Dict]:
        return await query(
            "SELECT custom_sales_person_user as sales_user, "
            "  custom_sales_person as sales_person, "
            "  COUNT(*) as orders, SUM(grand_total) as revenue "
            "FROM `tabSales Order` "
            "WHERE docstatus = 1 "
            "GROUP BY custom_sales_person_user, custom_sales_person "
            "ORDER BY revenue DESC"
        )

    # ── CRM ────────────────────────────────────────────────────────────────────

    @staticmethod
    async def lead_funnel() -> Dict:
        """Count leads by custom_status for funnel visualization."""
        rows = await query(
            "SELECT custom_status, COUNT(*) as count "
            "FROM `tabLead` WHERE docstatus < 2 "
            "GROUP BY custom_status"
        )
        return {r["custom_status"]: r["count"] for r in rows}

    @staticmethod
    async def lead_conversion_rate() -> float:
        total = await scalar("SELECT COUNT(*) FROM `tabLead` WHERE docstatus < 2") or 1
        converted = await scalar(
            "SELECT COUNT(*) FROM `tabLead` WHERE custom_status = 'Converted' AND docstatus < 2"
        ) or 0
        return round((converted / total) * 100, 2)

    # ── Inventory & Stock ──────────────────────────────────────────────────────

    @staticmethod
    async def stock_summary(warehouse: Optional[str] = None) -> List[Dict]:
        where = "WHERE b.actual_qty > 0"
        args: Tuple = ()
        if warehouse:
            where += " AND b.warehouse = %s"
            args = (warehouse,)
        return await query(
            f"SELECT b.item_code, i.item_name, i.item_group, b.warehouse, "
            f"  b.actual_qty, b.reserved_qty, b.stock_uom, i.valuation_rate, "
            f"  (b.actual_qty * i.valuation_rate) as stock_value "
            f"FROM `tabBin` b JOIN `tabItem` i ON i.name = b.item_code "
            f"{where} ORDER BY stock_value DESC",
            args
        )

    @staticmethod
    async def low_stock_items() -> List[Dict]:
        return await query(
            "SELECT b.item_code, i.item_name, i.item_group, b.warehouse, "
            "  b.actual_qty, COALESCE(i.reorder_level, 0) as reorder_level "
            "FROM `tabBin` b JOIN `tabItem` i ON i.name = b.item_code "
            "WHERE b.actual_qty <= COALESCE(i.reorder_level, 0) AND i.disabled = 0 "
            "ORDER BY b.actual_qty ASC"
        )

    # ── HRMS ───────────────────────────────────────────────────────────────────

    @staticmethod
    async def attendance_summary(from_date: str, to_date: str) -> List[Dict]:
        return await query(
            "SELECT employee, employee_name, "
            "  SUM(CASE WHEN status='Present' THEN 1 ELSE 0 END) as present, "
            "  SUM(CASE WHEN status='Absent' THEN 1 ELSE 0 END) as absent, "
            "  SUM(CASE WHEN status='Half Day' THEN 1 ELSE 0 END) as half_day, "
            "  SUM(CASE WHEN late_entry=1 THEN 1 ELSE 0 END) as late_entries "
            "FROM `tabAttendance` "
            "WHERE attendance_date BETWEEN %s AND %s AND docstatus = 1 "
            "GROUP BY employee, employee_name ORDER BY absent DESC",
            (from_date, to_date)
        )

    # ── Custom IB DocTypes ─────────────────────────────────────────────────────

    @staticmethod
    async def customer_board(date: str) -> List[Dict]:
        return await query(
            "SELECT ica.name, ica.customer, ica.assigned_to, ica.assigned_date, "
            "  ica.status, ica.source_pool, ica.territory, ica.notes, "
            "  c.customer_name "
            "FROM `tabIB Customer Assignment` ica "
            "LEFT JOIN `tabCustomer` c ON c.name = ica.customer "
            "WHERE ica.assigned_date = %s "
            "ORDER BY ica.source_pool, c.customer_name",
            (date,)
        )

    @staticmethod
    async def customer_health_scores() -> List[Dict]:
        return await query(
            "SELECT ics.customer, c.customer_name, ics.health_status, "
            "  ics.total_score, ics.score_date "
            "FROM `tabIB Customer Score` ics "
            "JOIN `tabCustomer` c ON c.name = ics.customer "
            "WHERE ics.score_date = CURDATE() "
            "ORDER BY ics.total_score DESC"
        )

    @staticmethod
    async def pdc_due_soon(days: int = 7) -> List[Dict]:
        return await query(
            "SELECT name, customer, customer_name, cheque_no, cheque_date, "
            "  amount, bank_name, status, sales_person_user "
            "FROM `tabIB PDC` "
            "WHERE status = 'Pending' AND cheque_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL %s DAY) "
            "ORDER BY cheque_date",
            (days,)
        )

    @staticmethod
    async def jumbo_rolls(status: Optional[str] = None) -> List[Dict]:
        where = "WHERE 1=1"
        args: Tuple = ()
        if status:
            where += " AND status = %s"
            args = (status,)
        return await query(
            f"SELECT name, supplier, received_date, status, batch_no, "
            f"  gsm, width_mm, length_mtr, liner_type "
            f"FROM `tabIB Jumbo Roll` {where} ORDER BY received_date DESC",
            args
        )
