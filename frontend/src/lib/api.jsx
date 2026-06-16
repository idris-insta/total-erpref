/**
 * api.jsx — Frappe REST adapter for instabiz-erp-unified
 *
 * Frappe API patterns:
 *   Auth login  : POST /api/method/login            {usr, pwd}
 *   Auth check  : GET  /api/method/frappe.auth.get_logged_user
 *   List docs   : GET  /api/resource/{DocType}      ?fields=[...]&filters=[...]&limit=N
 *   Single doc  : GET  /api/resource/{DocType}/{name}
 *   Create doc  : POST /api/resource/{DocType}
 *   Update doc  : PUT  /api/resource/{DocType}/{name}
 *   Delete doc  : DELETE /api/resource/{DocType}/{name}
 *   Whitelist   : POST /api/method/{app}.{module}.{fn}
 *
 * instabiz custom whitelisted methods (instabiz-develop):
 *   instabiz.instabiz.page.ib_production_board.ib_production_board.get_board_data
 *   instabiz.overrides.production_stage.*
 *
 * Set DEMO_MODE=false + correct VITE_BACKEND_URL to go live.
 */

import axios from 'axios';
import {
  MOCK_USER, MOCK_CUSTOMERS, MOCK_SALES_ORDERS, MOCK_ITEMS,
  MOCK_MACHINES, MOCK_STAGES, MOCK_DASHBOARD_OVERVIEW, MOCK_REVENUE_ANALYTICS,
  MOCK_LEADS, MOCK_EMPLOYEES, MOCK_ACCOUNTS, MOCK_INVENTORY,
} from './mockData';

// ── CONFIG ────────────────────────────────────────────────────────────────────
// DEMO_MODE: env-driven. Set VITE_DEMO_MODE=false in .env to go live against Frappe.
const DEMO_MODE = (import.meta.env.VITE_DEMO_MODE ?? 'true') !== 'false';
const FRAPPE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://172.30.52.244:8000');
// When live, fall back to mock data if a Frappe endpoint is missing/unreachable
const MOCK_FALLBACK = (import.meta.env.VITE_MOCK_FALLBACK ?? 'true') !== 'false';
// ─────────────────────────────────────────────────────────────────────────────

// ── FRAPPE AXIOS INSTANCE ─────────────────────────────────────────────────────
const frappeAxios = axios.create({
  baseURL: FRAPPE_URL,
  withCredentials: true,   // Frappe uses cookie-based sessions (sid)
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
});

frappeAxios.interceptors.request.use((config) => {
  // Frappe token auth (fallback to cookie)
  const token = localStorage.getItem('frappe_token');
  const secret = localStorage.getItem('frappe_secret');
  if (token && secret) {
    config.headers['Authorization'] = `token ${token}:${secret}`;
  }
  return config;
});

frappeAxios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 403 || err.response?.status === 401) {
      localStorage.removeItem('frappe_token');
      localStorage.removeItem('frappe_secret');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── FASTAPI AXIOS INSTANCE (native backend) ──────────────────────────────────
// The React pages call the original FastAPI contract paths (/auth/login,
// /crm/leads, /dashboard, …). The backend serves them under an /api prefix.
const TOKEN_KEY = 'ib_token';
const apiAxios = axios.create({
  baseURL: FRAPPE_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});
apiAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});
apiAxios.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      if (!window.location.pathname.includes('/login')) window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Normalise a page URL to the backend's /api/... namespace.
const apiPath = (url) => (url.startsWith('/api/') ? url : '/api' + (url.startsWith('/') ? url : '/' + url));

// Native FastAPI request — direct pass-through with JWT auth.
const fastapiRequest = async (method, url, payload) => {
  // Capture JWT on login/register so subsequent calls are authenticated.
  if (url.includes('/auth/login') || url.includes('/auth/register')) {
    const r = await apiAxios.post(apiPath(url), payload);
    if (r.data?.token) localStorage.setItem(TOKEN_KEY, r.data.token);
    return r;
  }
  const p = apiPath(url);
  if (method === 'get')    return apiAxios.get(p, { params: payload });
  if (method === 'post')   return apiAxios.post(p, payload);
  if (method === 'put')    return apiAxios.put(p, payload);
  if (method === 'patch')  return apiAxios.patch(p, payload);
  if (method === 'delete') return apiAxios.delete(p);
  return apiAxios.get(p);
};

// ── FRAPPE HELPER: map generic URL → Frappe endpoint ─────────────────────────
// Retained for `api.frappe.*` helpers and any page that wants native Frappe
// calls. The main live path now uses fastapiRequest (see liveOrMock).
const frappeRequest = async (method, url, payload) => {
  const u = url.toLowerCase();

  // ── auth ──────────────────────────────────────────────────────────────────
  if (u.includes('/auth/login')) {
    const r = await frappeAxios.post('/api/method/login', { usr: payload?.email, pwd: payload?.password });
    return { data: { token: null, user: { name: r.data.full_name || payload?.email, email: payload?.email, role: 'admin' } } };
  }
  if (u.includes('/auth/register')) {
    // Frappe doesn't have a public register endpoint — proxy via System Manager
    throw new Error('Registration must be done via Frappe System Manager. Contact admin.');
  }
  if (u.includes('/auth/me')) {
    const r = await frappeAxios.get('/api/method/frappe.auth.get_logged_user');
    return { data: { name: r.data.message, email: r.data.message, role: 'admin' } };
  }

  // ── production board (instabiz custom) ────────────────────────────────────
  if (u.includes('/production/stages') || u.includes('/production-stages')) {
    const r = await frappeAxios.get(
      '/api/method/instabiz.instabiz.page.ib_production_board.ib_production_board.get_board_data',
      { params: { view: 'order', location: '', from_date: '', to_date: '', machine_type: '', stage: '' } }
    );
    return { data: r.data.message || r.data };
  }

  // ── sales orders ──────────────────────────────────────────────────────────
  if (u.includes('/production/orders') || u.includes('/production')) {
    const r = await frappeAxios.get('/api/resource/IB Production Stage', {
      params: { fields: JSON.stringify(['name','sales_order','customer','item_code','item_name','qty','uom','stage','machine','scrap_percent','status','priority']), limit: 50 },
    });
    return { data: { orders: r.data.data, total: r.data.data.length } };
  }

  // ── inventory / items ─────────────────────────────────────────────────────
  if (u.includes('/inventory/items') || u.includes('/items')) {
    const r = await frappeAxios.get('/api/resource/Item', {
      params: { fields: JSON.stringify(['name','item_name','item_group','stock_uom','valuation_rate']), limit: 100 },
    });
    return { data: { items: r.data.data, total: r.data.data.length } };
  }
  if (u.includes('/inventory')) {
    const r = await frappeAxios.get('/api/resource/Warehouse', {
      params: { fields: JSON.stringify(['name','warehouse_name','city']), limit: 50 },
    });
    return { data: { warehouses: r.data.data } };
  }

  // ── machines ──────────────────────────────────────────────────────────────
  if (u.includes('/machines')) {
    const r = await frappeAxios.get('/api/resource/IB Machine', {
      params: { fields: JSON.stringify(['name','machine_type','location','status','operator','efficiency']), limit: 50 },
    });
    return { data: { machines: r.data.data, total: r.data.data.length } };
  }

  // ── CRM / customers ───────────────────────────────────────────────────────
  if (u.includes('/crm/leads') || u.includes('/leads')) {
    const r = await frappeAxios.get('/api/resource/Lead', {
      params: { fields: JSON.stringify(['name','lead_name','company_name','mobile_no','city','source','status']), limit: 50 },
    });
    return { data: r.data.data }; // array directly
  }
  if (u.includes('/crm/accounts') || u.includes('/customers')) {
    const r = await frappeAxios.get('/api/resource/Customer', {
      params: { fields: JSON.stringify(['name','customer_name','customer_group','city','territory']), limit: 100 },
    });
    return { data: r.data.data }; // array directly
  }

  // ── accounts / finance ────────────────────────────────────────────────────
  if (u.includes('/accounts/invoices') || u.includes('/invoices')) {
    const r = await frappeAxios.get('/api/resource/Sales Invoice', {
      params: { fields: JSON.stringify(['name','customer','grand_total','due_date','status']), limit: 50 },
    });
    return { data: { invoices: r.data.data, total: r.data.data.length } };
  }
  if (u.includes('/accounts/payments') || u.includes('/payments')) {
    const r = await frappeAxios.get('/api/resource/Payment Entry', {
      params: { fields: JSON.stringify(['name','party','paid_amount','posting_date','mode_of_payment']), limit: 50 },
    });
    return { data: { payments: r.data.data, total: r.data.data.length } };
  }

  // ── HRMS ──────────────────────────────────────────────────────────────────
  if (u.includes('/hrms') || u.includes('/employees')) {
    const r = await frappeAxios.get('/api/resource/Employee', {
      params: { fields: JSON.stringify(['name','employee_name','department','designation','company']), limit: 100 },
    });
    return { data: { employees: r.data.data, total: r.data.data.length } };
  }

  // ── AI Action inbox (IB AI Action queue) ──────────────────────────────────
  if (u.includes('/ai/actions/') && u.includes('/approve')) {
    const name = url.split('/ai/actions/')[1].split('/')[0];
    const r = await frappeAxios.post(
      '/api/method/instabiz.instabiz.doctype.ib_ai_action.ib_ai_action.approve_and_send',
      { name });
    return { data: r.data.message };
  }
  if (u.includes('/ai/actions/') && u.includes('/reject')) {
    const name = url.split('/ai/actions/')[1].split('/')[0];
    const r = await frappeAxios.post(
      '/api/method/instabiz.instabiz.doctype.ib_ai_action.ib_ai_action.reject',
      { name });
    return { data: r.data.message };
  }
  if (u.includes('/ai/actions')) {
    const r = await frappeAxios.get(
      '/api/method/instabiz.instabiz.doctype.ib_ai_action.ib_ai_action.get_pending_actions');
    return { data: r.data.message || [] };
  }

  // ── Analytics Hub (multi-dimensional reporting) ───────────────────────────
  if (u.includes('/analytics/report')) {
    const r = await frappeAxios.get(
      '/api/method/instabiz.ib_ai.reporting.get_analytics',
      { params: payload });
    return { data: r.data.message };
  }

  // ── dashboard ─────────────────────────────────────────────────────────────
  if (u.includes('/dashboard')) {
    // No single Frappe endpoint — return lightweight snapshot
    return { data: { kpis: {}, alerts: [], message: 'Connect backend for live KPIs' } };
  }

  // ── generic POST/PUT → pass-through ──────────────────────────────────────
  if (method === 'post') return frappeAxios.post(url, payload);
  if (method === 'put')  return frappeAxios.put(url, payload);
  if (method === 'delete') return frappeAxios.delete(url);

  // fallback GET
  return frappeAxios.get(url);
};

// ── MOCK RESOLVER (DEMO_MODE) ─────────────────────────────────────────────────
function mockResolve(data, delay = 100) {
  return new Promise((res) => setTimeout(() => res({ data }), delay));
}

function mockApi(method, url) {
  const u = url.toLowerCase();
  if (u.includes('/auth/')) return mockResolve({ token: null, user: MOCK_USER });
  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  if (u.includes('/dashboard/revenue-analytics')) return mockResolve(MOCK_REVENUE_ANALYTICS);
  if (u.includes('/dashboard/ai-insights')) return mockResolve({ insights: 'Demo mode — connect Frappe backend for live AI insights.' });
  if (u.includes('/dashboard')) return mockResolve(MOCK_DASHBOARD_OVERVIEW);

  // ── COLLECTOR / AUTONOMOUS ─────────────────────────────────────────────────
  if (u.includes('/collector/debtors')) return mockResolve({ segments: [], total: 0 });
  if (u.includes('/collector/reminders')) return mockResolve({ reminders: [] });
  if (u.includes('/collector/analytics')) return mockResolve({ collected: 0, pending: 0 });
  if (u.includes('/collector/emergency')) return mockResolve({ emergency_active: false });
  if (u.includes('/collector')) return mockResolve({ actions: [] });

  // ── PRODUCTION STAGES (specific first) ────────────────────────────────────
  if (u.includes('/production-stages/dashboard')) return mockResolve({
    stages: MOCK_STAGES.stages, stage_counts: MOCK_STAGES.stage_counts, total: MOCK_STAGES.total,
    machines_active: 4, orders_active: 6, wastage_avg: 3.8,
  });
  if (u.includes('/production-stages/machines')) return mockResolve(MOCK_MACHINES);
  if (u.includes('/production-stages/order-sheets')) return mockResolve([]);
  if (u.includes('/production-stages/sales-orders')) return mockResolve(MOCK_SALES_ORDERS);
  if (u.includes('/production-stages/stages/')) return mockResolve({ stage: {}, work_orders: [], kpis: {} });
  if (u.includes('/production-stages/order-sheets/')) return mockResolve({ name: '', items: [], work_orders: [] });
  if (u.includes('/production-stages/dpr/summary')) return mockResolve({ weeks: [] });
  if (u.includes('/production-stages/dpr')) return mockResolve({ entries: [] });
  if (u.includes('/production-stages/work-orders/')) return mockResolve({ name: '', items: [] });

  // ── PRODUCTION ─────────────────────────────────────────────────────────────
  if (u.includes('/production/work-orders')) return mockResolve(MOCK_SALES_ORDERS);
  if (u.includes('/production/machines')) return mockResolve(MOCK_MACHINES);
  if (u.includes('/production/analytics/wastage')) return mockResolve([
    { machine: 'COAT-BWD-001', wastage_percentage: 8.4, date: '2026-06-04' },
    { machine: 'SLIT-SGM-001', wastage_percentage: 3.1, date: '2026-06-04' },
    { machine: 'PRINT-BWD-002', wastage_percentage: 5.2, date: '2026-06-04' },
  ]);
  if (u.includes('/production/production-entries')) return mockResolve([]);
  if (u.includes('/production')) return mockResolve({ orders: MOCK_SALES_ORDERS, total: MOCK_SALES_ORDERS.length });

  // ── INVENTORY ──────────────────────────────────────────────────────────────
  if (u.includes('/inventory/stats/overview') || u.includes('/inventory/stats')) return mockResolve({
    total_items: 6, low_stock_items: 2, stock_value: 3360000, warehouses: 2,
  });
  if (u.includes('/inventory/stock/balance')) return mockResolve(MOCK_ITEMS.filter(i => i.stock < i.reorder));
  if (u.includes('/inventory/items')) return mockResolve(MOCK_ITEMS);
  if (u.includes('/inventory-advanced/batches/expiring')) return mockResolve([]);
  if (u.includes('/inventory-advanced/batches')) return mockResolve([]);
  if (u.includes('/inventory-advanced/bin-locations')) return mockResolve([]);
  if (u.includes('/inventory-advanced/reorder-alerts')) return mockResolve({ alerts: [] });
  if (u.includes('/inventory-advanced/stock-aging')) return mockResolve({ buckets: {} });
  if (u.includes('/inventory-advanced/stock-valuation')) return mockResolve({ total: 3360000 });
  if (u.includes('/inventory-advanced/barcode')) return mockResolve(null);

  // ── WAREHOUSE ──────────────────────────────────────────────────────────────
  if (u.includes('/warehouse/consolidated-stock')) return mockResolve({ stock: MOCK_ITEMS, total_value: 3360000 });
  if (u.includes('/warehouse/stock-register')) return mockResolve(MOCK_ITEMS);
  if (u.includes('/warehouse/item-ledger')) return mockResolve({ entries: [] });
  if (u.includes('/warehouse/stock-transfers')) return mockResolve([]);
  if (u.includes('/warehouse/stock-adjustments')) return mockResolve([]);
  if (u.includes('/warehouse/warehouses')) return mockResolve(MOCK_INVENTORY.warehouses);

  // ── CRM ─────────────────────────────────────────────────────────────────────
  // Components do setX(response.data) — return arrays/objects directly
  if (u.includes('/crm/stats')) return mockResolve({ leads: 24, quotations: 8, accounts: 5, samples: 3 });
  if (u.includes('/crm/leads/kanban')) return mockResolve({ data: {} });
  if (u.includes('/crm/users/sales')) return mockResolve([]);
  if (u.includes('/crm/geo/states')) return mockResolve({ states: [] });
  if (u.includes('/crm/geo/pincode')) return mockResolve({ country: 'India', state: 'Maharashtra', district: 'Mumbai', city: 'Mumbai' });
  if (u.includes('/crm/accounts/gst-lookup')) return mockResolve({ valid: false, state_name: '', pan: '' });
  if (u.includes('/crm/leads')) return mockResolve(MOCK_LEADS);
  if (u.includes('/crm/accounts')) return mockResolve(MOCK_CUSTOMERS);
  if (u.includes('/crm/quotations')) return mockResolve([]);
  if (u.includes('/crm/samples')) return mockResolve([]);
  if (u.includes('/crm')) return mockResolve({ leads: MOCK_LEADS, accounts: MOCK_CUSTOMERS });

  // ── ACCOUNTS / FINANCE ─────────────────────────────────────────────────────
  if (u.includes('/accounts/stats')) return mockResolve(MOCK_ACCOUNTS.stats);
  // invoices — must be array (pages do .slice(), .filter())
  if (u.includes('/accounts/invoices')) return mockResolve(MOCK_ACCOUNTS.invoices);
  if (u.includes('/accounts/payments')) return mockResolve(MOCK_ACCOUNTS.payments);
  if (u.includes('/accounts/reports/aging')) return mockResolve([
    { customer: 'Ashok Packaging', current: 185000, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 185000 },
    { customer: 'Prime Converters', current: 120000, '1-30': 120000, '31-60': 0, '61-90': 0, '90+': 0, total: 240000 },
    { customer: 'Star Labels Pvt', current: 0, '1-30': 0, '31-60': 98000, '61-90': 0, '90+': 0, total: 98000 },
  ]);
  if (u.includes('/accounts/reports/gst-summary')) return mockResolve({
    outward_supplies: { count: 23, taxable_value: 4050000, cgst: 185000, sgst: 185000, igst: 510000, total_tax: 880000 },
    inward_supplies: { count: 12, taxable_value: 1800000, cgst: 75000, sgst: 75000, igst: 200000, total_tax: 350000 },
    net_tax_payable: 530000, period: '',
  });
  if (u.includes('/accounts/credit-notes')) return mockResolve([]);
  if (u.includes('/accounts')) return mockResolve(MOCK_ACCOUNTS);

  // ── PROCUREMENT ───────────────────────────────────────────────────────────
  if (u.includes('/procurement/stats')) return mockResolve({ po_count: 4, pending_amount: 280000, suppliers: 8 });
  if (u.includes('/procurement/purchase-orders/')) return mockResolve({ name: 'PO-DEMO', items: [], supplier: '' });
  if (u.includes('/procurement/purchase-orders')) return mockResolve([]);
  if (u.includes('/procurement/suppliers/') && u.includes('/tds')) return mockResolve({ threshold_exceeded: false });
  if (u.includes('/procurement/suppliers')) return mockResolve([]);
  if (u.includes('/procurement/geo/pincode')) return mockResolve({ city: 'Mumbai', state: 'Maharashtra', country: 'India' });
  if (u.includes('/procurement/gstin/validate')) return mockResolve({ valid: false, state: '', pan: '' });

  // ── HRMS ──────────────────────────────────────────────────────────────────
  if (u.includes('/hrms-enhanced/attendance')) return mockResolve([]);
  if (u.includes('/hrms-enhanced/leave-applications')) return mockResolve([]);
  if (u.includes('/hrms-enhanced/leave-types')) return mockResolve([]);
  if (u.includes('/hrms-enhanced/loans')) return mockResolve([]);
  if (u.includes('/hrms-enhanced/payroll')) return mockResolve([]);
  if (u.includes('/hrms-enhanced/salary-slips')) return mockResolve([]);
  if (u.includes('/hrms-enhanced')) return mockResolve([]);
  if (u.includes('/hrms/employees')) return mockResolve(MOCK_EMPLOYEES);
  if (u.includes('/hrms/attendance')) return mockResolve([]);
  if (u.includes('/hrms/leave-requests')) return mockResolve([]);
  if (u.includes('/hrms/leave-types')) return mockResolve([]);
  if (u.includes('/hrms/payroll')) return mockResolve([]);
  if (u.includes('/hrms/salary-slips')) return mockResolve([]);
  if (u.includes('/hrms/reports')) return mockResolve({ summary: {}, data: [] });
  if (u.includes('/hrms')) return mockResolve({ employees: MOCK_EMPLOYEES });

  // ── CUSTOMERS / HEALTH ────────────────────────────────────────────────────
  if (u.includes('/customer-health/scores')) return mockResolve({ scores: MOCK_CUSTOMERS.map((c, i) => ({
    ...c,
    account_id: c.id,
    account_name: c.name,      // CustomerHealth.jsx uses .account_name
    contact_name: ['Vikas Shah', 'Rajesh Patel', 'Priya Nair', 'Global Desk', 'Star Admin'][i] || 'Contact',
    health_score: c.score,
    health_status: c.score >= 80 ? 'EXCELLENT' : c.score >= 60 ? 'HEALTHY' : c.score >= 40 ? 'AT_RISK' : 'CRITICAL',
    buying_status: c.score >= 80 ? 'NO_ACTION' : c.score >= 60 ? 'PRE_EMPTIVE_CHECK' : c.score >= 40 ? 'GENTLE_REMINDER' : 'URGENT_FOLLOWUP',
    days_since_last_order: [12, 28, 6, 47, 19][i] ?? 0,
    debtor_segment: c.score >= 85 ? 'GOLD' : c.score >= 70 ? 'SILVER' : c.score >= 50 ? 'BRONZE' : 'BLOCKED',
    payment_score: Math.round(c.score * 0.9),
    total_outstanding: c.outstanding || 0,
    overdue_amount: c.score < 60 ? Math.round((c.outstanding || 0) * 0.4) : 0,
    risk_factors: c.score < 70 ? ['Overdue payment', 'Low order frequency'] : [],
    recommended_actions: ['Schedule call', 'Review credit terms'],
    contact_phone: '9876543210',
  })), summary: { avg_health_score: 76, total_customers: MOCK_CUSTOMERS.length, green: 3, amber: 1, red: 1, total_at_risk_outstanding: 133000, healthy_count: 3 } });
  if (u.includes('/customer-health/widget')) return mockResolve({
    summary: { avg_health_score: 76, total_customers: 5, total_at_risk_outstanding: 133000, healthy_count: 3 },
    health_distribution: { EXCELLENT: 1, HEALTHY: 2, AT_RISK: 1, CRITICAL: 1 },
    attention_needed: MOCK_CUSTOMERS.filter(c => c.score < 70).map(c => ({
      account_id: c.id,
      account_name: c.name,
      health_score: c.score,
      health_status: 'AT_RISK',
      risk_factors: ['Overdue payment', 'Low order frequency'],
      recommended_actions: ['Schedule follow-up call', 'Review payment terms'],
      contact_phone: '9876543210',
      outstanding: c.outstanding,
    })),
  });
  if (u.includes('/customer-health')) return mockResolve({ customers: MOCK_CUSTOMERS });

  // ── QUALITY ───────────────────────────────────────────────────────────────
  if (u.includes('/quality/reports/quality-summary')) return mockResolve({
    inspections: { total: 42, passed: 40, failed: 2, pass_rate: 96, by_type: { 'Incoming': 18, 'In-Process': 15, 'Final': 9 } },
    complaints: { open: 3, resolved: 8 },
  });
  if (u.includes('/quality/inspections')) return mockResolve([]);
  if (u.includes('/quality/batch-trace')) return mockResolve({ batches: [], trail: [] });
  if (u.includes('/quality/tds')) return mockResolve([]);
  if (u.includes('/quality')) return mockResolve({ summary: {} });

  // ── ANALYTICS / REPORTS ──────────────────────────────────────────────────
  if (u.includes('/analytics/dashboard/kpis')) return mockResolve({ revenue: 4820000, orders: 23, leads: 24, customers: 5 });
  if (u.includes('/analytics/sales/summary')) return mockResolve({
    current_period: { total_sales: 4820000, invoice_count: 23, average_order_value: 209565 },
    previous_period: { total_sales: 3950000, invoice_count: 19, average_order_value: 207894 },
    growth: { sales_growth_percent: 22.0, sales_growth_amount: 870000 },
    by_rep: [], trend: [],
  });
  if (u.includes('/analytics/sales/trend')) return mockResolve({ daily: [], weekly: [], monthly: [] });
  if (u.includes('/analytics/sales/top-products')) return mockResolve({ top_products: [] });
  if (u.includes('/analytics/sales/top-customers')) return mockResolve({ top_customers: [] });
  if (u.includes('/analytics/purchases/summary')) return mockResolve({ total: 280000, by_supplier: [] });
  if (u.includes('/analytics/inventory/summary')) return mockResolve({ total_items: 6, total_stock_value: 3360000, low_stock_items: 2, out_of_stock_items: 0 });
  if (u.includes('/analytics/financial/profit-loss')) return mockResolve({
    revenue: { total_revenue: 4820000, invoice_count: 23 },
    cost_of_goods_sold: 2890000,
    gross_profit: 1930000,
    gross_margin_percent: 40.0,
    operating_expenses: { total: 620000 },
    net_profit: 1310000,
    net_margin_percent: 27.2,
  });
  if (u.includes('/reports/kpis')) return mockResolve({ kpis: [] });
  if (u.includes('/reports')) return mockResolve({ data: [] });

  // ── BUYING DNA ────────────────────────────────────────────────────────────
  if (u.includes('/buying-dna')) return mockResolve({ patterns: [], summary: {} });

  // ── E-INVOICE / GST ──────────────────────────────────────────────────────
  if (u.includes('/einvoice/pending-invoices')) return mockResolve([]);
  if (u.includes('/einvoice/summary')) return mockResolve({ total: 0, pending: 0, generated: 0 });
  if (u.includes('/einvoice/logs')) return mockResolve([]);
  if (u.includes('/gst/gstr1')) return mockResolve({
    summary: { total_invoices: 23, total_taxable_value: 4050000, total_igst: 510000, total_cgst: 185000, total_sgst: 185000 },
    tables: {
      b2b: { count: 18, taxable: 3800000 },
      b2c_large: { count: 3, taxable: 180000 },
      b2c_small: { count: 2, taxable: 70000 },
      cdnr: { count: 0, taxable: 0 },
      hsn_summary: { data: [] },
    },
  });
  if (u.includes('/gst/gstr3b')) return mockResolve({
    summary: { total_output_tax: 880000, total_input_tax: 350000, net_tax_liability: 530000 },
    table_3_1: { details: { a_outward_taxable: { igst: 510000, cgst: 185000, sgst: 185000, cess: 0 } } },
    table_4: { details: { net_itc: { igst: 200000, cgst: 75000, sgst: 75000, cess: 0 } } },
    table_6: { tax_payable: { igst: 310000, cgst: 110000, sgst: 110000, cess: 0 } },
  });
  if (u.includes('/gst/itc')) return mockResolve({
    entries: [],
    summary: {
      total_itc_available: { total: 350000, igst: 200000, cgst: 75000, sgst: 75000 },
      eligible_itc:        { total: 320000, igst: 185000, cgst: 68000, sgst: 67000 },
      ineligible_itc:      { total: 30000,  igst: 15000,  cgst: 7000,  sgst: 8000 },
    },
  });
  if (u.includes('/gst/hsn-summary')) return mockResolve({ data: [] });
  if (u.includes('/gst/eway-bills')) return mockResolve([]);
  if (u.includes('/gst')) return mockResolve({ records: [] });

  // ── APPROVALS ────────────────────────────────────────────────────────────
  if (u.includes('/approvals')) return mockResolve([]);

  // ── FIELD REGISTRY / CUSTOMIZATION ───────────────────────────────────────
  if (u.includes('/field-registry/modules')) return mockResolve([]);
  if (u.includes('/field-registry')) return mockResolve({ config: {} });
  if (u.includes('/customization/custom-fields')) return mockResolve([]);
  if (u.includes('/customization/report-templates')) return mockResolve([]);
  if (u.includes('/custom-fields/modules')) return mockResolve([]);

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  if (u.includes('/notifications/notifications/count')) return mockResolve({ unread_count: 3 });
  if (u.includes('/notifications/notifications')) return mockResolve([
    { id: 1, title: 'Low Stock Alert', message: 'OPP Film 30µ below reorder level', type: 'warning', read: false, created_at: '2026-06-04T09:00:00Z' },
    { id: 2, title: 'Overdue Invoice', message: 'INV-2026-0039 from Star Labels is 7 days overdue', type: 'alert', read: false, created_at: '2026-06-03T14:00:00Z' },
    { id: 3, title: 'Payroll Due', message: 'June payroll processing due by 28th', type: 'info', read: false, created_at: '2026-06-02T10:00:00Z' },
  ]);

  // ── AI / CHAT / DRIVE ────────────────────────────────────────────────────
  if (u.includes('/ai/query-history')) return mockResolve([]);
  if (u.includes('/core/cockpit/pulse')) return mockResolve({ kpis: {} });
  if (u.includes('/core/cockpit/overrides-pending')) return mockResolve({ pending_overrides: [] });
  if (u.includes('/core/buying-dna/late-customers')) return mockResolve([]);
  if (u.includes('/chat')) return mockResolve([]);
  if (u.includes('/drive/storage')) return mockResolve({ total_size: 24500000, storage_limit: 10737418240, file_count: 12 });
  if (u.includes('/drive/folders/')) return mockResolve({ path: [] });   // breadcrumb
  if (u.includes('/drive/folders')) return mockResolve([]);              // folder list → array
  if (u.includes('/drive/files')) return mockResolve([]);                // file list → array
  if (u.includes('/drive')) return mockResolve({ used: 0, total: 10000 });
  if (u.includes('/documents')) return mockResolve([]);

  // ── AI action inbox (IB AI Action queue from the 10 agents) ───────────────
  if (u.includes('/ai/actions/') && (u.includes('/approve') || u.includes('/reject')))
    return mockResolve({ success: true });
  if (u.includes('/ai/actions')) return mockResolve([
    { id: 'AIA-001', agent: 'Collections', channel: 'WhatsApp', ai_generated: 1,
      reference_doctype: 'Customer', reference_name: 'Global Stickers',
      draft_subject: 'Payment reminder — ₹35,000 overdue (47d)',
      draft_message: 'Dear Global Stickers, your account shows ₹35,000 outstanding, overdue by 47 days. As a valued partner we request you to clear this at the earliest. Kindly share the payment UTR once done.' },
    { id: 'AIA-002', agent: 'Lead Responder', channel: 'WhatsApp', ai_generated: 1,
      reference_doctype: 'Lead', reference_name: 'LEAD-001',
      draft_subject: 'First-touch reply — Vikas',
      draft_message: 'Hi Vikas, thanks for your website enquiry! We make BOPP tapes, films & custom adhesive solutions. Could you share size, quantity and application? We\'ll send a quote within 24 hours.' },
    { id: 'AIA-003', agent: 'Procurement', channel: 'Notification', ai_generated: 0,
      reference_doctype: 'Item', reference_name: 'OPP-30U',
      draft_subject: 'PO proposal: 13,900 SQM of OPP-30U',
      draft_message: 'OPP Film 30 Micron — stock 2,100 SQM, below reorder level 8,000. 30-day consumption 7,900. Suggested PO qty: 13,900 SQM. Last supplier: Jiangsu Films @ ₹22.' },
    { id: 'AIA-004', agent: 'Anomaly Watch', channel: 'Notification', ai_generated: 0,
      reference_doctype: 'IB Machine', reference_name: 'COAT-BWD-001',
      draft_subject: 'Scrap spike on COAT-BWD-001',
      draft_message: 'Scrap 8.4% vs norm 4.0% (2.1x) on the coating line today. Recommend checking adhesive mix and web tension before next shift.' },
    { id: 'AIA-005', agent: 'Dispatch', channel: 'WhatsApp', ai_generated: 1,
      reference_doctype: 'Delivery Note', reference_name: 'IB-BWD-DN-00012',
      draft_subject: 'Dispatch update: IB-BWD-DN-00012 → Ashok Packaging',
      draft_message: 'Dear Ashok Packaging, your order has been dispatched. LR No: MH43AJ5555, Transporter: VRL Logistics. Items: BOPP Tape 48mm x5000. Thank you — Team InstaBiz.' },
  ]);

  // ── gatepass ──────────────────────────────────────────────────────────────
  if (u.includes('/gatepass/transporters')) return mockResolve([
    { id: 'TR-001', transporter_name: 'VRL Logistics', contact_person: 'Mahesh', phone: '9822001100', gstin: '27AAVRL1234A1Z1', city: 'Mumbai', state: 'Maharashtra' },
    { id: 'TR-002', transporter_name: 'Gati Express', contact_person: 'Suraj', phone: '9833002211', gstin: '24AAGAT5678B2Z2', city: 'Surat', state: 'Gujarat' },
  ]);
  if (u.includes('/gatepass')) return mockResolve([
    { id: 'GP-001', gatepass_no: 'GP-2026-0012', gatepass_type: 'outward', reference_type: 'DN', vehicle_no: 'MH43AJ5555', driver_name: 'Ravi', party_name: 'Ashok Packaging', status: 'approved', created_at: '2026-06-11T10:00:00' },
    { id: 'GP-002', gatepass_no: 'GP-2026-0013', gatepass_type: 'inward', reference_type: 'GRN', vehicle_no: 'GJ05BT8899', driver_name: 'Sanjay', party_name: 'Supreme Polymers', status: 'pending', created_at: '2026-06-12T09:15:00' },
  ]);

  // ── payroll ───────────────────────────────────────────────────────────────
  if (u.includes('/payroll/') && u.includes('/payslip')) return mockResolve({
    employee_name: 'Ramesh Kumar', payroll_month: '2026-05', basic: 14667, hra: 4400, conveyance: 2933,
    gross: 22000, pf: 1760, esic: 143, pt: 200, total_deductions: 2103, net_pay: 19897,
  });
  if (u.includes('/payroll')) return mockResolve([
    { id: 'PR-001', employee_id: 'EMP-001', employee_name: 'Ramesh Kumar', payroll_month: '2026-05', gross: 22000, deductions: 2103, net_pay: 19897, status: 'paid' },
    { id: 'PR-002', employee_id: 'EMP-003', employee_name: 'Anita Singh', payroll_month: '2026-05', gross: 35000, deductions: 2050, net_pay: 32950, status: 'approved' },
  ]);

  // ── employee vault ────────────────────────────────────────────────────────
  if (u.includes('/employee-vault/document-types')) return mockResolve({
    document_types: ['PANCARD', 'AADHAR CARD', 'Passport', 'Education Certificate', 'Experience Letter', 'Offer Letter', 'Bank Passbook'],
  });
  if (u.includes('/employee-vault/documents/expiring')) return mockResolve([]);
  if (u.includes('/employee-vault/') && u.includes('/vault-summary')) return mockResolve({
    documents: [], assets: [], document_count: 0, asset_count: 0,
  });

  // ── import bridge ─────────────────────────────────────────────────────────
  if (u.includes('/imports/exchange-rates')) return mockResolve({
    USD: 84.2, EUR: 91.5, CNY: 11.6, updated_at: '2026-06-12T08:00:00',
  });
  if (u.includes('/imports/purchase-orders')) return mockResolve([
    { id: 'IPO-001', po_no: 'IMP-PO-2026-004', supplier: 'Jiangsu Films Co', country: 'China', currency: 'USD', total_value: 42000, status: 'in_transit', eta: '2026-06-25' },
  ]);
  if (u.includes('/imports')) return mockResolve([]);

  // ── sales incentives ──────────────────────────────────────────────────────
  if (u.includes('/sales-incentives/targets')) return mockResolve([
    { id: 'TGT-001', employee_id: 'EMP-003', employee_name: 'Anita Singh', target_type: 'monthly', period: '2026-06', target_amount: 800000, achieved_amount: 620000, achievement_pct: 77.5, status: 'active' },
    { id: 'TGT-002', employee_id: 'EMP-001', employee_name: 'Ramesh Kumar', target_type: 'monthly', period: '2026-06', target_amount: 500000, achieved_amount: 510000, achievement_pct: 102.0, status: 'achieved' },
  ]);
  if (u.includes('/sales-incentives/slabs')) return mockResolve([
    { id: 'SLAB-1', name: 'Base', min_pct: 80, max_pct: 99, incentive_pct: 1.0 },
    { id: 'SLAB-2', name: 'Target', min_pct: 100, max_pct: 119, incentive_pct: 2.0 },
    { id: 'SLAB-3', name: 'Stretch', min_pct: 120, max_pct: 999, incentive_pct: 3.0 },
  ]);
  if (u.includes('/sales-incentives/payouts')) return mockResolve([
    { id: 'PAY-INC-001', employee_name: 'Ramesh Kumar', period: '2026-05', amount: 10200, status: 'paid' },
  ]);
  if (u.includes('/sales-incentives/leaderboard')) return mockResolve([
    { rank: 1, employee_name: 'Ramesh Kumar', achieved: 510000, target: 500000, pct: 102.0 },
    { rank: 2, employee_name: 'Anita Singh', achieved: 620000, target: 800000, pct: 77.5 },
  ]);

  // ── POST/PUT/PATCH/DELETE fallback ────────────────────────────────────────
  if (method === 'post' || method === 'put' || method === 'patch' || method === 'delete')
    return mockResolve({ success: true, id: 'DEMO-' + Date.now() });

  // ── safe fallback ─────────────────────────────────────────────────────────
  return mockResolve([]);
}

// ── EXPORTED API OBJECT ───────────────────────────────────────────────────────
// Drop-in replacement: same .get/.post/.put/.delete interface as before.
// Live call with optional mock fallback — pages never crash on a missing endpoint
const liveOrMock = async (method, url, payload) => {
  if (DEMO_MODE) return mockApi(method, url);
  try {
    return await fastapiRequest(method, url, payload);
  } catch (err) {
    if (MOCK_FALLBACK && method === 'get') {
      console.warn(`[api] backend failed for ${url} — using mock fallback`, err?.message);
      return mockApi(method, url);
    }
    throw err;
  }
};

const api = {
  get:    (url, cfg)  => liveOrMock('get',    url, cfg?.params),
  post:   (url, data) => liveOrMock('post',   url, data),
  put:    (url, data) => liveOrMock('put',    url, data),
  patch:  (url, data) => liveOrMock('patch',  url, data),
  delete: (url)       => liveOrMock('delete', url),

  // Frappe-specific helpers (available to pages that want native Frappe calls)
  frappe: {
    /** GET /api/resource/{DocType} */
    list: (doctype, fields = ['name'], filters = [], limit = 20) =>
      frappeAxios.get(`/api/resource/${encodeURIComponent(doctype)}`, {
        params: { fields: JSON.stringify(fields), filters: JSON.stringify(filters), limit },
      }),
    /** GET /api/resource/{DocType}/{name} */
    get: (doctype, name) =>
      frappeAxios.get(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`),
    /** POST /api/resource/{DocType} */
    create: (doctype, doc) =>
      frappeAxios.post(`/api/resource/${encodeURIComponent(doctype)}`, doc),
    /** PUT /api/resource/{DocType}/{name} */
    update: (doctype, name, doc) =>
      frappeAxios.put(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, doc),
    /** DELETE /api/resource/{DocType}/{name} */
    delete: (doctype, name) =>
      frappeAxios.delete(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`),
    /** POST /api/method/{dotted.path} */
    call: (method, args = {}) =>
      frappeAxios.post(`/api/method/${method}`, args),
  },
};

export default api;
