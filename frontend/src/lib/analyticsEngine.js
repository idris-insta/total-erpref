/**
 * analyticsEngine.js — Power BI–style multi-dimensional report generator (demo mode).
 *
 * generateReport({ fn, period, dimension, location }) → {
 *   meta, kpis[], trend[], breakdown[], pivot{cols,rows,totals}, insight
 * }
 *
 * Deterministic: same inputs always produce the same numbers (seeded PRNG),
 * so the UI is stable across refreshes. When the Frappe backend is wired,
 * the same shape comes from instabiz.ib_ai.reporting.get_analytics.
 */

// ── seeded PRNG (mulberry32) ────────────────────────────────────────────────
const hash = (s) => {
  let h = 1779033703 ^ s.length;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
};
const rng = (seed) => {
  let a = hash(seed);
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const between = (r, lo, hi) => Math.round(lo + r() * (hi - lo));

// ── function catalogue: measures + dimensions + dimension members ───────────
const LOCATIONS = ['Maharashtra', 'Gujarat', 'Chennai'];

export const FUNCTIONS = {
  sales: {
    label: 'Sales',
    measures: [
      { key: 'revenue', label: 'Revenue', fmt: 'inr', base: 4800000 },
      { key: 'orders', label: 'Orders', fmt: 'num', base: 23 },
      { key: 'aov', label: 'Avg Order Value', fmt: 'inr', base: 209000 },
      { key: 'units', label: 'Units Sold', fmt: 'num', base: 16800 },
    ],
    dimensions: {
      Location: LOCATIONS,
      'Sales Person': ['Anita Singh', 'Ramesh Kumar', 'Suresh Patel', 'Meena Rao'],
      Customer: ['Ashok Packaging', 'Prime Converters', 'Rajesh Laminates', 'Star Labels', 'Global Stickers'],
      'Item Group': ['Tape', 'Film', 'Jumbo'],
      Channel: ['Direct', 'Distributor', 'Online'],
    },
    primary: 'revenue',
  },
  crm: {
    label: 'CRM',
    measures: [
      { key: 'leads', label: 'New Leads', fmt: 'num', base: 24 },
      { key: 'qualified', label: 'Qualified', fmt: 'num', base: 11 },
      { key: 'conversion', label: 'Conversion %', fmt: 'pct', base: 28 },
      { key: 'pipeline', label: 'Pipeline Value', fmt: 'inr', base: 3200000 },
    ],
    dimensions: {
      Source: ['Website', 'Referral', 'Exhibition', 'Cold Call', 'Social'],
      'Sales Person': ['Anita Singh', 'Ramesh Kumar', 'Suresh Patel', 'Meena Rao'],
      Territory: LOCATIONS,
      Status: ['New', 'Contacted', 'Qualified', 'Won', 'Lost'],
    },
    primary: 'leads',
  },
  inventory: {
    label: 'Inventory',
    measures: [
      { key: 'stock_value', label: 'Stock Value', fmt: 'inr', base: 3360000 },
      { key: 'units', label: 'Units in Stock', fmt: 'num', base: 53945 },
      { key: 'low_stock', label: 'Low-stock SKUs', fmt: 'num', base: 2 },
      { key: 'turnover', label: 'Turnover (x)', fmt: 'dec', base: 4 },
    ],
    dimensions: {
      Warehouse: ['Badwani Store', 'Sangrampur Store', 'Chennai Store'],
      'Item Group': ['Tape', 'Film', 'Jumbo'],
      UOM: ['PCS', 'SQM', 'ROLL'],
    },
    primary: 'stock_value',
  },
  production: {
    label: 'Production',
    measures: [
      { key: 'output', label: 'Output Qty', fmt: 'num', base: 47342 },
      { key: 'scrap', label: 'Scrap %', fmt: 'pct', base: 4 },
      { key: 'wo_done', label: 'WO Completed', fmt: 'num', base: 14 },
      { key: 'util', label: 'Machine Util %', fmt: 'pct', base: 83 },
    ],
    dimensions: {
      Machine: ['COAT-BWD-001', 'SLIT-SGM-001', 'LAM-BWD-001', 'PRINT-BWD-002', 'QC-SGM-001'],
      Stage: ['Coating', 'Slitting', 'Lamination', 'Printing', 'QC'],
      Location: LOCATIONS,
      Product: ['BOPP Tape', 'PET Film', 'OPP Film', 'Jumbo Roll'],
    },
    primary: 'output',
  },
  procurement: {
    label: 'Procurement',
    measures: [
      { key: 'po_value', label: 'PO Value', fmt: 'inr', base: 1800000 },
      { key: 'po_count', label: 'PO Count', fmt: 'num', base: 12 },
      { key: 'on_time', label: 'On-time %', fmt: 'pct', base: 88 },
      { key: 'suppliers', label: 'Active Suppliers', fmt: 'num', base: 8 },
    ],
    dimensions: {
      Supplier: ['Supreme Polymers', 'Jiangsu Films', 'Adhesive Corp', 'PolyPack Ltd'],
      'Item Group': ['Raw Film', 'Adhesive', 'Packaging', 'Chemicals'],
      Location: LOCATIONS,
    },
    primary: 'po_value',
  },
  accounts: {
    label: 'Accounts',
    measures: [
      { key: 'receivables', label: 'Receivables', fmt: 'inr', base: 580000 },
      { key: 'collections', label: 'Collections', fmt: 'inr', base: 320000 },
      { key: 'payables', label: 'Payables', fmt: 'inr', base: 210000 },
      { key: 'overdue', label: 'Overdue', fmt: 'inr', base: 145000 },
    ],
    dimensions: {
      Customer: ['Ashok Packaging', 'Prime Converters', 'Rajesh Laminates', 'Star Labels', 'Global Stickers'],
      'Aging Bucket': ['0-30', '31-60', '61-90', '90+'],
      Location: LOCATIONS,
    },
    primary: 'receivables',
  },
  hrms: {
    label: 'HRMS',
    measures: [
      { key: 'headcount', label: 'Headcount', fmt: 'num', base: 47 },
      { key: 'attendance', label: 'Attendance %', fmt: 'pct', base: 94 },
      { key: 'overtime', label: 'Overtime Hrs', fmt: 'num', base: 320 },
      { key: 'payroll', label: 'Payroll Cost', fmt: 'inr', base: 1180000 },
    ],
    dimensions: {
      Department: ['Production', 'Sales', 'QC', 'Maintenance', 'Admin'],
      Location: LOCATIONS,
      Designation: ['Operator', 'Executive', 'Inspector', 'Technician', 'Manager'],
    },
    primary: 'headcount',
  },
  quality: {
    label: 'Quality',
    measures: [
      { key: 'inspections', label: 'Inspections', fmt: 'num', base: 42 },
      { key: 'pass_rate', label: 'Pass Rate %', fmt: 'pct', base: 96 },
      { key: 'complaints', label: 'Complaints', fmt: 'num', base: 3 },
      { key: 'rejections', label: 'Rejections', fmt: 'num', base: 8 },
    ],
    dimensions: {
      Machine: ['COAT-BWD-001', 'SLIT-SGM-001', 'LAM-BWD-001', 'PRINT-BWD-002'],
      'Item Group': ['Tape', 'Film', 'Jumbo'],
      'Defect Type': ['Bubble', 'Misalign', 'Color', 'Tear', 'Other'],
    },
    primary: 'inspections',
  },
};

const PERIODS = {
  daily: { label: 'Daily', buckets: 14, step: 'day' },
  weekly: { label: 'Weekly', buckets: 12, step: 'week' },
  monthly: { label: 'Monthly', buckets: 12, step: 'month' },
};

// period scaling — daily numbers are a fraction of the monthly base
const PERIOD_SCALE = { daily: 1 / 22, weekly: 7 / 30, monthly: 1 };

// ── formatting helpers ──────────────────────────────────────────────────────
export const fmtValue = (v, fmt) => {
  if (fmt === 'inr') return '₹' + Math.round(v).toLocaleString('en-IN');
  if (fmt === 'pct') return v.toFixed(1) + '%';
  if (fmt === 'dec') return v.toFixed(1);
  return Math.round(v).toLocaleString('en-IN');
};

const bucketLabels = (period) => {
  const { buckets, step } = PERIODS[period];
  const out = [];
  const now = new Date('2026-06-13');
  for (let i = buckets - 1; i >= 0; i--) {
    const d = new Date(now);
    if (step === 'day') d.setDate(d.getDate() - i);
    if (step === 'week') d.setDate(d.getDate() - i * 7);
    if (step === 'month') d.setMonth(d.getMonth() - i);
    if (step === 'day') out.push(d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
    else if (step === 'week') out.push('W' + (52 - i));
    else out.push(d.toLocaleDateString('en-IN', { month: 'short' }));
  }
  return out;
};

// ── core generator ──────────────────────────────────────────────────────────
export function generateReport({ fn, period, dimension, location }) {
  const cfg = FUNCTIONS[fn];
  const scale = PERIOD_SCALE[period];
  const locScale = location && location !== 'All' ? 0.34 : 1;
  const dims = cfg.dimensions[dimension] || Object.values(cfg.dimensions)[0];

  // KPI cards: each measure scaled, with period-over-period delta
  const kpis = cfg.measures.map((m) => {
    const r = rng(`${fn}|${m.key}|${period}|${location}|kpi`);
    const isRatio = ['pct', 'dec'].includes(m.fmt);
    const value = isRatio ? m.base * (0.9 + r() * 0.2) : m.base * scale * locScale * (0.85 + r() * 0.3);
    const delta = +(r() * 30 - 12).toFixed(1); // -12% .. +18%
    return { key: m.key, label: m.label, fmt: m.fmt, value, display: fmtValue(value, m.fmt), delta };
  });

  // Trend: each bucket has all measures
  const labels = bucketLabels(period);
  const trend = labels.map((lab, i) => {
    const row = { period: lab };
    cfg.measures.forEach((m) => {
      const r = rng(`${fn}|${m.key}|${period}|${location}|t${i}`);
      const isRatio = ['pct', 'dec'].includes(m.fmt);
      const v = isRatio ? m.base * (0.88 + r() * 0.24) : m.base * scale * locScale * (0.7 + r() * 0.6);
      row[m.key] = isRatio ? +v.toFixed(1) : Math.round(v);
    });
    return row;
  });

  // Breakdown by selected dimension (primary measure) + share %
  const pm = cfg.measures.find((m) => m.key === cfg.primary);
  let breakdown = dims.map((name) => {
    const r = rng(`${fn}|${cfg.primary}|${period}|${location}|${name}`);
    const isRatio = ['pct', 'dec'].includes(pm.fmt);
    const v = isRatio ? pm.base * (0.85 + r() * 0.3) : pm.base * scale * locScale * (0.3 + r() * 1.2) / dims.length * 2;
    return { name, value: isRatio ? +v.toFixed(1) : Math.round(v) };
  }).sort((a, b) => b.value - a.value);
  const tot = breakdown.reduce((s, x) => s + x.value, 0) || 1;
  breakdown = breakdown.map((x) => ({ ...x, share: +((x.value / tot) * 100).toFixed(1) }));

  // Pivot: rows = dimension members, cols = all measures
  const pivot = {
    dimension,
    cols: cfg.measures.map((m) => ({ key: m.key, label: m.label, fmt: m.fmt })),
    rows: dims.map((name) => {
      const cells = {};
      cfg.measures.forEach((m) => {
        const r = rng(`${fn}|${m.key}|${period}|${location}|piv|${name}`);
        const isRatio = ['pct', 'dec'].includes(m.fmt);
        const v = isRatio ? m.base * (0.85 + r() * 0.3) : m.base * scale * locScale * (0.2 + r() * 0.9) / dims.length * 2.2;
        cells[m.key] = isRatio ? +v.toFixed(1) : Math.round(v);
      });
      return { name, cells };
    }),
  };
  pivot.totals = {};
  cfg.measures.forEach((m) => {
    const isRatio = ['pct', 'dec'].includes(m.fmt);
    const vals = pivot.rows.map((row) => row.cells[m.key]);
    pivot.totals[m.key] = isRatio
      ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1)
      : vals.reduce((s, v) => s + v, 0);
  });

  // AI insight narrative
  const top = breakdown[0];
  const bottom = breakdown[breakdown.length - 1];
  const kpi0 = kpis[0];
  const dir = kpi0.delta >= 0 ? 'up' : 'down';
  const insight =
    `${cfg.label} ${kpi0.label.toLowerCase()} is ${kpi0.display} (${kpi0.delta >= 0 ? '+' : ''}${kpi0.delta}% vs prior ${period.replace('ly', '')}). ` +
    `${top.name} leads by ${dimension.toLowerCase()} at ${fmtValue(top.value, pm.fmt)} (${top.share}% share); ` +
    `${bottom.name} trails at ${fmtValue(bottom.value, pm.fmt)}. ` +
    `Trend is ${dir} over the last ${PERIODS[period].buckets} ${period === 'monthly' ? 'months' : period === 'weekly' ? 'weeks' : 'days'}.`;

  return {
    meta: { fn, label: cfg.label, period, periodLabel: PERIODS[period].label, dimension, dimensions: Object.keys(cfg.dimensions), location: location || 'All', locations: ['All', ...LOCATIONS] },
    measures: cfg.measures,
    kpis, trend, breakdown, pivot, insight,
  };
}

export const PERIOD_KEYS = Object.keys(PERIODS);
