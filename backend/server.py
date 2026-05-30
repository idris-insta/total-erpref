from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Import database components
from core.database import init_db, close_db, async_session_factory
from core.config import settings
from repositories.settings import user_repository

# Import legacy db compatibility layer for routes that still use MongoDB-like syntax
from core.legacy_db import db

# ── ERPNext integration bridge ──────────────────────────────────────────────
from core.erpnext_bridge import ping_erpnext, ERPNextCRM, ERPNextSales, ERPNextInventory, ERPNextCustom
from core.mariadb_db import init_mariadb, close_mariadb, MariaDBReads

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler"""
    # Startup — PostgreSQL (legacy) + MariaDB (ERPNext master)
    logger.info("Starting up — initializing PostgreSQL (legacy)...")
    await init_db()
    logger.info("Starting up — initializing MariaDB (ERPNext master)...")
    try:
        await init_mariadb()
        logger.info("MariaDB (ERPNext) pool ready")
    except Exception as e:
        logger.warning(f"MariaDB not available ({e}) — ERPNext bridge will be offline")
    yield
    # Shutdown
    logger.info("Shutting down — closing connections...")
    await close_db()
    await close_mariadb()


app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

JWT_SECRET = settings.JWT_SECRET
JWT_ALGORITHM = settings.JWT_ALGORITHM


class UserLogin(BaseModel):
    email: str
    password: str

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = "viewer"
    location: Optional[str] = None
    department: Optional[str] = None
    team: Optional[str] = None
    reports_to: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str

class TokenResponse(BaseModel):
    token: str
    user: UserResponse


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        user = await user_repository.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await user_repository.get_by_email(user_data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed_password = bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt())
    user_id = str(uuid.uuid4())
    user_doc = {
        'id': user_id,
        'email': user_data.email,
        'password': hashed_password.decode('utf-8'),
        'name': user_data.name,
        'role': user_data.role,
        'location': user_data.location,
        'department': user_data.department,
        'team': user_data.team,
        'reports_to': user_data.reports_to,
        'is_active': True
    }
    await user_repository.create(user_doc)
    
    token = jwt.encode({'user_id': user_id, 'exp': datetime.now(timezone.utc) + timedelta(days=7)}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return TokenResponse(
        token=token,
        user=UserResponse(id=user_id, email=user_data.email, name=user_data.name, role=user_data.role)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await user_repository.get_by_email(credentials.email)
    if not user or not bcrypt.checkpw(credentials.password.encode('utf-8'), user['password'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = jwt.encode({'user_id': user['id'], 'exp': datetime.now(timezone.utc) + timedelta(days=7)}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return TokenResponse(
        token=token,
        user=UserResponse(id=user['id'], email=user['email'], name=user['name'], role=user['role'])
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user['id'],
        email=current_user['email'],
        name=current_user['name'],
        role=current_user['role']
    )


# Import route modules - these will need to be updated to use PostgreSQL
from routes import crm, inventory, production, procurement, accounts, hrms, quality, dashboard, settings, customization, documents, master_data, permissions, approvals, reports
from routes import branches, gatepass, production_v2, expenses, payroll, employee_vault, sales_incentives, import_bridge, director_dashboard
from routes import gst_compliance, inventory_advanced, reports_analytics
from routes import hrms_enhanced, notifications
from routes import custom_fields
from routes import core_engine
from routes import ai_bi
from routes import chat, drive, bulk_import, einvoice
from routes import autonomous_collector
from routes import buying_dna, realtime_chat
from routes import customer_health
from routes import pdf_generator
from routes import pdf_all_modules
from routes import document_communication
# New ib-erp-main ported routes
from routes import customer_assignment, transport, branding, lead_sales_team
from routes import field_registry
from routes import warehouse_stock
from routes import production_stages

# Import v1 API routes (Layered Architecture - PostgreSQL)
from api.v1.crm import router as crm_v1_router
from api.v1.inventory import router as inventory_v1_router
from api.v1.production import router as production_v1_router
from api.v1.accounts import router as accounts_v1_router
from api.v1.hrms import router as hrms_v1_router
from api.v1.procurement import router as procurement_v1_router
from api.v1.quality import router as quality_v1_router
from api.v1.sales_incentives import router as sales_incentives_v1_router
from api.v1.settings import router as settings_v1_router

# Include legacy routes (will be migrated to PostgreSQL incrementally)
api_router.include_router(crm.router, prefix="/crm", tags=["CRM"])
api_router.include_router(crm_v1_router, prefix="/v1", tags=["CRM v1 - PostgreSQL"])
api_router.include_router(inventory_v1_router, prefix="/v1", tags=["Inventory v1 - PostgreSQL"])
api_router.include_router(production_v1_router, prefix="/v1", tags=["Production v1 - PostgreSQL"])
api_router.include_router(accounts_v1_router, prefix="/v1", tags=["Accounts v1 - PostgreSQL"])
api_router.include_router(hrms_v1_router, prefix="/v1", tags=["HRMS v1 - PostgreSQL"])
api_router.include_router(procurement_v1_router, prefix="/v1", tags=["Procurement v1 - PostgreSQL"])
api_router.include_router(quality_v1_router, prefix="/v1", tags=["Quality v1 - PostgreSQL"])
api_router.include_router(sales_incentives_v1_router, prefix="/v1", tags=["Sales Incentives v1 - PostgreSQL"])
api_router.include_router(settings_v1_router, prefix="/v1", tags=["Settings v1 - PostgreSQL"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["Inventory"])
api_router.include_router(production.router, prefix="/production", tags=["Production"])
api_router.include_router(procurement.router, prefix="/procurement", tags=["Procurement"])
api_router.include_router(accounts.router, prefix="/accounts", tags=["Accounts"])
api_router.include_router(hrms.router, prefix="/hrms", tags=["HRMS"])
api_router.include_router(quality.router, prefix="/quality", tags=["Quality"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
api_router.include_router(settings.router, prefix="/settings", tags=["Settings"])
api_router.include_router(customization.router, prefix="/customization", tags=["Customization"])
api_router.include_router(documents.router, prefix="/documents", tags=["Documents"])
api_router.include_router(master_data.router, prefix="/master-data", tags=["Master Data"])
api_router.include_router(permissions.router, prefix="/permissions", tags=["Permissions"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["Approvals"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])

api_router.include_router(branches.router, prefix="/branches", tags=["Branches"])
api_router.include_router(gatepass.router, prefix="/gatepass", tags=["Gatepass"])
api_router.include_router(production_v2.router, prefix="/production-v2", tags=["Production V2 - Coating & Converting"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
api_router.include_router(payroll.router, prefix="/payroll", tags=["Payroll"])
api_router.include_router(employee_vault.router, prefix="/employee-vault", tags=["Employee Vault"])
api_router.include_router(sales_incentives.router, prefix="/sales-incentives", tags=["Sales Incentives"])
api_router.include_router(import_bridge.router, prefix="/imports", tags=["Import Bridge"])
api_router.include_router(director_dashboard.router, prefix="/director", tags=["Director Command Center"])

api_router.include_router(gst_compliance.router, prefix="/gst", tags=["GST Compliance"])
api_router.include_router(inventory_advanced.router, prefix="/inventory-advanced", tags=["Advanced Inventory"])
api_router.include_router(reports_analytics.router, prefix="/analytics", tags=["Reports & Analytics"])
api_router.include_router(hrms_enhanced.router, prefix="/hrms-enhanced", tags=["HRMS Enhanced"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(custom_fields.router, prefix="/custom-fields", tags=["Custom Fields"])
api_router.include_router(core_engine.router, prefix="/core", tags=["Core Engine"])
api_router.include_router(ai_bi.router, prefix="/ai", tags=["AI Business Intelligence"])

api_router.include_router(chat.router, prefix="/chat", tags=["Internal Chat"])
api_router.include_router(drive.router, prefix="/drive", tags=["Drive Storage"])
api_router.include_router(bulk_import.router, prefix="/bulk-import", tags=["Bulk Import"])
api_router.include_router(einvoice.router, prefix="/einvoice", tags=["GST E-Invoice & E-Way Bill"])
api_router.include_router(autonomous_collector.router, prefix="/collector", tags=["Autonomous Collector"])
api_router.include_router(buying_dna.router, prefix="/buying-dna", tags=["Buying DNA Sales Hunter"])
api_router.include_router(realtime_chat.router, prefix="/realtime-chat", tags=["Real-time Chat"])
api_router.include_router(customer_health.router, prefix="/customer-health", tags=["Customer Health Score"])
api_router.include_router(pdf_generator.router, prefix="/pdf", tags=["PDF Generator"])
# FIX: pdf_all_modules had same /pdf prefix as pdf_generator — moved to /pdf/v2 to avoid route conflicts
api_router.include_router(pdf_all_modules.router, prefix="/pdf/v2", tags=["PDF All Modules"])
# New ib-erp-main ported routes
api_router.include_router(customer_assignment.router, prefix="/customer-assignment", tags=["Customer Assignment"])
api_router.include_router(transport.router, prefix="/transport", tags=["Transport & LR"])
api_router.include_router(branding.router, prefix="/branding", tags=["Branding"])
api_router.include_router(lead_sales_team.router, prefix="/lead-sales-team", tags=["Lead Sales Team"])
api_router.include_router(document_communication.router, prefix="/communicate", tags=["Document Communication"])
api_router.include_router(field_registry.router, prefix="/field-registry", tags=["Field Registry - Command Center"])
api_router.include_router(warehouse_stock.router, prefix="/warehouse", tags=["Warehouse & Stock Management"])
api_router.include_router(production_stages.router, prefix="/production-stages", tags=["Production Stages - 7 Stage Workflow"])

# ==================== DASHBOARD OVERVIEW ====================
@api_router.get("/dashboard/overview")
async def dashboard_overview(current_user: dict = Depends(get_current_user)):
    """Get executive dashboard overview"""
    from repositories.accounts import invoice_repository
    from repositories.crm import account_repository, lead_repository
    from repositories.production import work_order_repository
    from repositories.inventory import item_repository
    
    today = datetime.now()
    month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get counts
    invoices = await invoice_repository.get_all({'invoice_type': 'Sales'})
    customers = await account_repository.count()
    work_orders = await work_order_repository.count()
    items_low_stock = len(await item_repository.get_low_stock(10))

    # FIX: filter in Python — avoid MongoDB $nin in SQLAlchemy repositories
    total_revenue = sum(inv.get("total_amount", 0) for inv in invoices if inv.get("status") not in ["cancelled", "draft"])
    month_invoices = [inv for inv in invoices if inv.get("created_at", "").startswith(month_start.strftime("%Y-%m"))]
    monthly_revenue = sum(inv.get("total_amount", 0) for inv in month_invoices)

    # FIX: was lead_repository.count({'status': {'$nin': [...]}}) — MongoDB operator not valid in SQLAlchemy layer
    all_leads = await db.leads.find({}).to_list(10000)
    active_leads = sum(1 for lead in all_leads if lead.get("status") not in ["won", "lost", "closed"])
    
    return {
        "total_revenue": total_revenue,
        "monthly_revenue": monthly_revenue,
        "active_leads": active_leads,
        "total_customers": customers,
        "work_orders": work_orders,
        "low_stock_items": items_low_stock,
        "pending_approvals": 0,
        "month_growth": 12.5
    }

@api_router.get("/dashboard/revenue-analytics")
async def dashboard_revenue_analytics(period: str = "month", current_user: dict = Depends(get_current_user)):
    """Get revenue analytics for dashboard"""
    from repositories.accounts import invoice_repository
    
    # FIX: was {'status': {'$ne': 'cancelled'}} — MongoDB $ne not valid in SQLAlchemy repositories; filter in Python
    invoices_raw = await invoice_repository.get_all({'invoice_type': 'Sales'})
    invoices = [inv for inv in invoices_raw if inv.get("status") != "cancelled"]
    
    # Group by month
    monthly_data = {}
    for inv in invoices:  # already filtered — no cancelled invoices
        date_str = str(inv.get("invoice_date", inv.get("created_at", "")))[:7]
        if date_str:
            if date_str not in monthly_data:
                monthly_data[date_str] = {"revenue": 0, "count": 0}
            monthly_data[date_str]["revenue"] += inv.get("total_amount", 0)
            monthly_data[date_str]["count"] += 1
    
    chart_data = [{"month": k, "revenue": v["revenue"], "invoices": v["count"]} for k, v in sorted(monthly_data.items())[-6:]]
    return {"chart_data": chart_data, "period": period}

@api_router.get("/dashboard/ai-insights")
async def dashboard_ai_insights(current_user: dict = Depends(get_current_user)):
    """Get AI-generated insights for dashboard"""
    return {
        "insights": [
            {"type": "trend", "title": "Revenue Growth", "description": "Revenue has grown 12.5% compared to last month", "priority": "positive"},
            {"type": "alert", "title": "Low Stock Alert", "description": "5 items are below reorder level", "priority": "warning"},
            {"type": "opportunity", "title": "Top Customer", "description": "Customer ABC Corp has increased orders by 25%", "priority": "info"}
        ]
    }

@api_router.get("/health")
async def health_check():
    """Liveness probe for Docker / load balancers"""
    erp_status = await ping_erpnext()
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "erpnext": erp_status.get("status", "unknown"),
    }

@api_router.get("/erp/health")
async def erpnext_health():
    """Detailed ERPNext connectivity check."""
    return await ping_erpnext()

@api_router.get("/erp/dashboard")
async def erpnext_dashboard(current_user: dict = Depends(get_current_user)):
    """
    Unified dashboard pulling live data directly from ERPNext MariaDB.
    Replaces dashboard_overview which had broken MongoDB $nin/$ne queries.
    """
    from datetime import date
    month = date.today().strftime("%Y-%m")
    try:
        active_leads, customers, monthly_rev, total_rev, low_stock, pending_approvals, lead_funnel, revenue_trend = \
            await __import__('asyncio').gather(
                MariaDBReads.count_active_leads(),
                MariaDBReads.count_customers(),
                MariaDBReads.monthly_revenue(month),
                MariaDBReads.total_revenue(),
                MariaDBReads.count_low_stock_items(),
                MariaDBReads.count_pending_approvals(),
                MariaDBReads.lead_funnel(),
                MariaDBReads.revenue_by_month(6),
            )
        return {
            "source": "erpnext_mariadb",
            "active_leads":      active_leads,
            "total_customers":   customers,
            "monthly_revenue":   float(monthly_rev or 0),
            "total_revenue":     float(total_rev or 0),
            "low_stock_items":   low_stock,
            "pending_approvals": pending_approvals,
            "lead_funnel":       lead_funnel,
            "revenue_trend":     revenue_trend,
        }
    except Exception as e:
        logger.warning(f"ERPNext MariaDB dashboard failed ({e}) — returning empty")
        return {"source": "unavailable", "error": str(e)}

@api_router.get("/erp/leads")
async def erp_leads(status: Optional[str] = None, limit: int = 200, current_user: dict = Depends(get_current_user)):
    """Live leads from ERPNext via REST API."""
    filters = [["custom_status", "=", status]] if status else None
    return {"leads": await ERPNextCRM.get_leads(filters=filters, limit=limit)}

@api_router.get("/erp/customers")
async def erp_customers(limit: int = 500, current_user: dict = Depends(get_current_user)):
    return {"customers": await ERPNextCRM.get_customers(limit=limit)}

@api_router.get("/erp/sales-orders")
async def erp_sales_orders(status: Optional[str] = None, limit: int = 200, current_user: dict = Depends(get_current_user)):
    filters = [["status", "=", status]] if status else None
    return {"sales_orders": await ERPNextSales.get_sales_orders(filters=filters, limit=limit)}

@api_router.get("/erp/invoices")
async def erp_invoices(status: Optional[str] = None, limit: int = 200, current_user: dict = Depends(get_current_user)):
    filters = [["status", "=", status]] if status else None
    return {"invoices": await ERPNextSales.get_sales_invoices(filters=filters, limit=limit)}

@api_router.get("/erp/stock")
async def erp_stock(warehouse: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    data = await MariaDBReads.stock_summary(warehouse=warehouse)
    return {"stock": data, "count": len(data)}

@api_router.get("/erp/low-stock")
async def erp_low_stock(current_user: dict = Depends(get_current_user)):
    data = await MariaDBReads.low_stock_items()
    return {"low_stock": data, "count": len(data)}

@api_router.get("/erp/top-customers")
async def erp_top_customers(limit: int = 10, current_user: dict = Depends(get_current_user)):
    return {"top_customers": await MariaDBReads.top_customers(limit=limit)}

@api_router.get("/erp/revenue-by-month")
async def erp_revenue_by_month(months: int = 6, current_user: dict = Depends(get_current_user)):
    return {"revenue_trend": await MariaDBReads.revenue_by_month(months=months)}

@api_router.get("/erp/customer-board")
async def erp_customer_board(date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    from datetime import date as dt
    target_date = date or dt.today().isoformat()
    data = await MariaDBReads.customer_board(target_date)
    return {"assignments": data, "date": target_date, "count": len(data)}

@api_router.get("/erp/pdc-due")
async def erp_pdc_due(days: int = 7, current_user: dict = Depends(get_current_user)):
    data = await MariaDBReads.pdc_due_soon(days=days)
    return {"pdc_list": data, "count": len(data)}

@api_router.get("/erp/health-scores")
async def erp_health_scores(current_user: dict = Depends(get_current_user)):
    data = await MariaDBReads.customer_health_scores()
    return {"health_scores": data, "count": len(data)}

@api_router.get("/erp/jumbo-rolls")
async def erp_jumbo_rolls(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    data = await MariaDBReads.jumbo_rolls(status=status)
    return {"jumbo_rolls": data, "count": len(data)}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
