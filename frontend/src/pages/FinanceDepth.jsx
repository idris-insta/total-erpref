import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { TrendingUp, Wallet, ShieldAlert, Landmark, Upload, RefreshCw } from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

const TABS = [
  { id: 'cashflow', label: 'Cash-Flow', icon: Wallet },
  { id: 'profit', label: 'Profitability', icon: TrendingUp },
  { id: 'credit', label: 'Credit Risk', icon: ShieldAlert },
  { id: 'bank', label: 'Bank Reconciliation', icon: Landmark },
];

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const bandColor = { Green: 'bg-emerald-100 text-emerald-700', Amber: 'bg-amber-100 text-amber-700', Red: 'bg-red-100 text-red-700' };

export default function FinanceDepth() {
  const [tab, setTab] = useState('cashflow');
  return (
    <div className="space-y-6" data-testid="finance-depth-page">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Wallet className="h-8 w-8 text-[#2490EF]" />Finance Intelligence
        </h1>
        <p className="text-slate-600 mt-1">Cash-flow forecast, profitability, credit risk, and bank reconciliation.</p>
      </div>
      <div className="flex gap-2 flex-wrap border-b border-slate-200">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium flex items-center gap-2 border-b-2 -mb-px transition-colors ${
                tab === t.id ? 'border-[#2490EF] text-[#2490EF]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              <Icon className="h-4 w-4" />{t.label}
            </button>
          );
        })}
      </div>
      {tab === 'cashflow' && <CashFlow />}
      {tab === 'profit' && <Profit />}
      {tab === 'credit' && <Credit />}
      {tab === 'bank' && <Bank />}
    </div>
  );
}

function CashFlow() {
  const [data, setData] = useState(null);
  useEffect(() => { api.get('/finance/cashflow-forecast').then((r) => setData(r.data)).catch(() => {}); }, []);
  if (!data) return <Loading />;
  const chart = (data.buckets || []).map((b) => ({ name: b.week?.slice(5), Inflow: b.inflow, Outflow: b.outflow, Closing: b.closing }));
  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4">
        <h3 className="font-semibold text-slate-800 mb-3">13-Week Projected Balance</h3>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={chart}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
            <XAxis dataKey="name" fontSize={11} /><YAxis fontSize={11} tickFormatter={inr} width={70} />
            <Tooltip formatter={(v) => inr(v)} />
            <Area type="monotone" dataKey="Closing" stroke="#2490EF" fill="#2490EF22" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent></Card>
      <Card><CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-slate-500 border-b">
            <th className="p-3">Week</th><th className="p-3 text-right">Inflow</th><th className="p-3 text-right">Outflow</th>
            <th className="p-3 text-right">Net</th><th className="p-3 text-right">Closing</th></tr></thead>
          <tbody>{(data.buckets || []).map((b) => (
            <tr key={b.week} className="border-b last:border-0">
              <td className="p-3">{b.week}</td><td className="p-3 text-right text-emerald-600">{inr(b.inflow)}</td>
              <td className="p-3 text-right text-red-600">{inr(b.outflow)}</td>
              <td className="p-3 text-right">{inr(b.net)}</td>
              <td className={`p-3 text-right font-medium ${b.negative ? 'text-red-600' : 'text-slate-800'}`}>{inr(b.closing)}</td>
            </tr>))}</tbody>
        </table>
      </CardContent></Card>
    </div>
  );
}

function Profit() {
  const [rows, setRows] = useState(null);
  const [mode, setMode] = useState('sku');
  useEffect(() => {
    setRows(null);
    api.get(`/finance/profit/by-${mode === 'sku' ? 'sku' : 'customer'}`).then((r) => setRows(r.data || [])).catch(() => setRows([]));
  }, [mode]);
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button size="sm" variant={mode === 'sku' ? 'default' : 'outline'} onClick={() => setMode('sku')}>By SKU</Button>
        <Button size="sm" variant={mode === 'customer' ? 'default' : 'outline'} onClick={() => setMode('customer')}>By Customer</Button>
      </div>
      {!rows ? <Loading /> : rows.length === 0 ? <Empty msg="No invoiced sales yet — profitability appears once invoices exist." /> : (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 border-b">
              <th className="p-3">{mode === 'sku' ? 'Item' : 'Customer'}</th><th className="p-3 text-right">Revenue</th>
              <th className="p-3 text-right">COGS</th><th className="p-3 text-right">Gross Profit</th><th className="p-3 text-right">Margin %</th></tr></thead>
            <tbody>{rows.map((r, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-3">{r.item_name || r.customer}</td><td className="p-3 text-right">{inr(r.revenue)}</td>
                <td className="p-3 text-right">{inr(r.cogs)}</td><td className="p-3 text-right">{inr(r.gross_profit)}</td>
                <td className={`p-3 text-right font-medium ${r.margin_pct >= 30 ? 'text-emerald-600' : r.margin_pct >= 15 ? 'text-amber-600' : 'text-red-600'}`}>{r.margin_pct}%</td>
              </tr>))}</tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}

function Credit() {
  const [rows, setRows] = useState(null);
  useEffect(() => { api.get('/finance/credit-risk').then((r) => setRows(r.data || [])).catch(() => setRows([])); }, []);
  if (!rows) return <Loading />;
  return (
    <Card><CardContent className="p-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-slate-500 border-b">
          <th className="p-3">Customer</th><th className="p-3">Risk</th><th className="p-3 text-right">Score</th>
          <th className="p-3 text-right">Outstanding</th><th className="p-3 text-right">Limit</th>
          <th className="p-3 text-right">Util %</th><th className="p-3 text-right">Max Overdue</th></tr></thead>
        <tbody>{rows.map((r, i) => (
          <tr key={i} className="border-b last:border-0">
            <td className="p-3">{r.customer}</td>
            <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${bandColor[r.band]}`}>{r.band}</span></td>
            <td className="p-3 text-right font-medium">{r.score}</td><td className="p-3 text-right">{inr(r.outstanding)}</td>
            <td className="p-3 text-right">{inr(r.credit_limit)}</td><td className="p-3 text-right">{r.utilisation_pct}%</td>
            <td className="p-3 text-right">{r.max_overdue_days}d</td>
          </tr>))}</tbody>
      </table>
    </CardContent></Card>
  );
}

function Bank() {
  const [recon, setRecon] = useState(null);
  const [csv, setCsv] = useState('');
  const load = () => api.get('/finance/bank/reconciliation').then((r) => setRecon(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);
  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setCsv(reader.result);
    reader.readAsText(f);
  };
  const importCsv = async () => {
    if (!csv) return toast.error('Choose a CSV file first');
    try {
      const r = await api.post('/finance/bank/import', { csv_text: csv, bank_account: 'HDFC' });
      toast.success(`Imported ${r.data.created}, skipped ${r.data.skipped}`);
      load();
    } catch { toast.error('Import failed'); }
  };
  const match = async () => {
    try { const r = await api.post('/finance/bank/auto-match', {}); toast.success(`Matched ${r.data.matched}`); load(); }
    catch { toast.error('Match failed'); }
  };
  return (
    <div className="space-y-4">
      <Card><CardContent className="p-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer text-sm hover:bg-slate-50">
          <Upload className="h-4 w-4" /><span>{csv ? 'File loaded' : 'Choose CSV'}</span>
          <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
        </label>
        <Button size="sm" onClick={importCsv}>Import</Button>
        <Button size="sm" variant="outline" onClick={match}><RefreshCw className="h-4 w-4 mr-1" />Auto-Match</Button>
      </CardContent></Card>
      {recon && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="Total" value={recon.total} /><Stat label="Matched" value={recon.matched} />
          <Stat label="Unmatched" value={recon.unmatched} /><Stat label="Unreconciled" value={inr(recon.unreconciled_total)} />
        </div>
      )}
      {recon && (
        <Card><CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-slate-500 border-b">
              <th className="p-3">Date</th><th className="p-3">Description</th><th className="p-3 text-right">Deposit</th>
              <th className="p-3 text-right">Withdrawal</th><th className="p-3">Status</th></tr></thead>
            <tbody>{(recon.transactions || []).map((t, i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="p-3">{String(t.txn_date || '').slice(0, 10)}</td>
                <td className="p-3 max-w-xs truncate">{t.description}</td>
                <td className="p-3 text-right text-emerald-600">{t.deposit ? inr(t.deposit) : ''}</td>
                <td className="p-3 text-right text-red-600">{t.withdrawal ? inr(t.withdrawal) : ''}</td>
                <td className="p-3">{t.reconciled ? <span className="text-emerald-600 text-xs">✓ Matched</span> : <span className="text-slate-400 text-xs">Unmatched</span>}</td>
              </tr>))}
              {(!recon.transactions || recon.transactions.length === 0) && (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">No transactions. Import a bank CSV to begin.</td></tr>)}
            </tbody>
          </table>
        </CardContent></Card>
      )}
    </div>
  );
}

const Loading = () => <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 border-4 border-[#2490EF] border-t-transparent rounded-full" /></div>;
const Empty = ({ msg }) => <Card className="border-dashed"><CardContent className="py-12 text-center text-slate-400">{msg}</CardContent></Card>;
const Stat = ({ label, value }) => (
  <Card><CardContent className="p-4"><p className="text-xs text-slate-500">{label}</p><p className="text-xl font-bold text-slate-900 mt-1">{value}</p></CardContent></Card>
);
