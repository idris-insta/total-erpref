import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import {
  GitBranch, Eye, Compass, Target, Zap, Sparkles, RefreshCw,
  CheckCircle, Clock, AlertTriangle, ArrowRight, ChevronDown, ChevronUp,
  TrendingUp, Package, Factory, DollarSign, Users, Shield
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

const PHASES = [
  {
    id: 'observe',
    name: 'Observe',
    icon: Eye,
    color: 'blue',
    bg: 'bg-blue-600',
    light: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    description: 'Gather unfiltered data from all business domains — what is actually happening right now?',
  },
  {
    id: 'orient',
    name: 'Orient',
    icon: Compass,
    color: 'purple',
    bg: 'bg-purple-600',
    light: 'bg-purple-50 border-purple-200',
    text: 'text-purple-700',
    description: 'Analyze patterns, context, and meaning behind the observations — what does it mean?',
  },
  {
    id: 'decide',
    name: 'Decide',
    icon: Target,
    color: 'amber',
    bg: 'bg-amber-600',
    light: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    description: 'Select the best course of action from available options — what should we do?',
  },
  {
    id: 'act',
    name: 'Act',
    icon: Zap,
    color: 'green',
    bg: 'bg-green-600',
    light: 'bg-green-50 border-green-200',
    text: 'text-green-700',
    description: 'Execute the decision and feed results back into the next observation cycle — let\'s go.',
  },
];

const signalIcons = {
  revenue: DollarSign, production: Factory, inventory: Package,
  quality: Shield, crm: TrendingUp, hr: Users,
};

function PhaseCard({ phase, isActive, isComplete, content, onToggle, expanded }) {
  const Icon = phase.icon;
  return (
    <Card
      className={`border transition-all ${isActive ? phase.light + ' shadow-md' : isComplete ? 'border-slate-200 bg-slate-50' : 'border-slate-200'}`}
    >
      <CardHeader
        className="cursor-pointer select-none"
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full ${isActive ? phase.bg : isComplete ? 'bg-slate-400' : 'bg-slate-200'} flex items-center justify-center`}>
              {isComplete ? (
                <CheckCircle className="h-5 w-5 text-white" />
              ) : (
                <Icon className="h-5 w-5 text-white" strokeWidth={1.5} />
              )}
            </div>
            <div>
              <CardTitle className={`text-base font-manrope ${isActive ? phase.text : 'text-slate-700'}`}>
                {phase.name}
              </CardTitle>
              <CardDescription className="text-xs">{phase.description}</CardDescription>
            </div>
          </div>
          {expanded ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </CardHeader>
      {expanded && content && (
        <CardContent>
          {content}
        </CardContent>
      )}
    </Card>
  );
}

export default function OODALoop() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [activePhase, setActivePhase] = useState(0);
  const [expanded, setExpanded] = useState([true, false, false, false]);
  const [actions, setActions] = useState([]);
  const [customContext, setCustomContext] = useState('');
  const [cycleCount, setCycleCount] = useState(1);

  useEffect(() => {
    fetchSignals();
  }, []);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/overview').catch(() => ({ data: {} }));
      setOverview(res.data);
    } catch {
      // fail silently
    } finally {
      setLoading(false);
    }
  };

  const runAiOODA = async () => {
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const context = buildContext();
      const res = await api.post('/chat/message', {
        message: `You are a strategic business advisor. Using the OODA Loop framework, analyze this business situation and provide a structured response with these four sections:

**OBSERVE** — List the 3-5 most critical signals from the data below.
**ORIENT** — What patterns and root causes do these signals reveal?
**DECIDE** — What are the top 3 strategic decisions to make right now?
**ACT** — For each decision, what is the specific first action to take this week?

Business Data:
${context}

Additional Context: ${customContext || 'None provided.'}

Be specific, actionable, and concise. Format with clear headers.`,
      }).catch(() => null);

      if (res?.data?.response) {
        setAiAnalysis(res.data.response);
        setActivePhase(3);
        setExpanded([true, true, true, true]);
      } else {
        const insightsRes = await api.get('/dashboard/ai-insights');
        setAiAnalysis(buildFallbackAnalysis(overview));
      }
    } catch {
      setAiAnalysis(buildFallbackAnalysis(overview));
    } finally {
      setAiLoading(false);
    }
  };

  const buildContext = () => {
    if (!overview) return 'No data available.';
    const ov = overview;
    return [
      `Revenue: ₹${(ov?.revenue?.total_billed || 0).toLocaleString('en-IN')} billed, ₹${(ov?.revenue?.pending || 0).toLocaleString('en-IN')} pending`,
      `CRM: ${ov?.crm?.leads || 0} active leads`,
      `Production: ${ov?.production?.wo_in_progress || 0} WOs in progress, ${ov?.production?.wastage_percentage || 0}% wastage`,
      `Inventory: ${ov?.inventory?.low_stock_items || 0} items below reorder point`,
      `Quality: ${ov?.quality?.qc_pass_rate || 0}% QC pass rate, ${ov?.quality?.open_complaints || 0} open complaints`,
      `HR: ${ov?.hrms?.active_employees || 0} active employees`,
    ].join('\n');
  };

  const buildFallbackAnalysis = (ov) => {
    if (!ov) return 'Insufficient data for OODA analysis. Please ensure backend services are running.';
    const waste = ov?.production?.wastage_percentage || 0;
    const complaints = ov?.quality?.open_complaints || 0;
    const lowStock = ov?.inventory?.low_stock_items || 0;
    const pending = ov?.revenue?.pending || 0;

    return `**OBSERVE**
• Revenue collection pending: ₹${pending.toLocaleString('en-IN')}
• Production wastage at ${waste}%
• ${complaints} open quality complaints
• ${lowStock} items below stock threshold

**ORIENT**
• ${waste > 10 ? 'High wastage signals process inefficiency in production — likely material or machine calibration issues.' : 'Production wastage is within acceptable range.'}
• ${complaints > 0 ? 'Open complaints indicate a quality feedback loop that needs closing before it impacts retention.' : 'Quality complaints are clear — good customer satisfaction signal.'}
• ${pending > 0 ? 'Pending receivables suggest collection follow-up is overdue — cash flow risk.' : 'Receivables are in good shape.'}

**DECIDE**
1. ${waste > 10 ? 'Launch production efficiency review — focus on material utilization and reject root causes.' : 'Maintain production standards with weekly DPR reviews.'}
2. ${complaints > 0 ? 'Assign complaint resolution SLA — all open complaints to be closed within 48 hours.' : 'Proactively survey top 5 customers for NPS this week.'}
3. ${pending > 0 ? 'Initiate collection drive — contact all overdue accounts in next 2 business days.' : 'Focus on growing new leads to expand revenue pipeline.'}

**ACT**
• Week 1: Assign owner to each decision above
• Week 1: Set measurable KPI for each action
• Week 2: Review progress in next OODA cycle`;
  };

  const addAction = (text) => {
    if (!text.trim()) return;
    setActions(prev => [...prev, { id: Date.now(), text: text.trim(), done: false, created: new Date() }]);
  };

  const toggleAction = (id) => {
    setActions(prev => prev.map(a => a.id === id ? { ...a, done: !a.done } : a));
  };

  const signals = overview ? [
    { key: 'revenue', label: 'Revenue Pending', value: `₹${(overview?.revenue?.pending || 0).toLocaleString('en-IN')}`, severity: overview?.revenue?.pending > 100000 ? 'red' : 'green' },
    { key: 'production', label: 'Production Wastage', value: `${overview?.production?.wastage_percentage || 0}%`, severity: overview?.production?.wastage_percentage > 10 ? 'red' : overview?.production?.wastage_percentage > 5 ? 'amber' : 'green' },
    { key: 'inventory', label: 'Low Stock Items', value: `${overview?.inventory?.low_stock_items || 0} items`, severity: overview?.inventory?.low_stock_items > 5 ? 'red' : overview?.inventory?.low_stock_items > 0 ? 'amber' : 'green' },
    { key: 'quality', label: 'Open Complaints', value: `${overview?.quality?.open_complaints || 0}`, severity: overview?.quality?.open_complaints > 3 ? 'red' : overview?.quality?.open_complaints > 0 ? 'amber' : 'green' },
    { key: 'crm', label: 'Active Leads', value: `${overview?.crm?.leads || 0}`, severity: 'green' },
  ] : [];

  const toggleExpanded = (i) => {
    setExpanded(prev => prev.map((v, idx) => idx === i ? !v : v));
  };

  const phaseContents = [
    /* Observe */
    <div className="space-y-3">
      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide">Live Business Signals</p>
      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm">
          <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full" />
          Loading signals...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {signals.map(sig => {
            const Icon = signalIcons[sig.key] || Target;
            return (
              <div key={sig.key} className={`flex items-center gap-3 p-3 rounded-lg border ${
                sig.severity === 'red' ? 'bg-red-50 border-red-200' :
                sig.severity === 'amber' ? 'bg-amber-50 border-amber-200' :
                'bg-emerald-50 border-emerald-200'
              }`}>
                <Icon className={`h-4 w-4 flex-shrink-0 ${
                  sig.severity === 'red' ? 'text-red-600' :
                  sig.severity === 'amber' ? 'text-amber-600' :
                  'text-emerald-600'
                }`} />
                <div>
                  <p className="text-xs font-medium text-slate-700">{sig.label}</p>
                  <p className={`text-sm font-bold ${
                    sig.severity === 'red' ? 'text-red-700' :
                    sig.severity === 'amber' ? 'text-amber-700' :
                    'text-emerald-700'
                  }`}>{sig.value}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="pt-2">
        <p className="text-xs text-slate-500 mb-1">Additional context (optional)</p>
        <Textarea
          placeholder="Add any context not captured above — market changes, customer feedback, team issues..."
          value={customContext}
          onChange={(e) => setCustomContext(e.target.value)}
          className="text-sm h-20 resize-none"
        />
      </div>
    </div>,

    /* Orient */
    <div className="space-y-3">
      {aiAnalysis ? (
        <div className="prose prose-sm max-w-none">
          <pre className="whitespace-pre-wrap text-sm text-slate-800 font-inter leading-relaxed bg-purple-50 p-4 rounded-lg border border-purple-100">
            {aiAnalysis.split('**ORIENT**')[1]?.split('**DECIDE**')[0] || 'See full analysis below.'}
          </pre>
        </div>
      ) : (
        <p className="text-sm text-slate-500 italic">Run the AI OODA analysis to populate this phase.</p>
      )}
    </div>,

    /* Decide */
    <div className="space-y-3">
      {aiAnalysis ? (
        <pre className="whitespace-pre-wrap text-sm text-slate-800 font-inter leading-relaxed bg-amber-50 p-4 rounded-lg border border-amber-100">
          {aiAnalysis.split('**DECIDE**')[1]?.split('**ACT**')[0] || 'See full analysis below.'}
        </pre>
      ) : (
        <p className="text-sm text-slate-500 italic">Run the AI OODA analysis to populate this phase.</p>
      )}
    </div>,

    /* Act */
    <div className="space-y-4">
      {aiAnalysis ? (
        <pre className="whitespace-pre-wrap text-sm text-slate-800 font-inter leading-relaxed bg-green-50 p-4 rounded-lg border border-green-100">
          {aiAnalysis.split('**ACT**')[1] || aiAnalysis}
        </pre>
      ) : (
        <p className="text-sm text-slate-500 italic">Run the AI OODA analysis to populate this phase.</p>
      )}
      <div className="border-t pt-4">
        <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">Action Tracker</p>
        <ActionTracker actions={actions} onAdd={addAction} onToggle={toggleAction} />
      </div>
    </div>,
  ];

  const doneCount = actions.filter(a => a.done).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-manrope flex items-center gap-3">
            <GitBranch className="h-8 w-8 text-accent" />
            OODA Loop
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Observe · Orient · Decide · Act — AI-assisted strategic decision making
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">Cycle #{cycleCount}</Badge>
          <Button variant="outline" size="sm" onClick={() => { fetchSignals(); setAiAnalysis(null); setExpanded([true, false, false, false]); setCycleCount(c => c + 1); }}>
            <RefreshCw className="h-4 w-4 mr-1" />
            New Cycle
          </Button>
          <Button size="sm" onClick={runAiOODA} disabled={aiLoading || loading} className="bg-accent hover:bg-accent/90">
            <Sparkles className="h-4 w-4 mr-1" />
            {aiLoading ? 'Analyzing...' : 'Run AI OODA'}
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <Card className="border-slate-200 bg-slate-50">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-2 text-xs text-slate-500">
            <span>Cycle progress</span>
            <span>{aiAnalysis ? 'Complete' : 'Observing'}</span>
          </div>
          <Progress value={aiAnalysis ? 100 : 25} className="h-1.5" />
          <div className="flex justify-between mt-2">
            {PHASES.map((p, i) => (
              <div key={p.id} className={`flex items-center gap-1 text-xs ${i <= activePhase || aiAnalysis ? p.text : 'text-slate-400'}`}>
                <p.icon className="h-3 w-3" />
                <span className="hidden sm:inline">{p.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Full AI analysis when available */}
      {aiAnalysis && (
        <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardHeader>
            <CardTitle className="font-manrope flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-accent" />
              Full AI OODA Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm text-slate-800 font-inter leading-relaxed">{aiAnalysis}</pre>
          </CardContent>
        </Card>
      )}

      {/* Phase accordion */}
      <div className="space-y-3">
        {PHASES.map((phase, i) => (
          <PhaseCard
            key={phase.id}
            phase={phase}
            isActive={i === activePhase || !!aiAnalysis}
            isComplete={i < activePhase && !!aiAnalysis}
            content={phaseContents[i]}
            onToggle={() => toggleExpanded(i)}
            expanded={expanded[i]}
          />
        ))}
      </div>

      {/* Action count */}
      {actions.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {doneCount}/{actions.length} actions completed
              </span>
            </div>
            <Progress value={actions.length > 0 ? (doneCount / actions.length) * 100 : 0} className="w-32 h-2" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ActionTracker({ actions, onAdd, onToggle }) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    if (!input.trim()) return;
    onAdd(input);
    setInput('');
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2 text-sm rounded-md border border-slate-200 focus:outline-none focus:ring-2 focus:ring-accent/40"
          placeholder="Add a specific action item..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button size="sm" onClick={handleAdd} className="bg-green-600 hover:bg-green-700 text-white">
          <Zap className="h-4 w-4" />
        </Button>
      </div>
      {actions.map(action => (
        <div
          key={action.id}
          className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${action.done ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-200 hover:border-green-200'}`}
          onClick={() => onToggle(action.id)}
        >
          <div className={`h-4 w-4 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${action.done ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
            {action.done && <CheckCircle className="h-3 w-3 text-white" strokeWidth={3} />}
          </div>
          <span className={`text-sm ${action.done ? 'line-through text-slate-400' : 'text-slate-700'}`}>{action.text}</span>
        </div>
      ))}
    </div>
  );
}
