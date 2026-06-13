import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  BarChart3, TrendingUp, TrendingDown, Download, Sparkles, Calendar,
  Layers, MapPin, Table as TableIcon,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { FUNCTIONS, generateReport, fmtValue, PERIOD_KEYS } from '../lib/analyticsEngine';

const COLORS = ['#2490EF', '#7C3AED', '#F59E0B', '#10B981', '#EF4444', '#06B6D4', '#EC4899'];
const PERIOD_LABEL = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };

export default function AnalyticsHub() {
  const fnKeys = Object.keys(FUNCTIONS);
  const [fn, setFn] = useState('sales');
  const [period, setPeriod] = useState('monthly');
  const [location, setLocation] = useState('All');
  const cfg = FUNCTIONS[fn];
  const [dimension, setDimension] = useState(Object.keys(cfg.dimensions)[0]);
  const [measure, setMeasure] = useState(cfg.primary);

  // when function changes, reset dimension + measure to that function's defaults
  const onFn = (key) => {
    setFn(key);
    setDimension(Object.keys(FUNCTIONS[key].dimensions)[0]);
    setMeasure(FUNCTIONS[key].primary);
  };

  const report = useMemo(
    () => generateReport({ fn, period, dimension, location }),
    [fn, period, dimension, location]
  );

  const activeMeasure = report.measures.find((m) => m.key === measure) || report.measures[0];

  const exportCSV = () => {
    const cols = report.pivot.cols;
    const head = [report.pivot.dimension, ...cols.map((c) => c.label)].join(',');
    const lines = report.pivot.rows.map((r) =>
      [r.name, ...cols.map((c) => r.cells[c.key])].join(',')
    );
    const totals = ['TOTAL', ...cols.map((c) => report.pivot.totals[c.key])].join(',');
    const csv = [head, ...lines, totals].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${fn}_${period}_${dimension}.csv`;
    a.click();
  };

  return (
    <div className="space-y-5" data-testid="analytics-hub-page">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-[#2490EF]" />
            Analytics Hub
          </h1>
          <p className="text-slate-600 mt-1">Multi-dimensional reports across every function — daily, weekly, monthly.</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 px-3 h-9 rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 text-sm">
          <Download className="h-4 w-4" />Export CSV
        </button>
      </div>

      {/* Function tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {fnKeys.map((k) => (
          <button
            key={k}
            onClick={() => onFn(k)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              fn === k ? 'bg-[#2490EF] text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {FUNCTIONS[k].label}
          </button>
        ))}
      </div>

      {/* Slicer bar */}
      <Card className="border-slate-200">
        <CardContent className="p-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-400" />
            <div className="flex rounded-md overflow-hidden border border-slate-200">
              {PERIOD_KEYS.map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs font-medium ${period === p ? 'bg-[#2490EF] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {PERIOD_LABEL[p]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-slate-400" />
            <select value={dimension} onChange={(e) => setDimension(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white text-sm px-2 text-slate-700">
              {report.meta.dimensions.map((d) => <option key={d} value={d}>By {d}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-slate-400" />
            <select value={measure} onChange={(e) => setMeasure(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white text-sm px-2 text-slate-700">
              {report.measures.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-slate-400" />
            <select value={location} onChange={(e) => setLocation(e.target.value)}
              className="h-8 rounded-md border border-slate-200 bg-white text-sm px-2 text-slate-700">
              {report.meta.locations.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {report.kpis.map((k) => (
          <Card key={k.key} className="border-slate-200">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 uppercase tracking-wide">{k.label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{k.display}</p>
              <div className={`flex items-center gap-1 text-xs mt-1 ${k.delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {k.delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {k.delta >= 0 ? '+' : ''}{k.delta}% vs prior
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI insight strip */}
      <Card className="border-[#2490EF]/30 bg-blue-50/40">
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-[#2490EF] shrink-0 mt-0.5" />
          <p className="text-sm text-slate-700">{report.insight}</p>
        </CardContent>
      </Card>

      {/* Charts: trend + breakdown */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="font-semibold text-slate-800 mb-3 text-sm">{activeMeasure.label} — {PERIOD_LABEL[period]} Trend</p>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={report.trend} margin={{ left: -10, right: 8, top: 4 }}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2490EF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2490EF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="period" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={56}
                  tickFormatter={(v) => activeMeasure.fmt === 'inr' ? '₹' + (v / 1000).toFixed(0) + 'k' : v} />
                <Tooltip formatter={(v) => fmtValue(v, activeMeasure.fmt)} />
                <Area type="monotone" dataKey={activeMeasure.key} stroke="#2490EF" strokeWidth={2} fill="url(#g)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="font-semibold text-slate-800 mb-3 text-sm">{activeMeasure.label} by {dimension}</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={report.breakdown} margin={{ left: -10, right: 8, top: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#94a3b8" interval={0} angle={-12} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" width={56}
                  tickFormatter={(v) => activeMeasure.fmt === 'inr' ? '₹' + (v / 1000).toFixed(0) + 'k' : v} />
                <Tooltip formatter={(v) => fmtValue(v, report.measures.find(m=>m.key===report.pivot.dimension)?.fmt || 'num')} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {report.breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Contribution donut + pivot */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4">
            <p className="font-semibold text-slate-800 mb-3 text-sm">Contribution Share</p>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={report.breakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {report.breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v, n, p) => `${p.payload.share}%`} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 lg:col-span-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <TableIcon className="h-4 w-4 text-slate-400" />
              <p className="font-semibold text-slate-800 text-sm">Pivot — {report.meta.label} by {dimension}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="text-left py-2 px-2 font-medium">{dimension}</th>
                    {report.pivot.cols.map((c) => (
                      <th key={c.key} className="text-right py-2 px-2 font-medium">{c.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.pivot.rows.map((r) => (
                    <tr key={r.name} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 px-2 font-medium text-slate-700">{r.name}</td>
                      {report.pivot.cols.map((c) => (
                        <td key={c.key} className="text-right py-2 px-2 text-slate-600 font-mono">
                          {fmtValue(r.cells[c.key], c.fmt)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 font-semibold bg-slate-50">
                    <td className="py-2 px-2 text-slate-800">Total</td>
                    {report.pivot.cols.map((c) => (
                      <td key={c.key} className="text-right py-2 px-2 text-slate-800 font-mono">
                        {fmtValue(report.pivot.totals[c.key], c.fmt)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
