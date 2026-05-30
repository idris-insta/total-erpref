import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import {
  Activity, TrendingUp, TrendingDown, DollarSign, Package, Factory,
  Users, Shield, RefreshCw, Sparkles, AlertTriangle, CheckCircle,
  Clock, Target, Zap, BarChart3, ArrowUp, ArrowDown, Minus
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';

const statusConfig = {
  green: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', label: 'Healthy' },
  amber: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', label: 'Watch' },
  red: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', label: 'Alert' },
};

const PulseCard = ({ title, value, sub, status, icon: Icon, trend, score }) => {
  const cfg = statusConfig[status] || statusConfig.green;
  const TrendIcon = trend > 0 ? ArrowUp : trend < 0 ? ArrowDown : Minus;
  return (
    <Card className={`border ${cfg.border} ${cfg.bg} shadow-sm hover:shadow-md transition-all`}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`h-9 w-9 rounded-lg bg-white border ${cfg.border} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${cfg.color}`} strokeWidth={1.5} />
          </div>
          <CardTitle className="text-sm font-medium text-slate-600">{title}</CardTitle>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>{cfg.label}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 font-manrope">{value}</div>
        {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        {score !== undefined && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-slate-500">
              <span>Score</span>
              <span>{score}/100</span>
            </div>
            <Progress value={score} className="h-1.5" />
          </div>
        )}
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend > 0 ? 'text-emerald-600' : trend < 0 ? 'text-red-500' : 'text-slate-500'}`}>
            <TrendIcon className="h-3 w-3" />
            <span>{trend > 0 ? '+' : ''}{trend}% vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const RADAR_DEFAULT = [
  { axis: 'Revenue', value: 0 },
  { axis: 'Production', value: 0 },
  { axis: 'Quality', value: 0 },
  { axis: 'Procurement', value: 0 },
  { axis: 'HR', value: 0 },
  { axis: 'Inventory', value: 0 },
];

export default function BusinessPulse() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiNarrative, setAiNarrative] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchPulse = async () => {
    setLoading(true);
    try {
      const [overviewRes, revenueRes] = await Promise.all([
        api.get('/dashboard/overview').catch(() => ({ data: {} })),
        api.get('/dashboard/revenue-analytics?period=month').catch(() => ({ data: {} })),
      ]);
      setData({ overview: overviewRes.data, revenue: revenueRes.data });
      setLastUpdated(new Date());
    } catch {
      toast.error('Failed to load pulse data');
    } finally {
      setLoading(false);
    }
  };

  const fetchNarrative = async () => {
    setAiLoading(true);
    try {
      const res = await api.get('/dashboard/ai-insights');
      setAiNarrative(res.data?.insights || '');
    } catch {
      setAiNarrative('AI narrative temporarily unavailable.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchPulse();
    const t = setInterval(fetchPulse, 120000);
    return () => clearInterval(t);
  }, []);

  const ov = data?.overview || {};
  const rev = data?.revenue || {};

  const totalRevenue = ov?.revenue?.total_billed || 0;
  const pendingRevenue = ov?.revenue?.pending || 0;
  const collectionRate = totalRevenue > 0 ? Math.round(((totalRevenue - pendingRevenue) / totalRevenue) * 100) : 0;
  const qcPass = ov?.quality?.qc_pass_rate || 0;
  const wastage = ov?.production?.wastage_percentage || 0;
  const productionScore = Math.max(0, Math.round(100 - wastage * 5));
  const lowStock = ov?.inventory?.low_stock_items || 0;
  const inventoryScore = Math.max(0, 100 - lowStock * 5);
  const activeLeads = ov?.crm?.leads || 0;

  const radarData = [
    { axis: 'Revenue', value: Math.min(100, collectionRate) },
    { axis: 'Production', value: productionScore },
    { axis: 'Quality', value: qcPass },
    { axis: 'Procurement', value: 75 },
    { axis: 'HR', value: ov?.hrms?.active_employees > 0 ? 80 : 50 },
    { axis: 'Inventory', value: inventoryScore },
  ];

  const revenueChartData = Object.entries(rev?.daily_revenue || {}).slice(-14).map(([date, amount]) => ({
    date: date.slice(5),
    amount,
  }));

  const overallScore = Math.round(radarData.reduce((a, b) => a + b.value, 0) / radarData.length);
  const overallStatus = overallScore >= 75 ? 'green' : overallScore >= 50 ? 'amber' : 'red';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-manrope flex items-center gap-3">
            <Activity className="h-8 w-8 text-accent" />
            Business Pulse
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Live health snapshot across all business dimensions
            {lastUpdated && <span className="ml-2 text-slate-400">· Updated {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchPulse} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={fetchNarrative} disabled={aiLoading} className="bg-accent hover:bg-accent/90">
            <Sparkles className="h-4 w-4 mr-1" />
            {aiLoading ? 'Analyzing...' : 'AI Narrative'}
          </Button>
        </div>
      </div>

      {/* Overall Score Banner */}
      <Card className={`border ${statusConfig[overallStatus].border} ${statusConfig[overallStatus].bg}`}>
        <CardContent className="pt-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Overall Business Health</p>
              <div className="text-5xl font-bold font-manrope mt-1" style={{ color: overallStatus === 'green' ? '#059669' : overallStatus === 'amber' ? '#d97706' : '#dc2626' }}>
                {overallScore}<span className="text-2xl text-slate-400">/100</span>
              </div>
            </div>
            <div className="text-right">
              <Badge className={`text-base px-4 py-1.5 ${statusConfig[overallStatus].badge}`}>
                {overallStatus === 'green' ? '✓ Healthy' : overallStatus === 'amber' ? '⚠ Needs Attention' : '✗ Critical Issues'}
              </Badge>
              <p className="text-xs text-slate-500 mt-2">Based on 6 business dimensions</p>
            </div>
          </div>
          <Progress value={overallScore} className="mt-4 h-2" />
        </CardContent>
      </Card>

      {/* Domain Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <PulseCard
          title="Revenue & Collection"
          value={`₹${totalRevenue.toLocaleString('en-IN')}`}
          sub={`${collectionRate}% collected · ₹${pendingRevenue.toLocaleString('en-IN')} pending`}
          status={collectionRate >= 70 ? 'green' : collectionRate >= 40 ? 'amber' : 'red'}
          icon={DollarSign}
          score={collectionRate}
        />
        <PulseCard
          title="Production Efficiency"
          value={`${wastage}% wastage`}
          sub={`${ov?.production?.wo_in_progress || 0} WOs in progress · ${ov?.production?.wo_completed || 0} completed`}
          status={wastage < 5 ? 'green' : wastage < 15 ? 'amber' : 'red'}
          icon={Factory}
          score={productionScore}
        />
        <PulseCard
          title="Quality Control"
          value={`${qcPass}% pass rate`}
          sub={`${ov?.quality?.open_complaints || 0} open complaints`}
          status={qcPass >= 90 ? 'green' : qcPass >= 70 ? 'amber' : 'red'}
          icon={Shield}
          score={qcPass}
        />
        <PulseCard
          title="Sales Pipeline"
          value={`${activeLeads} active leads`}
          sub="CRM pipeline health"
          status={activeLeads > 10 ? 'green' : activeLeads > 3 ? 'amber' : 'red'}
          icon={TrendingUp}
          score={Math.min(100, activeLeads * 5)}
        />
        <PulseCard
          title="Inventory Health"
          value={`${lowStock} low stock`}
          sub="Items below reorder point"
          status={lowStock === 0 ? 'green' : lowStock < 5 ? 'amber' : 'red'}
          icon={Package}
          score={inventoryScore}
        />
        <PulseCard
          title="Workforce"
          value={`${ov?.hrms?.active_employees || 0} active`}
          sub="Employees on record"
          status="green"
          icon={Users}
          score={80}
        />
      </div>

      {/* Radar + Revenue Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-manrope flex items-center gap-2">
              <Target className="h-5 w-5 text-accent" />
              Health Radar
            </CardTitle>
            <CardDescription>Scores across all business dimensions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={loading ? RADAR_DEFAULT : radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="axis" tick={{ fontSize: 12, fill: '#64748b' }} />
                <Radar name="Score" dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="font-manrope flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-accent" />
              Revenue Trend (14 days)
            </CardTitle>
            <CardDescription>Daily billed revenue</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={revenueChartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']} />
                <Area type="monotone" dataKey="amount" stroke="#f97316" strokeWidth={2} fill="url(#revGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Narrative */}
      {aiNarrative && (
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 shadow-sm">
          <CardHeader>
            <CardTitle className="font-manrope flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              AI Business Narrative
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="flex items-center gap-3 py-4 text-slate-500">
                <div className="animate-spin h-5 w-5 border-2 border-accent border-t-transparent rounded-full" />
                Analyzing business data...
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-sm text-slate-800 font-inter leading-relaxed">{aiNarrative}</pre>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
