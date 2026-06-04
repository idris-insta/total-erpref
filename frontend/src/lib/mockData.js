// ── MOCK DATA ─────────────────────────────────────────────────────────────────
// Full offline dataset for all API endpoints.
// Backend at 172.30.52.244:8000 is NOT required in demo mode.
// ──────────────────────────────────────────────────────────────────────────────

export const MOCK_USER = {
  id: 1, name: 'Idris (Demo)', email: 'admin@adhesiveflow.com', role: 'admin',
};

export const MOCK_CUSTOMERS = [
  { id: 1, name: 'Ashok Packaging', gstin: '27AABCA1234A1Z5', city: 'Mumbai', state: 'Maharashtra', score: 87, status: 'Active', outstanding: 142000, credit_limit: 500000 },
  { id: 2, name: 'Rajesh Laminates', gstin: '29AABCR5678B2Z6', city: 'Bangalore', state: 'Karnataka', score: 72, status: 'Active', outstanding: 85000, credit_limit: 300000 },
  { id: 3, name: 'Prime Converters', gstin: '06AABCP9012C3Z7', city: 'Faridabad', state: 'Haryana', score: 91, status: 'Active', outstanding: 220000, credit_limit: 600000 },
  { id: 4, name: 'Global Stickers', gstin: '33AABCG3456D4Z8', city: 'Chennai', state: 'Tamil Nadu', score: 55, status: 'Dormant', outstanding: 35000, credit_limit: 200000 },
  { id: 5, name: 'Star Labels Pvt', gstin: '24AABCS7890E5Z9', city: 'Surat', state: 'Gujarat', score: 78, status: 'Active', outstanding: 98000, credit_limit: 350000 },
];

export const MOCK_SALES_ORDERS = [
  { id: 'IB-CN-SO-00054', customer: 'Ashok Packaging', item: 'BOPP Tape 48mm', qty: 5000, uom: 'PCS', stage: 'Coating', machine: 'COAT-BWD-001', scrap_pct: 8.4, status: 'In Progress', priority: 'Urgent', value: 185000 },
  { id: 'IB-CN-SO-00055', customer: 'Prime Converters', item: 'PET Film 25µ', qty: 2000, uom: 'SQM', stage: 'Slitting', machine: 'SLIT-SGM-001', scrap_pct: 3.1, status: 'In Progress', priority: 'High', value: 240000 },
  { id: 'IB-CN-SO-00056', customer: 'Rajesh Laminates', item: 'BOPP Tape 72mm', qty: 3500, uom: 'PCS', stage: 'Lamination', machine: 'LAM-BWD-001', scrap_pct: 1.8, status: 'In Progress', priority: 'Normal', value: 98000 },
  { id: 'IB-CN-SO-00057', customer: 'Star Labels Pvt', item: 'Jumbo Roll 1500m', qty: 800, uom: 'ROLL', stage: 'QC Check', machine: 'QC-SGM-001', scrap_pct: 0, status: 'Pending', priority: 'Low', value: 320000 },
  { id: 'IB-CN-SO-00058', customer: 'Global Stickers', item: 'OPP Film 30µ', qty: 4200, uom: 'SQM', stage: 'Printing', machine: 'PRINT-BWD-002', scrap_pct: 5.2, status: 'In Progress', priority: 'High', value: 175000 },
  { id: 'IB-CN-SO-00059', customer: 'Ashok Packaging', item: 'BOPP Tape 96mm', qty: 1200, uom: 'PCS', stage: 'Dispatch Ready', machine: null, scrap_pct: 0, status: 'Done', priority: 'Normal', value: 145000 },
];

export const MOCK_ITEMS = [
  { id: 'BOPP-48MM', name: 'BOPP Tape 48mm × 100m', group: 'Tape', uom: 'PCS', stock: 12400, reorder: 5000, rate: 37, hsn: '39191010' },
  { id: 'BOPP-72MM', name: 'BOPP Tape 72mm × 100m', group: 'Tape', uom: 'PCS', stock: 8200, reorder: 3000, rate: 55, hsn: '39191010' },
  { id: 'BOPP-96MM', name: 'BOPP Tape 96mm × 65m', group: 'Tape', uom: 'PCS', stock: 3100, reorder: 2000, rate: 72, hsn: '39191010' },
  { id: 'PET-25U', name: 'PET Film 25 Micron', group: 'Film', uom: 'SQM', stock: 28000, reorder: 10000, rate: 18, hsn: '39206200' },
  { id: 'OPP-30U', name: 'OPP Film 30 Micron', group: 'Film', uom: 'SQM', stock: 2100, reorder: 8000, rate: 22, hsn: '39201030' },
  { id: 'JR-1500', name: 'Jumbo Roll 1500m', group: 'Jumbo', uom: 'ROLL', stock: 145, reorder: 50, rate: 850, hsn: '39191090' },
];

export const MOCK_MACHINES = [
  { id: 'COAT-BWD-001', type: 'Coating', location: 'Badwani', status: 'Running', operator: 'Ramesh K.', efficiency: 94, uptime_pct: 87 },
  { id: 'SLIT-SGM-001', type: 'Slitting', location: 'Sangrampur', status: 'Running', operator: 'Suresh P.', efficiency: 88, uptime_pct: 91 },
  { id: 'SLIT-SGM-002', type: 'Slitting', location: 'Sangrampur', status: 'Idle', operator: 'Vijay M.', efficiency: 0, uptime_pct: 72 },
  { id: 'LAM-BWD-001', type: 'Lamination', location: 'Badwani', status: 'Running', operator: 'Anil D.', efficiency: 91, uptime_pct: 89 },
  { id: 'PRINT-BWD-002', type: 'Printing', location: 'Badwani', status: 'Maintenance', operator: 'Dev T.', efficiency: 0, uptime_pct: 65 },
  { id: 'QC-SGM-001', type: 'QC', location: 'Sangrampur', status: 'Running', operator: 'Meena R.', efficiency: 99, uptime_pct: 98 },
];

export const MOCK_STAGES = {
  stages: ['Raw Material', 'Coating', 'Lamination', 'Printing', 'Slitting', 'QC Check', 'Dispatch Ready'],
  stage_counts: { 'Raw Material': 3, 'Coating': 4, 'Lamination': 2, 'Printing': 3, 'Slitting': 5, 'QC Check': 2, 'Dispatch Ready': 4 },
  total: 23,
};

// /dashboard/overview shape (matches Dashboard.jsx expectations)
export const MOCK_DASHBOARD_OVERVIEW = {
  revenue: { total_billed: 4820000, received: 3200000, pending: 1620000 },
  crm: { leads: 24, quotations: 8 },
  production: { wo_in_progress: 6, wo_completed: 14, wastage_percentage: 3.8 },
  inventory: { low_stock_items: 2 },
  hrms: { active_employees: 47 },
  quality: { qc_pass_rate: 96, open_complaints: 3 },
};

// /dashboard/revenue-analytics shape
export const MOCK_REVENUE_ANALYTICS = {
  daily_revenue: {
    '2026-06-01': 180000, '2026-06-02': 220000, '2026-06-03': 195000,
    '2026-06-04': 310000, '2026-06-05': 275000, '2026-06-06': 340000,
    '2026-06-07': 290000, '2026-06-08': 185000, '2026-06-09': 410000,
    '2026-06-10': 380000,
  },
  monthly_total: 4820000,
  trend: 'up',
};

// Legacy alias
export const MOCK_DASHBOARD = MOCK_DASHBOARD_OVERVIEW;

export const MOCK_LEADS = [
  { id: 'LEAD-001', name: 'Vikas Industries', contact: 'Vikas Shah', phone: '9876543210', city: 'Pune', source: 'Website', status: 'New', score: 68 },
  { id: 'LEAD-002', name: 'Bharat Packaging', contact: 'Bharat Patel', phone: '9988776655', city: 'Ahmedabad', source: 'Referral', status: 'Contacted', score: 82 },
  { id: 'LEAD-003', name: 'Sunrise Labels', contact: 'Sunita Rao', phone: '9123456789', city: 'Hyderabad', source: 'Exhibition', status: 'Qualified', score: 75 },
];

export const MOCK_EMPLOYEES = [
  { id: 'EMP-001', name: 'Ramesh Kumar', dept: 'Production', designation: 'Machine Operator', location: 'Badwani', salary: 22000 },
  { id: 'EMP-002', name: 'Suresh Patel', dept: 'Production', designation: 'Machine Operator', location: 'Sangrampur', salary: 22000 },
  { id: 'EMP-003', name: 'Anita Singh', dept: 'Sales', designation: 'Sales Executive', location: 'HO', salary: 35000 },
  { id: 'EMP-004', name: 'Meena Rao', dept: 'QC', designation: 'QC Inspector', location: 'Sangrampur', salary: 28000 },
  { id: 'EMP-005', name: 'Dev Thakur', dept: 'Maintenance', designation: 'Technician', location: 'Badwani', salary: 24000 },
];

export const MOCK_ACCOUNTS = {
  stats: { total_receivable: 580000, total_payable: 210000, cash_balance: 1240000, overdue: 145000 },
  invoices: [
    { id: 'INV-2026-0041', customer: 'Ashok Packaging', amount: 185000, due: '2026-06-15', status: 'Unpaid' },
    { id: 'INV-2026-0040', customer: 'Prime Converters', amount: 240000, due: '2026-06-10', status: 'Partial' },
    { id: 'INV-2026-0039', customer: 'Star Labels Pvt', amount: 98000, due: '2026-05-28', status: 'Overdue' },
    { id: 'INV-2026-0038', customer: 'Rajesh Laminates', amount: 72000, due: '2026-06-20', status: 'Unpaid' },
    { id: 'INV-2026-0037', customer: 'Global Stickers', amount: 35000, due: '2026-06-25', status: 'Paid' },
  ],
  payments: [
    { id: 'PAY-001', from: 'Prime Converters', amount: 120000, date: '2026-06-02', mode: 'NEFT' },
    { id: 'PAY-002', from: 'Ashok Packaging', amount: 95000, date: '2026-06-01', mode: 'Cheque' },
  ],
};

export const MOCK_INVENTORY = {
  items: MOCK_ITEMS,
  warehouses: [
    { id: 'WH-BWD', name: 'Badwani Store', items: 42, value: 1840000 },
    { id: 'WH-SGM', name: 'Sangrampur Store', items: 38, value: 1520000 },
  ],
  stock_value: 3360000,
  low_stock: MOCK_ITEMS.filter(i => i.stock < i.reorder),
};
