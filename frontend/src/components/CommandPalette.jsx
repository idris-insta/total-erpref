import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, ArrowRight, LayoutDashboard, TrendingUp, Package, Factory,
  ShoppingCart, Calculator, Users, Shield, Settings as SettingsIcon,
  Sparkles, Bot, Receipt, Heart, Dna, Zap, BarChart3, FileText,
} from 'lucide-react';

// Flat, searchable index of every destination + quick action in the app.
// Keep in sync with MainLayout navigation. keywords boost fuzzy matching.
const COMMANDS = [
  { name: 'Dashboard', href: '/dashboard', group: 'Navigate', icon: LayoutDashboard, keywords: 'home overview kpi' },
  { name: 'Director Center', href: '/director', group: 'Navigate', icon: BarChart3, keywords: 'cockpit exec' },
  { name: 'Business Pulse', href: '/business-pulse', group: 'Navigate', icon: Zap, keywords: 'health radar' },
  { name: 'OODA Loop', href: '/ooda', group: 'Navigate', icon: Sparkles, keywords: 'observe orient decide act ai' },
  { name: 'AI Action Inbox', href: '/ai-inbox', group: 'AI', icon: Bot, keywords: 'agent approval pending draft collections dunning' },
  { name: 'AI Dashboard', href: '/ai-dashboard', group: 'AI', icon: Sparkles, keywords: 'bi insights' },
  { name: 'CRM', href: '/crm', group: 'Navigate', icon: TrendingUp, keywords: 'leads quotation customers sales' },
  { name: 'Leads', href: '/leads', group: 'Navigate', icon: TrendingUp, keywords: 'pipeline prospects' },
  { name: 'Inventory', href: '/inventory', group: 'Navigate', icon: Package, keywords: 'stock items' },
  { name: 'Stock Register', href: '/inventory/stock-register', group: 'Navigate', icon: Package, keywords: 'ledger batches' },
  { name: 'Warehouses', href: '/inventory/warehouses', group: 'Navigate', icon: Package, keywords: 'godown store' },
  { name: 'Production', href: '/production', group: 'Navigate', icon: Factory, keywords: 'manufacturing wo' },
  { name: 'Production Board', href: '/production-stages', group: 'Navigate', icon: Factory, keywords: 'kanban stages machines' },
  { name: 'Procurement', href: '/procurement', group: 'Navigate', icon: ShoppingCart, keywords: 'purchase po supplier' },
  { name: 'Gatepass', href: '/gatepass', group: 'Navigate', icon: ShoppingCart, keywords: 'vehicle inward outward' },
  { name: 'Import Bridge', href: '/import-bridge', group: 'Navigate', icon: ShoppingCart, keywords: 'landing cost customs' },
  { name: 'Accounts', href: '/accounts', group: 'Navigate', icon: Calculator, keywords: 'finance invoice payment ledger' },
  { name: 'Collector', href: '/collector', group: 'Navigate', icon: Zap, keywords: 'overdue follow-up' },
  { name: 'GST Compliance', href: '/gst-compliance', group: 'Navigate', icon: Receipt, keywords: 'gstr1 gstr3b itc tax' },
  { name: 'E-Invoice', href: '/einvoice', group: 'Navigate', icon: FileText, keywords: 'irn e-way bill' },
  { name: 'HRMS', href: '/hrms', group: 'Navigate', icon: Users, keywords: 'employees attendance' },
  { name: 'Payroll', href: '/payroll', group: 'Navigate', icon: Calculator, keywords: 'salary slip pf esic' },
  { name: 'Employee Vault', href: '/employee-vault', group: 'Navigate', icon: Shield, keywords: 'documents assets' },
  { name: 'Sales Incentives', href: '/sales-incentives', group: 'Navigate', icon: TrendingUp, keywords: 'target slab payout leaderboard' },
  { name: 'Buying DNA', href: '/buying-dna', group: 'Navigate', icon: Dna, keywords: 'rhythm pattern follow-up' },
  { name: 'Customer Health', href: '/customer-health', group: 'Navigate', icon: Heart, keywords: 'score debtor risk' },
  { name: 'Analytics', href: '/analytics', group: 'Navigate', icon: BarChart3, keywords: 'reports profit sales' },
  { name: 'Quality', href: '/quality', group: 'Navigate', icon: Shield, keywords: 'inspection complaint scrap' },
  { name: 'Approvals', href: '/approvals', group: 'Navigate', icon: Shield, keywords: 'workflow pending' },
  { name: 'Reports', href: '/reports', group: 'Navigate', icon: BarChart3, keywords: 'export' },
  { name: 'Drive', href: '/drive', group: 'Navigate', icon: FileText, keywords: 'files folders' },
  { name: 'Settings', href: '/settings', group: 'Navigate', icon: SettingsIcon, keywords: 'users company config' },
  { name: 'Customization', href: '/customization', group: 'Navigate', icon: SettingsIcon, keywords: 'custom fields forms' },
  // Quick actions
  { name: 'New Lead', href: '/crm?action=new', group: 'Create', icon: TrendingUp, keywords: 'add create lead' },
  { name: 'New Sales Order', href: '/crm?action=new-so', group: 'Create', icon: ShoppingCart, keywords: 'add create order' },
  { name: 'New Work Order', href: '/production-stages?action=new', group: 'Create', icon: Factory, keywords: 'add create production' },
];

const score = (cmd, q) => {
  if (!q) return 1;
  const hay = `${cmd.name} ${cmd.group} ${cmd.keywords || ''}`.toLowerCase();
  const name = cmd.name.toLowerCase();
  if (name.startsWith(q)) return 100;
  if (name.includes(q)) return 50;
  if (hay.includes(q)) return 20;
  // subsequence match
  let i = 0;
  for (const ch of hay) if (ch === q[i]) i++;
  return i === q.length ? 5 : 0;
};

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) { setQuery(''); setActive(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return COMMANDS
      .map((c) => ({ c, s: score(c, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 12)
      .map((x) => x.c);
  }, [query]);

  useEffect(() => { if (active >= results.length) setActive(0); }, [results, active]);

  const go = (cmd) => {
    setOpen(false);
    navigate(cmd.href);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 backdrop-blur-sm pt-[12vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-gray-100">
          <Search className="h-4 w-4 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              else if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active]); }
            }}
            placeholder="Search pages or actions…  (Ctrl+K)"
            className="flex-1 h-12 outline-none text-sm text-gray-800 placeholder:text-gray-400 font-inter"
          />
        </div>
        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-6">No matches</p>
          )}
          {results.map((cmd, i) => {
            const Icon = cmd.icon || ArrowRight;
            return (
              <button
                key={cmd.href + cmd.name}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(cmd)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                  i === active ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-70" />
                <span className="flex-1 font-inter">{cmd.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-gray-400">{cmd.group}</span>
                {i === active && <ArrowRight className="h-3.5 w-3.5 text-blue-400" />}
              </button>
            );
          })}
        </div>
        <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 text-[11px] text-gray-400 font-inter">
          <span>↑↓ navigate</span><span>↵ open</span><span>esc close</span>
        </div>
      </div>
    </div>
  );
}
