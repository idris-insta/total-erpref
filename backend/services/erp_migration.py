"""
PostgreSQL → ERPNext Data Migration Service
============================================
Migrates data from the legacy PostgreSQL (instabiz-erp-unified) database
into the live ERPNext MariaDB (instabiz-develop, site: frontend).

All writes go through the ERPNext REST API so every Frappe hook fires:
  - validate(), before_insert(), after_insert()
  - Naming series (IB-{LOC}-Q-#####, etc.)
  - GL entries, stock ledger entries
  - E-invoice / E-waybill triggers
  - Notification Logs, ToDo entries

Usage (from bench root):
  # Dry run — preview what will be migrated
  python backend/services/erp_migration.py --dry-run

  # Migrate specific collection
  python backend/services/erp_migration.py --collection leads

  # Migrate everything
  python backend/services/erp_migration.py --all

IMPORTANT: Run AFTER setting env vars ERPNEXT_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET.
"""

import asyncio
import os
import sys
import argparse
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

# Allow running from project root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from core.erpnext_bridge import create_doc, get_list, erp_get
from core.legacy_db import db   # PostgreSQL source

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("erp_migration")


# ─── Field mapping: PostgreSQL schema → ERPNext DocType fields ─────────────────

def map_lead(pg: Dict) -> Optional[Dict]:
    """
    Map a PostgreSQL lead record → ERPNext Lead fields.
    Only include fields that exist in ERPNext Lead (core + custom_* from instabiz fixtures).
    """
    if not pg.get("name") and not pg.get("lead_name") and not pg.get("customer_name"):
        return None
    return {
        "lead_name":                  pg.get("lead_name") or pg.get("customer_name") or pg.get("name", "Unknown"),
        "email_id":                   pg.get("email") or pg.get("email_id", ""),
        "mobile_no":                  pg.get("phone") or pg.get("mobile_no", ""),
        "status":                     _map_lead_status(pg.get("status", "Lead")),
        "custom_status":              pg.get("status") or "New",
        "source":                     pg.get("source", ""),
        "territory":                  pg.get("territory", ""),
        "lead_owner":                 pg.get("assigned_to") or pg.get("lead_owner", ""),
        "custom_sales_person_user":   pg.get("assigned_to") or "",
        "custom_pincode":             pg.get("pincode", ""),
        "custom_district":            pg.get("district", ""),
        "city":                       pg.get("city", ""),
        "state":                      pg.get("state", ""),
        "notes":                      pg.get("notes", ""),
    }


def _map_lead_status(pg_status: str) -> str:
    """Map custom pipeline statuses to ERPNext Lead.status values."""
    mapping = {
        "new":          "Lead",
        "contacted":    "Open",
        "warm":         "Open",
        "hot":          "Open",
        "prospect":     "Open",
        "enquiry":      "Interested",
        "negotiation":  "Interested",
        "finalization": "Interested",
        "quotation":    "Interested",
        "converted":    "Converted",
        "lost":         "Do Not Contact",
        "won":          "Converted",
    }
    return mapping.get((pg_status or "").lower(), "Lead")


def map_customer(pg: Dict) -> Optional[Dict]:
    """Map PostgreSQL customer → ERPNext Customer."""
    name = pg.get("customer_name") or pg.get("name")
    if not name:
        return None
    return {
        "customer_name":  name,
        "customer_type":  pg.get("customer_type", "Company"),
        "customer_group": pg.get("customer_group", "Commercial"),
        "territory":      pg.get("territory", "India"),
    }


def map_item(pg: Dict) -> Optional[Dict]:
    """Map PostgreSQL item/product → ERPNext Item."""
    code = pg.get("item_code") or pg.get("name")
    if not code:
        return None
    return {
        "item_code":            code,
        "item_name":            pg.get("item_name") or code,
        "item_group":           pg.get("item_group", "All Item Groups"),
        "stock_uom":            pg.get("uom") or pg.get("stock_uom", "Nos"),
        "is_stock_item":        1,
        "custom_rolls_per_box": pg.get("pcs_per_box") or 24,
    }


def map_ib_customer_assignment(pg: Dict) -> Optional[Dict]:
    """Map PostgreSQL customer_assignment → ERPNext IB Customer Assignment."""
    customer = pg.get("customer_id") or pg.get("customer_name") or pg.get("customer")
    if not customer:
        return None
    return {
        "customer":      customer,
        "assigned_to":   pg.get("salesperson_user") or pg.get("assigned_to_user", ""),
        "assigned_date": pg.get("assigned_date") or datetime.today().strftime("%Y-%m-%d"),
        "status":        _map_assignment_status(pg.get("status", "Pending")),
        "source_pool":   pg.get("visit_type") or "Regular",
        "notes":         pg.get("notes", ""),
    }


def _map_assignment_status(status: str) -> str:
    mapping = {
        "pending": "Pending",
        "done":    "Contacted",
        "rolled":  "Rolled Over",
    }
    return mapping.get((status or "").lower(), "Pending")


def map_ib_branding(pg: Dict) -> Optional[Dict]:
    return {
        "company_name":         pg.get("company_name", "InstaBiz"),
        "tagline":              pg.get("tagline", ""),
        "primary_color":        pg.get("primary_color", "#d97757"),
        "authorized_signatory": pg.get("authorized_signatory", ""),
        "gstin":                pg.get("gstin", ""),
        "address_line1":        pg.get("address_line1", ""),
        "city":                 pg.get("city", ""),
        "state":                pg.get("state", ""),
        "phone":                pg.get("phone", ""),
        "email":                pg.get("email", ""),
        "website":              pg.get("website", ""),
    }


def map_ib_transport(pg: Dict) -> Optional[Dict]:
    name = pg.get("name")
    if not name:
        return None
    return {
        "transporter_name": name,
        "gstin":            pg.get("gstin", ""),
        "phone":            pg.get("phone", ""),
        "city":             pg.get("city", ""),
        "state":            pg.get("state", ""),
    }


# ─── Migration runners ─────────────────────────────────────────────────────────

class MigrationResult:
    def __init__(self, collection: str):
        self.collection = collection
        self.total = 0
        self.created = 0
        self.skipped = 0
        self.errors: List[str] = []

    def summary(self) -> str:
        return (
            f"[{self.collection}] total={self.total} "
            f"created={self.created} skipped={self.skipped} errors={len(self.errors)}"
        )


async def _already_exists(doctype: str, field: str, value: str) -> bool:
    """Check if a doc already exists in ERPNext to avoid duplicates."""
    try:
        rows = await get_list(doctype, filters=[[field, "=", value]], fields=["name"], limit_page_length=1)
        return len(rows) > 0
    except Exception:
        return False


async def migrate_leads(dry_run: bool = False) -> MigrationResult:
    result = MigrationResult("leads")
    records = await db.leads.find({}).to_list(10000)
    result.total = len(records)
    log.info(f"Migrating {result.total} leads...")

    for rec in records:
        mapped = map_lead(rec)
        if not mapped:
            result.skipped += 1
            continue

        email = mapped.get("email_id", "")
        mobile = mapped.get("mobile_no", "")

        # Dedup check — skip if lead with same email already exists
        if email and await _already_exists("Lead", "email_id", email):
            log.debug(f"  SKIP lead {email} — already in ERPNext")
            result.skipped += 1
            continue

        if dry_run:
            log.info(f"  DRY-RUN: would create Lead → {mapped['lead_name']} <{email}>")
            result.created += 1
        else:
            try:
                doc = await create_doc("Lead", mapped)
                log.info(f"  CREATED Lead: {doc.get('name')} → {mapped['lead_name']}")
                result.created += 1
            except Exception as e:
                err = f"Lead {mapped['lead_name']}: {e}"
                log.error(f"  ERROR: {err}")
                result.errors.append(err)

    return result


async def migrate_customers(dry_run: bool = False) -> MigrationResult:
    result = MigrationResult("customers")
    # Try multiple possible collection names
    records = await db.customers.find({}).to_list(10000)
    if not records:
        records = await db.accounts.find({}).to_list(10000)
    result.total = len(records)
    log.info(f"Migrating {result.total} customers...")

    for rec in records:
        mapped = map_customer(rec)
        if not mapped:
            result.skipped += 1
            continue

        name = mapped["customer_name"]
        if await _already_exists("Customer", "customer_name", name):
            log.debug(f"  SKIP Customer {name} — already exists")
            result.skipped += 1
            continue

        if dry_run:
            log.info(f"  DRY-RUN: would create Customer → {name}")
            result.created += 1
        else:
            try:
                doc = await create_doc("Customer", mapped)
                log.info(f"  CREATED Customer: {doc.get('name')}")
                result.created += 1
            except Exception as e:
                err = f"Customer {name}: {e}"
                log.error(f"  ERROR: {err}")
                result.errors.append(err)

    return result


async def migrate_customer_assignments(dry_run: bool = False) -> MigrationResult:
    result = MigrationResult("customer_assignments")
    records = await db.customer_assignments.find({}).to_list(10000)
    result.total = len(records)
    log.info(f"Migrating {result.total} customer assignments...")

    for rec in records:
        mapped = map_ib_customer_assignment(rec)
        if not mapped:
            result.skipped += 1
            continue

        if dry_run:
            log.info(f"  DRY-RUN: would create IB Customer Assignment → {mapped['customer']} on {mapped['assigned_date']}")
            result.created += 1
        else:
            try:
                doc = await create_doc("IB Customer Assignment", mapped)
                log.info(f"  CREATED IB Customer Assignment: {doc.get('name')}")
                result.created += 1
            except Exception as e:
                err = f"Assignment {mapped.get('customer')}: {e}"
                log.error(f"  ERROR: {err}")
                result.errors.append(err)

    return result


async def migrate_branding(dry_run: bool = False) -> MigrationResult:
    result = MigrationResult("branding")
    records = await db.ib_branding.find({"is_active": True}).to_list(1)
    result.total = len(records)

    if not records:
        log.info("No branding config in PostgreSQL to migrate.")
        return result

    mapped = map_ib_branding(records[0])
    existing = await get_list("IB Branding", fields=["name"], limit_page_length=1)

    if existing:
        log.info("IB Branding already exists in ERPNext — skipping.")
        result.skipped = 1
        return result

    if dry_run:
        log.info(f"  DRY-RUN: would create IB Branding → {mapped['company_name']}")
        result.created = 1
    else:
        try:
            doc = await create_doc("IB Branding", mapped)
            log.info(f"  CREATED IB Branding: {doc.get('name')}")
            result.created = 1
        except Exception as e:
            result.errors.append(str(e))
            log.error(f"  ERROR: {e}")

    return result


async def migrate_transporters(dry_run: bool = False) -> MigrationResult:
    result = MigrationResult("transporters")
    records = await db.transporters.find({}).to_list(1000)
    result.total = len(records)
    log.info(f"Migrating {result.total} transporters...")

    for rec in records:
        mapped = map_ib_transport(rec)
        if not mapped:
            result.skipped += 1
            continue

        name = mapped["transporter_name"]
        if await _already_exists("IB Transport", "transporter_name", name):
            result.skipped += 1
            continue

        if dry_run:
            log.info(f"  DRY-RUN: would create IB Transport → {name}")
            result.created += 1
        else:
            try:
                doc = await create_doc("IB Transport", mapped)
                log.info(f"  CREATED IB Transport: {doc.get('name')}")
                result.created += 1
            except Exception as e:
                err = f"Transport {name}: {e}"
                log.error(f"  ERROR: {err}")
                result.errors.append(err)

    return result


# ─── Master runner ─────────────────────────────────────────────────────────────

MIGRATIONS = {
    "leads":                migrate_leads,
    "customers":            migrate_customers,
    "customer_assignments": migrate_customer_assignments,
    "branding":             migrate_branding,
    "transporters":         migrate_transporters,
}


async def run_migration(collections: List[str], dry_run: bool = False):
    log.info("=" * 60)
    log.info(f"ERPNext Migration — {'DRY RUN' if dry_run else 'LIVE'}")
    log.info(f"Target: {os.environ.get('ERPNEXT_URL', 'http://localhost:8000')}")
    log.info("=" * 60)

    # Verify ERPNext is reachable
    from core.erpnext_bridge import ping_erpnext
    ping = await ping_erpnext()
    if ping.get("status") != "ok":
        log.error(f"ERPNext unreachable: {ping}")
        return

    log.info(f"ERPNext reachable. Versions: {ping.get('versions', {})}")
    log.info("")

    results = []
    for name in collections:
        fn = MIGRATIONS.get(name)
        if not fn:
            log.warning(f"Unknown collection: {name} — skipping")
            continue
        result = await fn(dry_run=dry_run)
        results.append(result)
        log.info(result.summary())
        log.info("")

    log.info("=" * 60)
    log.info("MIGRATION COMPLETE")
    total_created = sum(r.created for r in results)
    total_errors  = sum(len(r.errors) for r in results)
    log.info(f"Total created: {total_created}   Total errors: {total_errors}")
    if total_errors:
        log.warning("Review errors above and re-run failed collections individually.")
    log.info("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Migrate PostgreSQL data to ERPNext")
    parser.add_argument("--all",        action="store_true", help="Migrate all collections")
    parser.add_argument("--collection", help="Migrate one collection (leads|customers|customer_assignments|branding|transporters)")
    parser.add_argument("--dry-run",    action="store_true", help="Preview without writing")
    args = parser.parse_args()

    if args.all:
        to_run = list(MIGRATIONS.keys())
    elif args.collection:
        to_run = [args.collection]
    else:
        parser.print_help()
        sys.exit(1)

    asyncio.run(run_migration(to_run, dry_run=args.dry_run))
