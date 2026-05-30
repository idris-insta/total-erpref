import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Layers, TrendingUp, Package, Factory, ShoppingCart, Calculator,
  Users, Shield, Settings, BarChart3, Brain, Zap, Database, ArrowRight,
  Globe, Lock, Cpu, GitBranch, Activity, Heart, Dna, FileText,
  Warehouse, Receipt, ChevronRight
} from 'lucide-react';

const modules = [
  {
    id: 'crm', name: 'CRM', icon: TrendingUp, color: 'blue', href: '/crm',
    description: 'Leads, quotations, customer accounts, and sample management',
    feeds: ['accounts', 'production', 'inventory'],
    tags: ['Sales', 'Pipeline'],
  },
  {
    id: 'inventory', name: 'Inventory', icon: Package, color: 'orange', href: '/inventory',
    description: 'Items, warehouses, stock transfers, adjustments, and reorder alerts',
    feeds: ['production', 'procurement'],
    tags: ['Stock', 'Warehouse'],
  },
  {
    id: 'production', name: 'Production', icon: Factory, color: 'purple', href: '/production',
    description: 'Work orders, machines, order sheets, DPR, and wastage tracking',
    feeds: ['inventory', 'quality'],
    tags: ['Manufacturing', 'WO'],
  },
  {
    id: 'procurement', name: 'Procurement', icon: ShoppingCart, color: 'teal', href: '/procurement',
    description: 'Purchase orders, GRN, suppliers, gatepass, and import bridge',
    feeds: ['inventory', 'accounts'],
    tags: ['Buying', 'Suppliers'],
  },
  {
    id: 'accounts', name: 'Accounts', icon: Calculator, color: 'green', href: '/accounts',
    description: 'Invoicing, payments, dimensional GL, and financial reporting',
    feeds: ['gst'],
    tags: ['Finance', 'GL'],
  },
  {
    id: 'hrms', name: 'HRMS', icon: Users, color: 'pink', href: '/hrms',
    description: 'Employees, attendance, leave, payroll, and employee vault',
    feeds: ['accounts'],
    tags: ['People', 'Payroll'],
  },
  {
    id: 'quality', name: 'Quality', icon: Shield, color: 'red', href: '/quality',
    description: 'QC inspections, customer complaints, and pass/fail tracking',
    feeds: ['production'],
    tags: ['QC', 'Compliance'],
  },
  {
    id: 'sales-incentives', name: 'Sales Incentives', icon: Receipt, color: 'amber', href: '/sales-incentives',
    description: 'Incentive slabs, targets, and payout calculations',
    feeds: ['crm', 'accounts'],
    tags: ['Incentives'],
  },
  {
    id: 'gst', name: 'GST & E-Invoice', icon: FileText, color: 'indigo', href: '/gst-compliance',
    description: 'GST compliance, e-invoicing, and GSTIN validation',
    feeds: [],
    tags: ['Tax', 'Compliance'],
  },
];

const aiModules = [
  { name: 'Autonomous Collector', icon: Zap, href: '/collector', desc: 'Proactively surfaces pending tasks and follow-ups' },
  { name: 'AI BI Dashboard', icon: Brain, href: '/ai-dashboard', desc: 'Natural language queries over all ERP data' },
  { name: 'Buying DNA', icon: Dna, href: '/buying-dna', desc: 'Procurement intelligence and supplier behavioral patterns' },
  { name: 'Customer Health', icon: Heart, href: '/customer-health', desc: 'Customer risk scoring and relationship health' },
  { name: 'Business Pulse', icon: Activity, href: '/business-pulse', desc: 'Real-time cross-module health dashboard' },
  { name: 'OODA Loop', icon: GitBranch, href: '/ooda', desc: 'AI-assisted strategic decision-making framework' },
];

const colorMap = {
  blue: 'bg-blue-50 border-blue-200 text-blue-700',
  orange: 'bg-orange-50 border-orange-200 text-orange-700',
  purple: 'bg-purple-50 border-purple-200 text-purple-700',
  teal: 'bg-teal-50 border-teal-200 text-teal-700',
  green: 'bg-green-50 border-green-200 text-green-700',
  pink: 'bg-pink-50 border-pink-200 text-pink-700',
  red: 'bg-red-50 border-red-200 text-red-700',
  amber: 'bg-amber-50 border-amber-200 text-amber-700',
  indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
};

const iconColorMap = {
  blue: 'text-blue-600', orange: 'text-orange-600', purple: 'text-purple-600',
  teal: 'text-teal-600', green: 'text-green-600', pink: 'text-pink-600',
  red: 'text-red-600', amber: 'text-amber-600', indigo: 'text-indigo-600',
};

const ModuleCard = ({ mod, onClick }) => {
  const colors = colorMap[mod.color] || colorMap.blue;
  const iconColor = iconColorMap[mod.color] || 'text-blue-600';
  return (
    <Card
      className={`border ${colors} cursor-pointer hover:shadow-md transition-all group`}
      onClick={() => onClick(mod.href)}
    >
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div className="flex items-center gap-2">
          <mod.icon className={`h-5 w-5 ${iconColor}`} strokeWidth={1.5} />
          <CardTitle className="text-sm font-semibold text-slate-800">{mod.name}</CardTitle>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-slate-600 leading-relaxed">{mod.description}</p>
        <div className="flex flex-wrap gap-1">
          {mod.tags.map(t => (
            <span key={t} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colors}`}>{t}</span>
          ))}
        </div>
        {mod.feeds.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <ArrowRight className="h-3 w-3" />
            <span>Feeds: {mod.feeds.map(f => modules.find(m => m.id === f)?.name || f).join(', ')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const layers = [
  {
    name: 'Presentation Layer',
    icon: Globe,
    color: 'bg-blue-600',
    items: ['React 18 + Vite', 'Tailwind CSS + shadcn/ui', 'React Router v6', 'Recharts'],
  },
  {
    name: 'API Gateway',
    icon: GitBranch,
    color: 'bg-purple-600',
    items: ['FastAPI (Python)', 'JWT Auth', 'CORS + Rate Limiting', 'REST endpoints'],
  },
  {
    name: 'Business Logic',
    icon: Cpu,
    color: 'bg-orange-600',
    items: ['Repository Pattern', 'Domain Services', 'AI/LLM Integration', 'Event Processing'],
  },
  {
    name: 'Data Layer',
    icon: Database,
    color: 'bg-green-600',
    items: ['PostgreSQL (primary)', 'SQLAlchemy ORM', 'Legacy DB bridge', 'Migrations'],
  },
  {
    name: 'Security',
    icon: Lock,
    color: 'bg-red-600',
    items: ['JWT Tokens', 'Role-based access', 'Branch isolation', 'Audit trail'],
  },
];

export default function Architecture() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState('modules');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-manrope flex items-center gap-3">
            <Layers className="h-8 w-8 text-accent" />
            System Architecture
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            AdhesiveFlow ERP — module map, data flows, and technical stack
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {['modules', 'stack', 'ai'].map(v => (
            <button
              key={v}
              onClick={() => setActiveView(v)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                activeView === v ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {v === 'ai' ? 'AI Layer' : v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {activeView === 'modules' && (
        <>
          <Card className="border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Database className="h-5 w-5 text-accent" />
                <span><strong>9 core modules</strong> sharing a unified PostgreSQL database with cross-module relationships for seamless data flow.</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {modules.map(mod => (
              <ModuleCard key={mod.id} mod={mod} onClick={(href) => navigate(href)} />
            ))}
          </div>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="font-manrope text-base flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-accent" />
                Key Data Flows
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { from: 'CRM Lead', arrow: '→', to: 'Quotation → Invoice → Payment', color: 'text-blue-600' },
                  { from: 'Purchase Order', arrow: '→', to: 'GRN → Inventory Stock → Production BOM', color: 'text-teal-600' },
                  { from: 'Work Order', arrow: '→', to: 'Production Run → QC Inspection → Delivery', color: 'text-purple-600' },
                  { from: 'Invoice', arrow: '→', to: 'GST Compliance → E-Invoice → GL Entry', color: 'text-green-600' },
                  { from: 'Employee Record', arrow: '→', to: 'Attendance → Leave → Payroll → Incentives', color: 'text-pink-600' },
                ].map((flow, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`font-semibold ${flow.color}`}>{flow.from}</span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">{flow.to}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {activeView === 'stack' && (
        <div className="space-y-4">
          <Card className="border-slate-200 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
            <CardContent className="pt-5 text-center">
              <p className="text-slate-300 text-sm">Full-stack TypeScript/Python ERP</p>
              <p className="text-2xl font-bold font-manrope mt-1">React + FastAPI + PostgreSQL</p>
            </CardContent>
          </Card>
          <div className="space-y-3">
            {layers.map(layer => (
              <Card key={layer.name} className="border-slate-200 shadow-sm overflow-hidden">
                <div className="flex">
                  <div className={`${layer.color} w-1.5 flex-shrink-0`} />
                  <div className="flex-1 p-4 flex items-center gap-4">
                    <div className={`h-10 w-10 rounded-lg ${layer.color} flex items-center justify-center flex-shrink-0`}>
                      <layer.icon className="h-5 w-5 text-white" strokeWidth={1.5} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-sm">{layer.name}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {layer.items.map(item => (
                          <Badge key={item} variant="secondary" className="text-xs">{item}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {activeView === 'ai' && (
        <div className="space-y-4">
          <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
            <CardContent className="pt-4">
              <p className="text-sm text-slate-700">
                <strong>AI Layer</strong> — 6 AI-powered features running across the ERP using LLM integrations for intelligence, automation, and decision support.
              </p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {aiModules.map(mod => (
              <Card
                key={mod.name}
                className="border-orange-200 bg-orange-50 cursor-pointer hover:shadow-md transition-all group"
                onClick={() => navigate(mod.href)}
              >
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <mod.icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
                    <CardTitle className="text-sm font-semibold text-slate-800">{mod.name}</CardTitle>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-600">{mod.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-base font-manrope flex items-center gap-2">
                <Brain className="h-5 w-5 text-accent" />
                LLM Integration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-600">
              <p>All AI features use the <strong>emergentintegrations</strong> LLM client with configurable model selection.</p>
              <p>Prompts are constructed from live database context, ensuring AI responses reflect current business state.</p>
              <p>AI endpoints are rate-protected and responses are cached where appropriate to manage costs.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
