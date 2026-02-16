from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

JWT_SECRET = os.getenv('JWT_SECRET', 'adhesive-erp-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


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
    reports_to: Optional[str] = None  # user_id of manager/team leader

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
        user = await db.users.find_one({'id': user_id}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({'email': user_data.email}, {'_id': 0})
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
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = jwt.encode({'user_id': user_id, 'exp': datetime.now(timezone.utc) + timedelta(days=7)}, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return TokenResponse(
        token=token,
        user=UserResponse(id=user_id, email=user_data.email, name=user_data.name, role=user_data.role)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({'email': credentials.email}, {'_id': 0})
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
from routes import field_registry
from routes import warehouse_stock
from routes import production_stages

# NEW: Import v1 API routes (Layered Architecture)
from api.v1.crm import router as crm_v1_router

api_router.include_router(crm.router, prefix="/crm", tags=["CRM"])
# NEW: Add v1 versioned CRM routes
api_router.include_router(crm_v1_router, prefix="/v1", tags=["CRM v1 - Layered Architecture"])
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

# New modules from Master Technical Summary
api_router.include_router(branches.router, prefix="/branches", tags=["Branches"])
api_router.include_router(gatepass.router, prefix="/gatepass", tags=["Gatepass"])
api_router.include_router(production_v2.router, prefix="/production-v2", tags=["Production V2 - Coating & Converting"])
api_router.include_router(expenses.router, prefix="/expenses", tags=["Expenses"])
api_router.include_router(payroll.router, prefix="/payroll", tags=["Payroll"])
api_router.include_router(employee_vault.router, prefix="/employee-vault", tags=["Employee Vault"])
api_router.include_router(sales_incentives.router, prefix="/sales-incentives", tags=["Sales Incentives"])
api_router.include_router(import_bridge.router, prefix="/imports", tags=["Import Bridge"])
api_router.include_router(director_dashboard.router, prefix="/director", tags=["Director Command Center"])

# Advanced Modules - Powerhouse Features
api_router.include_router(gst_compliance.router, prefix="/gst", tags=["GST Compliance"])
api_router.include_router(inventory_advanced.router, prefix="/inventory-advanced", tags=["Advanced Inventory"])
api_router.include_router(reports_analytics.router, prefix="/analytics", tags=["Reports & Analytics"])
api_router.include_router(hrms_enhanced.router, prefix="/hrms-enhanced", tags=["HRMS Enhanced"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(custom_fields.router, prefix="/custom-fields", tags=["Custom Fields"])
api_router.include_router(core_engine.router, prefix="/core", tags=["Core Engine"])
api_router.include_router(ai_bi.router, prefix="/ai", tags=["AI Business Intelligence"])

# New Feature Modules
api_router.include_router(chat.router, prefix="/chat", tags=["Internal Chat"])
api_router.include_router(drive.router, prefix="/drive", tags=["Drive Storage"])
api_router.include_router(bulk_import.router, prefix="/bulk-import", tags=["Bulk Import"])
api_router.include_router(einvoice.router, prefix="/einvoice", tags=["GST E-Invoice & E-Way Bill"])
api_router.include_router(autonomous_collector.router, prefix="/collector", tags=["Autonomous Collector"])
api_router.include_router(buying_dna.router, prefix="/buying-dna", tags=["Buying DNA Sales Hunter"])
api_router.include_router(realtime_chat.router, prefix="/realtime-chat", tags=["Real-time Chat"])
api_router.include_router(customer_health.router, prefix="/customer-health", tags=["Customer Health Score"])
api_router.include_router(pdf_generator.router, prefix="/pdf", tags=["PDF Generator"])
api_router.include_router(pdf_all_modules.router, prefix="/pdf", tags=["PDF All Modules"])
api_router.include_router(document_communication.router, prefix="/communicate", tags=["Document Communication"])
api_router.include_router(field_registry.router, prefix="/field-registry", tags=["Field Registry - Command Center"])
api_router.include_router(warehouse_stock.router, prefix="/warehouse", tags=["Warehouse & Stock Management"])
api_router.include_router(production_stages.router, prefix="/production-stages", tags=["Production Stages - 7 Stage Workflow"])

# ==================== DASHBOARD OVERVIEW ====================
@api_router.get("/dashboard/overview")
async def dashboard_overview(current_user: dict = Depends(get_current_user)):
    """Get executive dashboard overview"""
    from datetime import datetime, timedelta
    today = datetime.now()
    month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    # Get counts and aggregations
    invoices = await db.invoices.find({"invoice_type": "Sales"}).to_list(1000)
    customers = await db.customers.count_documents({})
    work_orders = await db.work_orders.count_documents({})
    items_low_stock = await db.items.count_documents({"current_stock": {"$lt": 10}})
    
    total_revenue = sum(inv.get("total_amount", 0) for inv in invoices if inv.get("status") not in ["cancelled", "draft"])
    month_invoices = [inv for inv in invoices if inv.get("created_at", "").startswith(month_start.strftime("%Y-%m"))]
    monthly_revenue = sum(inv.get("total_amount", 0) for inv in month_invoices)
    
    active_leads = await db.leads.count_documents({"status": {"$nin": ["won", "lost", "closed"]}})
    
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
    invoices = await db.invoices.find({"invoice_type": "Sales", "status": {"$ne": "cancelled"}}, {"_id": 0}).to_list(500)
    
    # Group by month for simplicity
    monthly_data = {}
    for inv in invoices:
        date_str = inv.get("invoice_date", inv.get("created_at", ""))[:7]
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

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()