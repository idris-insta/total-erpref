import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Factory, ShoppingCart, Calculator, Users, Shield,
  Settings, Menu, X, LogOut, TrendingUp, Boxes, Wand2, ClipboardCheck, BarChart3,
  Gauge, Truck, Banknote, Ship, FolderLock, Trophy, Receipt, PieChart, Clock,
  Layers, FileEdit, Sliders, Brain, ChevronDown, ChevronRight, MessageSquare,
  HardDrive, Upload, FileText, Zap, Dna, Search, Star, StarOff, Heart, Warehouse,
  ClipboardList, ArrowRightLeft, Activity, GitBranch, Sparkles, Network, Bot,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { cn } from '../../lib/utils';
import NotificationCenter from '../NotificationCenter';
import CommandPalette from '../CommandPalette';

// ── Frappe UI palette (mirrors frappe-ui CSS vars) ──────────────────────────
// Sidebar:  white bg, gray-700 text, blue-500 active
// Body:     #F8F9FA bg, white cards
// Primary:  #2490EF (Frappe blue)
// ────────────────────────────────────────────────────────────────────────────

const NavGroup = ({ group, location, setIsOpen }) => {
  const [expanded, setExpanded] = useState(
    group.children.some((child) => location.pathname.startsWith(child.href))
  );
  const isGroupActive = group.children.some((child) =>
    location.pathname.startsWith(child.href)
  );

  return (
    <div className="space-y-0.5">
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded text-sm font-medium transition-colors',
          isGroupActive
            ? 'bg-blue-50 text-blue-600'
            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
        )}
      >
        <div className="flex items-center gap-2">
          <group.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
          <span className="font-inter">{group.name}</span>
        </div>
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>

      {expanded && (
        <div className="ml-5 pl-3 border-l border-gray-200 space-y-0.5">
          {group.children.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />
                <span className="font-inter">{item.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

const Sidebar = ({ isOpen, setIsOpen }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState(() => {
    const saved = localStorage.getItem('sidebar_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  const flattenNav = (items) => {
    let flat = [];
    items.forEach((item) => {
      if (item.type === 'group' && item.children) {
        flat = flat.concat(item.children.map((c) => ({ ...c, parent: item.name })));
      } else if (item.type === 'link') {
        flat.push(item);
      }
    });
    return flat;
  };

  const toggleFavorite = (href) => {
    const nf = favorites.includes(href)
      ? favorites.filter((f) => f !== href)
      : [...favorites, href];
    setFavorites(nf);
    localStorage.setItem('sidebar_favorites', JSON.stringify(nf));
  };

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, type: 'link' },
    { name: 'Director Center', href: '/director', icon: Gauge, type: 'link' },
    { name: 'AI Inbox', href: '/ai-inbox', icon: Bot, type: 'link' },
    { name: 'Business Pulse', href: '/business-pulse', icon: Activity, type: 'link' },
    { name: 'OODA Loop', href: '/ooda', icon: GitBranch, type: 'link' },
    { name: 'Superpowers', href: '/superpowers', icon: Sparkles, type: 'link' },
    { name: 'Architecture', href: '/architecture', icon: Network, type: 'link' },
    { name: 'CRM', href: '/crm', icon: TrendingUp, type: 'link' },
    {
      name: 'Inventory', icon: Boxes, type: 'group',
      children: [
        { name: 'Stock & Items', href: '/inventory', icon: Package },
        { name: 'Warehouses', href: '/inventory/warehouses', icon: Warehouse },
        { name: 'Stock Register', href: '/inventory/stock-register', icon: ClipboardList },
        { name: 'Stock Transfers', href: '/inventory/stock-transfers', icon: ArrowRightLeft },
        { name: 'Adjustments', href: '/inventory/stock-adjustments', icon: ClipboardCheck },
        { name: 'Advanced', href: '/advanced-inventory', icon: Layers },
      ],
    },
    {
      name: 'Production', icon: Factory, type: 'group',
      children: [
        { name: 'Overview', href: '/production', icon: Factory },
        { name: 'Production Board', href: '/production-stages', icon: ClipboardList },
        { name: 'Machines', href: '/production-stages/machines', icon: Layers },
        { name: 'Order Sheets', href: '/production-stages/order-sheets', icon: Package },
        { name: 'DPR Reports', href: '/production-stages/reports', icon: BarChart3 },
      ],
    },
    {
      name: 'Procurement', icon: ShoppingCart, type: 'group',
      children: [
        { name: 'Purchase Orders', href: '/procurement', icon: ShoppingCart },
        { name: 'Gatepass', href: '/gatepass', icon: Truck },
        { name: 'Import Bridge', href: '/import-bridge', icon: Ship },
      ],
    },
    { name: 'Accounts', href: '/accounts', icon: Calculator, type: 'link' },
    { name: 'Finance Intelligence', href: '/finance', icon: Calculator, type: 'link' },
    { name: 'Collector', href: '/collector', icon: Zap, type: 'link' },
    {
      name: 'HRMS', icon: Users, type: 'group',
      children: [
        { name: 'Employees', href: '/hrms', icon: Users },
        { name: 'HR Dashboard', href: '/hrms-dashboard', icon: Clock },
        { name: 'Payroll', href: '/payroll', icon: Banknote },
        { name: 'Employee Vault', href: '/employee-vault', icon: FolderLock },
      ],
    },
    { name: 'Sales Incentives', href: '/sales-incentives', icon: Trophy, type: 'link' },
    { name: 'GST Compliance', href: '/gst-compliance', icon: Receipt, type: 'link' },
    { name: 'E-Invoice', href: '/einvoice', icon: FileText, type: 'link' },
    { name: 'Buying DNA', href: '/buying-dna', icon: Dna, type: 'link' },
    { name: 'Customer Health', href: '/customer-health', icon: Heart, type: 'link' },
    { name: 'Analytics Hub', href: '/analytics-hub', icon: BarChart3, type: 'link' },
    { name: 'Analytics', href: '/analytics', icon: PieChart, type: 'link' },
    { name: 'AI Dashboard', href: '/ai-dashboard', icon: Brain, type: 'link' },
    { name: 'Quality', href: '/quality', icon: Shield, type: 'link' },
    { name: 'Approvals', href: '/approvals', icon: ClipboardCheck, type: 'link' },
    { name: 'Reports', href: '/reports', icon: BarChart3, type: 'link' },
    { name: 'Chat', href: '/chat', icon: MessageSquare, type: 'link' },
    { name: 'Drive', href: '/drive', icon: HardDrive, type: 'link' },
    { name: 'Bulk Import', href: '/bulk-import', icon: Upload, type: 'link' },
    { name: 'Field Registry', href: '/field-registry', icon: Layers, type: 'link' },
    { name: 'Customization', href: '/customization', icon: Wand2, type: 'link' },
    { name: 'Power Settings', href: '/power-settings', icon: Sliders, type: 'link' },
    { name: 'Doc Editor', href: '/document-editor', icon: FileEdit, type: 'link' },
    { name: 'Settings', href: '/settings', icon: Settings, type: 'link' },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/30 z-40 md:hidden transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* ── Frappe-style sidebar ────────────────────────────── */}
      <aside
        className={cn(
          'fixed md:sticky top-0 left-0 z-50 h-screen w-60 bg-white border-r border-gray-200 transition-transform duration-200 flex flex-col',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Logo / App name */}
        <div className="h-14 flex items-center gap-3 px-4 border-b border-gray-200">
          <div className="h-7 w-7 rounded bg-[#2490EF] flex items-center justify-center shrink-0">
            <Factory className="h-4 w-4 text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 font-inter leading-tight">InstaBiz ERP</p>
            <p className="text-[10px] text-gray-400 font-inter leading-tight">Powered by Frappe</p>
          </div>
        </div>

        {/* Search */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              placeholder="Search menu…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-sm bg-gray-50 border-gray-200 text-gray-700 placeholder:text-gray-400 font-inter"
              data-testid="sidebar-search"
            />
          </div>
        </div>

        {/* Favorites */}
        {favorites.length > 0 && !searchTerm && (
          <div className="px-3 pt-3 pb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1 px-2">Favourites</p>
            {flattenNav(navigation)
              .filter((item) => favorites.includes(item.href))
              .map((item) => (
                <Link
                  key={`fav-${item.href}`}
                  to={item.href}
                  className="flex items-center gap-2 px-2 py-1 rounded text-xs text-yellow-700 hover:bg-yellow-50"
                  onClick={() => setIsOpen(false)}
                >
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-inter">{item.name}</span>
                </Link>
              ))}
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
          {searchTerm ? (
            <div className="space-y-0.5">
              {flattenNav(navigation)
                .filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((item) => {
                  const isActive = location.pathname.startsWith(item.href);
                  return (
                    <div key={item.href} className="flex items-center gap-1">
                      <Link
                        to={item.href}
                        className={cn(
                          'flex-1 flex items-center gap-2 px-3 py-2 rounded text-sm transition-colors',
                          isActive
                            ? 'bg-blue-50 text-blue-600 font-medium'
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        )}
                        onClick={() => { setIsOpen(false); setSearchTerm(''); }}
                      >
                        <item.icon className="h-4 w-4" />
                        <span className="font-inter">{item.name}</span>
                        {item.parent && (
                          <Badge variant="outline" className="text-[10px] ml-auto border-gray-200 text-gray-400">
                            {item.parent}
                          </Badge>
                        )}
                      </Link>
                      <button
                        onClick={() => toggleFavorite(item.href)}
                        className="p-1 text-gray-300 hover:text-yellow-400"
                      >
                        {favorites.includes(item.href)
                          ? <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          : <StarOff className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  );
                })}
              {flattenNav(navigation).filter((i) => i.name.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && (
                <p className="text-gray-400 text-xs text-center py-4">No results</p>
              )}
            </div>
          ) : (
            navigation.map((item) => {
              if (item.type === 'group') {
                return <NavGroup key={item.name} group={item} location={location} setIsOpen={setIsOpen} />;
              }
              const isActive = location.pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                  <span className="font-inter">{item.name}</span>
                </Link>
              );
            })
          )}
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t border-gray-200">
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="h-7 w-7 rounded-full bg-[#2490EF] flex items-center justify-center text-white font-bold text-xs shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-800 truncate font-inter">{user?.name}</p>
              <p className="text-[10px] text-gray-400 truncate font-inter capitalize">{user?.role}</p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            size="sm"
            className="w-full justify-start text-gray-500 hover:text-gray-800 hover:bg-gray-100 text-xs h-8"
            data-testid="logout-button"
          >
            <LogOut className="h-3.5 w-3.5 mr-2" />
            <span className="font-inter">Logout</span>
          </Button>
        </div>
      </aside>
    </>
  );
};

const MainLayout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* ── Frappe-style top bar ────────────────────────────── */}
        <header className="h-12 border-b border-gray-200 bg-white flex items-center px-4 justify-between sticky top-0 z-30">
          <button
            className="md:hidden p-1.5 rounded hover:bg-gray-100"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="mobile-menu-button"
          >
            {sidebarOpen ? <X className="h-5 w-5 text-gray-600" /> : <Menu className="h-5 w-5 text-gray-600" />}
          </button>
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="hidden md:flex items-center gap-2 px-3 h-8 rounded-md border border-gray-200 bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-sm ml-2"
            data-testid="command-palette-trigger"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="font-inter">Search or jump to…</span>
            <kbd className="ml-6 text-[10px] font-mono bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-400">Ctrl K</kbd>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <NotificationCenter />
          </div>
        </header>
        <CommandPalette />

        <main className="flex-1 overflow-y-auto p-5 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
