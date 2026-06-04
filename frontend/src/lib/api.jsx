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
  // dashboard — specific endpoints first
  if (u.includes('/dashboard/revenue-analytics')) return mockResolve(MOCK_REVENUE_ANALYTICS);
  if (u.includes('/dashboard/ai-insights')) return mockResolve({ insights: 'Demo mode — connect Frappe backend for live AI insights.' });
  if (u.includes('/dashboard/overview') || u.includes('/dashboard')) return mockResolve(MOCK_DASHBOARD_OVERVIEW);
  // collector quick-actions
  if (u.includes('/collector')) return mockResolve({ actions: [] });
  if (u.includes('/production/stages') || u.includes('/production-stages')) return mockResolve(MOCK_STAGES);
  if (u.includes('/production')) return mockResolve({ orders: MOCK_SALES_ORDERS, total: MOCK_SALES_ORDERS.length });
  if (u.includes('/inventory/items') || u.includes('/items')) return mockResolve({ items: MOCK_ITEMS, total: MOCK_ITEMS.length });
  if (u.includes('/inventory/warehouses') || u.includes('/warehouses')) return mockResolve(MOCK_INVENTORY.warehouses);
  if (u.includes('/inventory') || u.includes('/stock')) return mockResolve(MOCK_INVENTORY);
  if (u.includes('/machines')) return mockResolve({ machines: MOCK_MACHINES, total: MOCK_MACHINES.length });
  // CRM components do setX(response.data) directly — return arrays not wrappers
  if (u.includes('/crm/stats')) return mockResolve({ leads: 24, quotations: 8, accounts: 5, samples: 3 });
  if (u.includes('/crm/leads') || u.includes('/leads')) return mockResolve(MOCK_LEADS);
  if (u.includes('/crm/accounts')) return mockResolve(MOCK_CUSTOMERS);
  if (u.includes('/crm/quotations')) return mockResolve([]);
  if (u.includes('/crm/samples')) return mockResolve([]);
  if (u.includes('/crm')) return mockResolve({ leads: MOCK_LEADS, accounts: MOCK_CUSTOMERS });
  if (u.includes('/customers')) return mockResolve(MOCK_CUSTOMERS);
  if (u.includes('/accounts/stats')) return mockResolve(MOCK_ACCOUNTS.stats);
  if (u.includes('/accounts/invoices') || u.includes('/invoices')) return mockResolve({ invoices: MOCK_ACCOUNTS.invoices, total: MOCK_ACCOUNTS.invoices.length });
  if (u.includes('/accounts/payments') || u.includes('/payments')) return mockResolve({ payments: MOCK_ACCOUNTS.payments, total: MOCK_ACCOUNTS.payments.length });
  if (u.includes('/accounts')) return mockResolve(MOCK_ACCOUNTS);
  if (u.includes('/hrms') || u.includes('/employees')) return mockResolve({ employees: MOCK_EMPLOYEES, total: MOCK_EMPLOYEES.length });
  if (u.includes('/scores') || u.includes('/customer-health')) return mockResolve({ customers: MOCK_CUSTOMERS });
  if (method === 'post' || method === 'put' || method === 'patch' || method === 'delete')
    return mockResolve({ success: true, id: 'DEMO-' + Date.now() });
  return mockResolve({ data: [], total: 0 });
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
