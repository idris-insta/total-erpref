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
const DEMO_MODE = true;   // ← set false when Frappe server is reachable
const FRAPPE_URL = (import.meta.env.VITE_BACKEND_URL || 'http://172.30.52.244:8000');
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

// ── FRAPPE HELPER: map generic URL → Frappe endpoint ─────────────────────────
// Translates paths used by pages (inherited from old FastAPI contract) into
// proper Frappe REST or whitelisted method calls.
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
  if (u.includes('/production/analytics/wastage')) return mockResolve({ wastage_pct: 3.8, by_machine: [] });
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
  if (u.includes('/accounts/reports/aging')) return mockResolve({ buckets: [], summary: {} });
  if (u.includes('/accounts/reports/gst-summary')) return mockResolve({ summary: {} });
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
  if (u.includes('/hrms/employees')) return mockResolve(MOCK_EMPLOYEES);
  if (u.includes('/hrms/attendance')) return mockResolve([]);
  if (u.includes('/hrms/reports')) return mockResolve({ summary: {}, data: [] });
  if (u.includes('/hrms')) return mockResolve({ employees: MOCK_EMPLOYEES });

  // ── CUSTOMERS / HEALTH ────────────────────────────────────────────────────
  if (u.includes('/customer-health/scores')) return mockResolve({ scores: MOCK_CUSTOMERS.map(c => ({ ...c, health_score: c.score, health_status: c.score >= 70 ? 'Green' : c.score >= 40 ? 'Amber' : 'Red' })), summary: { avg: 77, green: 3, amber: 1, red: 1 } });
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
  if (u.includes('/analytics/sales/summary')) return mockResolve({ total: 4820000, by_rep: [], trend: [] });
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
  if (u.includes('/gst/gstr1')) return mockResolve({ b2b: [], summary: {} });
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

  // ── AI / CHAT / DRIVE ────────────────────────────────────────────────────
  if (u.includes('/ai/query-history')) return mockResolve([]);
  if (u.includes('/core/cockpit/pulse')) return mockResolve({ kpis: {} });
  if (u.includes('/core/cockpit/overrides-pending')) return mockResolve({ pending_overrides: [] });
  if (u.includes('/core/buying-dna/late-customers')) return mockResolve([]);
  if (u.includes('/chat')) return mockResolve([]);
  if (u.includes('/drive')) return mockResolve({ used: 0, total: 10000 });
  if (u.includes('/documents')) return mockResolve([]);

  // ── POST/PUT/PATCH/DELETE fallback ────────────────────────────────────────
  if (method === 'post' || method === 'put' || method === 'patch' || method === 'delete')
    return mockResolve({ success: true, id: 'DEMO-' + Date.now() });

  // ── safe fallback ─────────────────────────────────────────────────────────
  return mockResolve([]);
}

// ── EXPORTED API OBJECT ───────────────────────────────────────────────────────
// Drop-in replacement: same .get/.post/.put/.delete interface as before.
const api = {
  get:    (url, cfg)  => DEMO_MODE ? mockApi('get',    url) : frappeRequest('get',    url, cfg?.params),
  post:   (url, data) => DEMO_MODE ? mockApi('post',   url) : frappeRequest('post',   url, data),
  put:    (url, data) => DEMO_MODE ? mockApi('put',    url) : frappeRequest('put',    url, data),
  patch:  (url, data) => DEMO_MODE ? mockApi('patch',  url) : frappeRequest('patch',  url, data),
  delete: (url)       => DEMO_MODE ? mockApi('delete', url) : frappeRequest('delete', url),

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
