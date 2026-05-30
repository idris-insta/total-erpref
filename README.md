# InstaBiz ERP — Unified Repository

> **Industrial-grade ERP for adhesive tape & BOPP film manufacturers.**
> Merged and enhanced from two source codebases: `ib-erp-main` (ERPNext/Frappe app) and `total-rep-cc-main` (FastAPI + React). All business logic is consolidated here.

---

## Architecture Overview

```
instabiz-erp-unified/
├── backend/                  FastAPI 0.110 · Python 3.11 · PostgreSQL 15
│   ├── api/v1/               Layered SQLAlchemy 2.0 routers (PostgreSQL-native)
│   ├── routes/               Legacy-compatible routers (MongoDB-style → PostgreSQL bridge)
│   ├── core/
│   │   ├── database.py       SQLAlchemy async engine, session factory
│   │   ├── legacy_db.py      MongoDB-API → PostgreSQL compatibility layer
│   │   └── config.py         Pydantic Settings (env-driven)
│   ├── models/               SQLAlchemy ORM models
│   ├── repositories/         Data access layer
│   ├── services/             Business logic services
│   ├── utils/
│   │   └── recalc.py         Physics Engine — KG ↔ SQM ↔ PCS calculations (ported from ib-erp JS)
│   └── server.py             FastAPI app entry point (fixed & unified)
├── frontend/                 React 19 · Vite · Tailwind CSS · Shadcn UI
│   └── src/
│       ├── pages/            35+ page components
│       ├── components/       Shared UI components
│       └── App.jsx           Route definitions
├── erpnext-plugin/           Original ERPNext/Frappe app (reference + migration source)
├── docker-compose.yml        PostgreSQL 15 + FastAPI + React/Nginx stack
└── .env.example              All required environment variables
```

---

## 6 Core Pillars (Business Logic)

| Pillar | Description |
|--------|-------------|
| **Physics Engine** | Dimensional KG ↔ SQM ↔ PCS conversions for every line item. Width (mm) × Length (m) → SQM → KG via thickness + density. Server-side via `utils/recalc.py`, exposed at `/api/core/physics` |
| **Production Redline** | 7% scrap threshold guard. Coating → Slitting → Rewinding → Cutting → Packing → Ready → Delivered (7-stage workflow). Director approval required when scrap > 7% |
| **CRM Buying DNA** | 8-stage pipeline: New Lead → Prospect → Enquiry → Negotiation → Finalization → Quotation → Converted → Regular Customer. AI-powered pattern analysis via Gemini |
| **Multi-Branch GST Ledger** | GSTR-1 / GSTR-3B / E-Invoice (IRN + QR Code) / E-Way Bill. Branch-wise P&L and GST separation |
| **Import Bridge** | Landed Cost Engine — CIF + Duty + Freight → MSP (15% margin) → RSP (25% margin). Per-KG and per-SQM rate conversion |
| **Director Cockpit** | Real-time command centre: revenue, scrap alerts, approval queue, AI insights via Gemini Flash |

---

## Module Map (M1–M8)

| # | Module | Key Routes | Status |
|---|--------|-----------|--------|
| M1 | **CRM & Sales** | `/api/crm`, `/api/v1/crm`, `/api/buying-dna`, `/api/customer-health`, `/api/lead-sales-team` | ✅ |
| M2 | **Inventory** | `/api/inventory`, `/api/inventory-advanced`, `/api/warehouse`, `/api/bulk-import` | ✅ |
| M3 | **Production** | `/api/production`, `/api/production-v2`, `/api/production-stages` | ✅ |
| M4 | **Procurement** | `/api/procurement`, `/api/imports` | ✅ |
| M5 | **Accounts & Finance** | `/api/accounts`, `/api/gst`, `/api/einvoice`, `/api/expenses` | ✅ |
| M6 | **HRMS & Payroll** | `/api/hrms`, `/api/hrms-enhanced`, `/api/payroll`, `/api/employee-vault`, `/api/sales-incentives` | ✅ |
| M7 | **Operations** | `/api/gatepass`, `/api/transport`, `/api/customer-assignment`, `/api/branding` | ✅ |
| M8 | **Director / AI** | `/api/director`, `/api/ai`, `/api/analytics`, `/api/collector`, `/api/core` | ✅ |

---

## Quick Start

### Prerequisites
- Docker 24+ and Docker Compose v2
- (Optional) Python 3.11 and Node 20 for local dev

### 1. Clone & configure

```bash
git clone <repo-url> instabiz-erp-unified
cd instabiz-erp-unified
cp .env.example .env
# Edit .env — set POSTGRES_PASSWORD and JWT_SECRET at minimum
```

### 2. Start all services

```bash
docker compose up -d
```

Services start on:
- **Frontend** → http://localhost (port 80)
- **Backend API** → http://localhost:8001/api
- **API Docs** → http://localhost:8001/docs
- **PostgreSQL** → localhost:5432

### 3. Seed default data

```bash
docker compose exec backend python seed_data.py
```

Default credentials:
- **Email:** `admin@instabiz.com`
- **Password:** `adminpassword`

---

## Local Development (without Docker)

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env         # and fill in values
uvicorn server:app --reload --port 8001
```

### Frontend

```bash
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

---

## API Reference

Full interactive docs at `/docs` (Swagger UI) and `/redoc`.

### Authentication

```bash
# Register
POST /api/auth/register
{ "email": "...", "password": "...", "name": "...", "role": "admin" }

# Login
POST /api/auth/login
{ "email": "...", "password": "..." }
# Returns: { "token": "...", "user": { ... } }

# Use token
Authorization: Bearer <token>
```

### Physics Engine

```bash
# Convert dimensions → KG / SQM
GET /api/core/physics?width_mm=48&length_mtr=50&thickness_micron=40&qty=100
```

### Key Endpoint Groups

| Group | Prefix |
|-------|--------|
| Auth | `/api/auth/` |
| CRM | `/api/crm/`, `/api/v1/crm/` |
| Inventory | `/api/inventory/`, `/api/warehouse/` |
| Production | `/api/production/`, `/api/production-stages/` |
| GST / E-Invoice | `/api/gst/`, `/api/einvoice/` |
| Transport & LR | `/api/transport/` |
| Sales Teams | `/api/lead-sales-team/` |
| Customer Board | `/api/customer-assignment/` |
| Branding | `/api/branding/` |
| AI Dashboard | `/api/ai/` |
| Director | `/api/director/` |

---

## Environment Variables

See `.env.example` for the full list. Minimum required for production:

| Variable | Description |
|----------|-------------|
| `POSTGRES_PASSWORD` | Strong database password |
| `JWT_SECRET` | 64-char random string for token signing |
| `GOOGLE_AI_API_KEY` | Gemini Flash — powers AI BI, Buying DNA, Smart Alerts |
| `EMERGENT_LLM_KEY` | EmergentIntegrations wrapper for Gemini |
| `EINVOICE_API_URL` | NIC E-Invoice API (sandbox or production) |

---

## Merged Features (ib-erp-main → Unified)

The following modules were ported from the original ERPNext app (`ib-erp-main`) as native FastAPI routes:

| Feature | Source DocType | New Route |
|---------|---------------|-----------|
| Daily Customer Board & Rollover | `run_daily_assignment()` scheduler | `POST /api/customer-assignment/rollover` |
| Salesperson Assignment Config | IB Assignment Config | `GET/POST /api/customer-assignment/configs` |
| Transporter Master | IB Transport | `GET/POST /api/transport/transporters` |
| Vehicle Fleet | IB Transport Vehicle | `GET/POST /api/transport/vehicles` |
| Lorry Receipt Tracking | IB LR Entry | `GET/POST /api/transport/lr-entries` |
| Company Branding / PDF Header | IB Branding | `GET/PUT /api/branding` |
| Logo & Stamp Upload | IB Branding (file upload) | `POST /api/branding/upload-logo` |
| Sales Team Hierarchy | Lead Sales Team | `GET/POST /api/lead-sales-team/teams` |
| Territory Matching | Lead Sales Team Territory | `GET /api/lead-sales-team/territory-match` |
| Physics Engine (Python port) | `public/js/recalc.js` | `utils/recalc.py` + `/api/core/physics` |

---

## Bug Fixes Applied

| Bug | Location | Fix |
|-----|----------|-----|
| Duplicate `/pdf` router prefix | `server.py` lines 227–228 | `pdf_all_modules` moved to `/api/pdf/v2` |
| MongoDB `$nin` in SQLAlchemy repository | `dashboard_overview` endpoint | Replaced with Python-side list filter |
| MongoDB `$ne` in SQLAlchemy repository | `dashboard_revenue_analytics` endpoint | Replaced with Python-side list comprehension |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI 0.110 · Python 3.11 · Pydantic v2 |
| Database | PostgreSQL 15 · SQLAlchemy 2.0 async · asyncpg |
| Auth | PyJWT · bcrypt |
| AI | Google Gemini Flash · EmergentIntegrations |
| PDF | ReportLab · qrcode · Pillow |
| Excel | xlsxwriter · openpyxl · pandas |
| Frontend | React 19 · Vite · Tailwind CSS · Shadcn UI |
| Real-time | WebSockets (FastAPI native) |
| Container | Docker Compose · Nginx |

---

## ERPNext Plugin (Reference)

The original ERPNext/Frappe app lives in `erpnext-plugin/`. It is **not run** by this stack — it exists as a reference for remaining business logic to be ported. Key files:

- `erpnext-plugin/instabiz/hooks.py` — scheduler events, DocType overrides
- `erpnext-plugin/instabiz/overrides/quotation.py` — Quotation → Sales Order logic

---

## Production Checklist

- [ ] Change `POSTGRES_PASSWORD` from default
- [ ] Generate a 64-char `JWT_SECRET`
- [ ] Set `DEBUG=false`
- [ ] Set `CORS_ORIGINS` to your actual domain(s)
- [ ] Configure `EINVOICE_API_URL` to production NIC endpoint
- [ ] Set up SSL termination in Nginx or a load balancer
- [ ] Point `AWS_S3_BUCKET` for persistent file storage (instead of `/tmp`)
- [ ] Remove seed test credentials from production database

---

*Built with FastAPI · PostgreSQL · React · Google Gemini · ERPNext heritage*
