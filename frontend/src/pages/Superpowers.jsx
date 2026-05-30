import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Zap, Brain, Dna, Heart, Activity, GitBranch, Layers,
  Upload, FileEdit, Wand2, BarChart3, MessageSquare,
  Sparkles, ArrowRight, Star, Lock, Globe, Database,
  Users, Package, TrendingUp, Factory, DollarSign, Shield,
  ChevronRight, Gauge, Clock, Truck, Receipt
} from 'lucide-react';

const superpowers = [
  {
    id: 'collector',
    name: 'Autonomous Collector',
    tagline: 'Your AI follow-up engine',
    description: 'Proactively surfaces overdue tasks, pending approvals, at-risk deals, and business anomalies — before they become problems.',
    icon: Zap,
    href: '/collector',
    category: 'AI',
    gradient: 'from-yellow-400 to-orange-500',
    badge: 'AI-Powered',
    badgeColor: 'bg-orange-100 text-orange-700',
    highlights: ['Overdue invoices', 'Pending approvals', 'At-risk leads', 'Stock alerts'],
  },
  {
    id: 'ai-dashboard',
    name: 'AI BI Dashboard',
    tagline: 'Ask your data anything',
    description: 'Natural language interface to your entire ERP. Ask "What was last month\'s revenue?" or "Which customers have pending payments?" and get instant answers.',
    icon: Brain,
    href: '/ai-dashboard',
    category: 'AI',
    gradient: 'from-purple-500 to-indigo-600',
    badge: 'AI-Powered',
    badgeColor: 'bg-purple-100 text-purple-700',
    highlights: ['Natural language queries', 'Cross-module analysis', 'Trend detection', 'Smart summaries'],
  },
  {
    id: 'buying-dna',
    name: 'Buying DNA',
    tagline: 'Decode your procurement patterns',
    description: 'Deep behavioral analysis of your procurement — identifies top suppliers, price trends, order cycles, and negotiation opportunities.',
    icon: Dna,
    href: '/buying-dna',
    category: 'Intelligence',
    gradient: 'from-teal-500 to-cyan-600',
    badge: 'Intelligence',
    badgeColor: 'bg-teal-100 text-teal-700',
    highlights: ['Supplier scoring', 'Price trend analysis', 'Late payment patterns', 'Negotiation insights'],
  },
  {
    id: 'customer-health',
    name: 'Customer Health',
    tagline: 'Know before they leave',
    description: 'Risk-scores every customer based on payment history, order frequency, and engagement signals. Identify churn risk before it happens.',
    icon: Heart,
    href: '/customer-health',
    category: 'Intelligence',
    gradient: 'from-pink-500 to-rose-600',
    badge: 'Intelligence',
    badgeColor: 'bg-pink-100 text-pink-700',
    highlights: ['Churn prediction', 'Health scoring', 'Payment behavior', 'Engagement tracking'],
  },
  {
    id: 'business-pulse',
    name: 'Business Pulse',
    tagline: 'One screen, full picture',
    description: 'Real-time health dashboard across all 6 business dimensions. RAG-status scoring, health radar, and AI narrative in one view.',
    icon: Activity,
    href: '/business-pulse',
    category: 'Intelligence',
    gradient: 'from-emerald-500 to-green-600',
    badge: 'Intelligence',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    highlights: ['6-dimension scoring', 'Health radar', 'AI narrative', 'Live refresh'],
  },
  {
    id: 'ooda',
    name: 'OODA Loop',
    tagline: 'Think faster, decide better',
    description: 'AI-assisted strategic decision framework. Observe your live business signals, orient around patterns, decide on actions, and track execution.',
    icon: GitBranch,
    href: '/ooda',
    category: 'AI',
    gradient: 'from-blue-500 to-indigo-600',
    badge: 'AI-Powered',
    badgeColor: 'bg-blue-100 text-blue-700',
    highlights: ['Live signal board', 'AI analysis', 'Decision tracking', 'Action cycles'],
  },
  {
    id: 'architecture',
    name: 'Architecture View',
    tagline: 'See how it all connects',
    description: 'Visual system map showing all modules, data flows, technical stack, and the full AI layer — understand your ERP at a glance.',
    icon: Layers,
    href: '/architecture',
    category: 'Visibility',
    gradient: 'from-slate-500 to-slate-700',
    badge: 'Visibility',
    badgeColor: 'bg-slate-100 text-slate-700',
    highlights: ['Module map', 'Data flow diagram', 'Tech stack', 'AI layer view'],
  },
  {
    id: 'bulk-import',
    name: 'Bulk Import',
    tagline: 'Migrate data in minutes',
    description: 'Import thousands of records across any module — customers, items, employees, transactions — via Excel or CSV with smart field mapping.',
    icon: Upload,
    href: '/bulk-import',
    category: 'Power Tools',
    gradient: 'from-violet-500 to-purple-600',
    badge: 'Power Tools',
    badgeColor: 'bg-violet-100 text-violet-700',
    highlights: ['Excel/CSV upload', 'Smart field mapping', 'Validation preview', 'All modules'],
  },
  {
    id: 'customization',
    name: 'Custom Fields',
    tagline: 'Make the ERP yours',
    description: 'Add custom fields to any module without code changes. Text, numbers, dropdowns, dates — all searchable and reportable.',
    icon: Wand2,
    href: '/customization',
    category: 'Power Tools',
    gradient: 'from-fuchsia-500 to-pink-600',
    badge: 'Power Tools',
    badgeColor: 'bg-fuchsia-100 text-fuchsia-700',
    highlights: ['Any module', 'Multiple field types', 'No code needed', 'Reportable'],
  },
  {
    id: 'analytics',
    name: 'Reports & Analytics',
    tagline: 'Data that tells a story',
    description: 'Fully customizable report builder with charts, filters, date ranges, and export. Build any report you need without developer help.',
    icon: BarChart3,
    href: '/analytics',
    category: 'Visibility',
    gradient: 'from-amber-500 to-orange-600',
    badge: 'Visibility',
    badgeColor: 'bg-amber-100 text-amber-700',
    highlights: ['Custom report builder', 'Charts & tables', 'Export to Excel', 'Date range filters'],
  },
  {
    id: 'chat',
    name: 'ERP Chat',
    tagline: 'Your ERP, in conversation',
    description: 'Chat interface for querying your ERP data, getting summaries, and collaborating with your team — all in plain language.',
    icon: MessageSquare,
    href: '/chat',
    category: 'AI',
    gradient: 'from-green-500 to-teal-600',
    badge: 'AI-Powered',
    badgeColor: 'bg-green-100 text-green-700',
    highlights: ['Data queries', 'Summaries', 'Team chat', 'AI-backed'],
  },
  {
    id: 'director',
    name: 'Director Command Center',
    tagline: 'Executive-grade control',
    description: 'The command center for business owners and directors: override controls, late customer tracking, unit conversion, and landed cost calculator.',
    icon: Gauge,
    href: '/director',
    category: 'Visibility',
    gradient: 'from-red-500 to-rose-600',
    badge: 'Visibility',
    badgeColor: 'bg-red-100 text-red-700',
    highlights: ['Override controls', 'Cockpit pulse', 'Unit converter', 'Landed cost calc'],
  },
];

const categories = ['All', 'AI', 'Intelligence', 'Power Tools', 'Visibility'];

const categoryColors = {
  AI: 'bg-orange-100 text-orange-700 border-orange-200',
  Intelligence: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  'Power Tools': 'bg-violet-100 text-violet-700 border-violet-200',
  Visibility: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function Superpowers() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState('All');
  const [hoveredId, setHoveredId] = useState(null);

  const filtered = activeCategory === 'All' ? superpowers : superpowers.filter(s => s.category === activeCategory);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),_transparent_70%)]" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-accent to-orange-600 flex items-center justify-center">
              <Zap className="h-7 w-7 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-3xl font-bold font-manrope">Superpowers</h1>
              <p className="text-slate-400 text-sm">AdhesiveFlow ERP — beyond the basics</p>
            </div>
          </div>
          <p className="text-slate-300 max-w-2xl leading-relaxed">
            Your ERP does much more than track transactions. These are the capabilities that give you an unfair advantage — AI-powered insights, intelligent automation, and tools built for how adhesive businesses actually operate.
          </p>
          <div className="flex items-center gap-4 mt-5">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Sparkles className="h-4 w-4 text-accent" />
              <span>{superpowers.filter(s => s.category === 'AI').length} AI-powered features</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Star className="h-4 w-4 text-amber-400" />
              <span>{superpowers.length} total superpowers</span>
            </div>
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              activeCategory === cat
                ? 'bg-accent text-white border-accent shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {cat}
            {cat !== 'All' && (
              <span className="ml-1.5 text-xs opacity-70">
                ({superpowers.filter(s => s.category === cat).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map(power => (
          <Card
            key={power.id}
            className="border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer group overflow-hidden"
            onMouseEnter={() => setHoveredId(power.id)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => navigate(power.href)}
          >
            {/* Color strip */}
            <div className={`h-1.5 bg-gradient-to-r ${power.gradient}`} />
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${power.gradient} flex items-center justify-center mb-3`}>
                  <power.icon className="h-6 w-6 text-white" strokeWidth={1.5} />
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${power.badgeColor} border`}>
                  {power.badge}
                </span>
              </div>
              <CardTitle className="text-base font-semibold font-manrope text-slate-900">{power.name}</CardTitle>
              <p className="text-xs font-medium text-accent -mt-1">{power.tagline}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <CardDescription className="text-sm text-slate-600 leading-relaxed">
                {power.description}
              </CardDescription>
              <div className="flex flex-wrap gap-1.5">
                {power.highlights.map(h => (
                  <span key={h} className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">{h}</span>
                ))}
              </div>
              <div className={`flex items-center gap-1 text-sm font-medium transition-all ${
                hoveredId === power.id ? 'text-accent' : 'text-slate-400'
              }`}>
                <span>Open</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom CTA */}
      <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardContent className="pt-6 pb-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="font-semibold text-slate-800 font-manrope">Need a capability you don't see?</p>
            <p className="text-sm text-slate-600 mt-0.5">Use Custom Fields to extend any module, or the Doc Editor to build custom templates.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/customization')}>
              <Wand2 className="h-4 w-4 mr-1" />
              Custom Fields
            </Button>
            <Button size="sm" className="bg-accent hover:bg-accent/90" onClick={() => navigate('/document-editor')}>
              <FileEdit className="h-4 w-4 mr-1" />
              Doc Editor
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
