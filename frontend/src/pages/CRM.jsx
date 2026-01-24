import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { 
  Plus, Search, Edit, Trash2, Eye, FileText, Package as PackageIcon, 
  Beaker, Users as UsersIcon, Building2, CheckCircle, Send, Phone, 
  Mail, MapPin, Calendar, ArrowRight, TrendingUp, Clock, Filter,
  MoreVertical, RefreshCw, Download, ChevronDown, X, Check, LayoutGrid,
  FileDown, Printer, Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import api from '../lib/api';
import { toast } from 'sonner';
import LeadsPage from './LeadsPage';
import ItemSearchSelect from '../components/ItemSearchSelect';
import CustomerSearchSelect from '../components/CustomerSearchSelect';
import CustomerHealthWidget from '../components/CustomerHealthWidget';
import DocumentActions from '../components/DocumentActions';
import DynamicFormFields from '../components/DynamicRegistryForm';
import useFieldRegistry from '../hooks/useFieldRegistry';

// ==================== CRM OVERVIEW ====================
const CRMOverview = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 
    leads: 0, accounts: 0, quotations: 0, samples: 0,
    pending_quotations: 0, pending_samples: 0, quote_conversion_rate: 0,
    total_quote_value: 0, leads_by_status: {}, leads_by_source: {},
    quotes_by_status: {}, accounts_by_state: {}, top_outstanding: []
  });
  const [loading, setLoading] = useState(true);
  const [recentLeads, setRecentLeads] = useState([]);
  const [recentQuotes, setRecentQuotes] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, leadsRes, quotesRes] = await Promise.all([
        api.get('/crm/stats/overview'),
        api.get('/crm/leads'),
        api.get('/crm/quotations')
      ]);
      setStats(statsRes.data);
      setRecentLeads(leadsRes.data.slice(0, 5));
      setRecentQuotes(quotesRes.data.slice(0, 5));
    } catch (error) {
      toast.error('Failed to load CRM data');
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    new: 'bg-blue-500', contacted: 'bg-yellow-500', qualified: 'bg-green-500',
    proposal: 'bg-purple-500', negotiation: 'bg-orange-500', converted: 'bg-emerald-500', lost: 'bg-red-500',
    draft: 'bg-slate-400', sent: 'bg-blue-500', accepted: 'bg-green-500', rejected: 'bg-red-500', expired: 'bg-yellow-500'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="crm-overview">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-manrope">CRM Dashboard</h2>
          <p className="text-slate-600 mt-1 font-inter">Complete sales pipeline analytics</p>
        </div>
        <Button onClick={fetchData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/crm/leads')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <UsersIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-600">{stats.leads}</div>
                <p className="text-sm text-slate-500">Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/crm/accounts')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-green-600" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-green-600">{stats.accounts}</div>
                <p className="text-sm text-slate-500">Accounts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/crm/quotations')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-purple-600">{stats.quotations}</div>
                <p className="text-sm text-slate-500">Quotations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => navigate('/crm/samples')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Beaker className="h-6 w-6 text-orange-600" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-orange-600">{stats.samples}</div>
                <p className="text-sm text-slate-500">Samples</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Conversion Rate</span>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">{stats.quote_conversion_rate}%</div>
            <div className="h-2 bg-slate-100 rounded-full mt-2">
              <div className="h-full bg-green-500 rounded-full" style={{width: `${stats.quote_conversion_rate}%`}}></div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Total Quote Value</span>
              <FileText className="h-4 w-4 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-purple-600 font-mono">₹{(stats.total_quote_value || 0).toLocaleString('en-IN')}</div>
            <p className="text-xs text-slate-500 mt-1">{stats.pending_quotations} pending quotes</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600">Samples Pending</span>
              <Clock className="h-4 w-4 text-orange-500" />
            </div>
            <div className="text-2xl font-bold text-orange-600">{stats.pending_samples}</div>
            <p className="text-xs text-slate-500 mt-1">Awaiting feedback</p>
          </CardContent>
        </Card>
  // Quotation + Samples editing

      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Status */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-manrope">Leads by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.leads_by_status || {}).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${statusColors[status] || 'bg-slate-400'}`}></div>
                  <span className="flex-1 text-sm capitalize">{status}</span>
                  <span className="font-semibold">{count}</span>
                  <div className="w-24 h-2 bg-slate-100 rounded-full">
                    <div className={`h-full rounded-full ${statusColors[status] || 'bg-slate-400'}`} 
                         style={{width: `${(count / stats.leads) * 100}%`}}></div>
                  </div>
                </div>
              ))}
              {Object.keys(stats.leads_by_status || {}).length === 0 && (
                <p className="text-slate-400 text-center py-4">No leads data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Leads by Source */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-manrope">Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.leads_by_source || {}).map(([source, count]) => (
                <div key={source} className="flex items-center gap-3">
                  <span className="flex-1 text-sm">{source}</span>
                  <span className="font-semibold">{count}</span>
                  <div className="w-24 h-2 bg-slate-100 rounded-full">
                    <div className="h-full bg-blue-500 rounded-full" 
                         style={{width: `${(count / stats.leads) * 100}%`}}></div>
                  </div>
                </div>
              ))}
              {Object.keys(stats.leads_by_source || {}).length === 0 && (
                <p className="text-slate-400 text-center py-4">No source data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quotations Analysis & Top Outstanding */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quote Status */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-manrope">Quotations by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.quotes_by_status || {}).map(([status, data]) => (
                <div key={status} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${statusColors[status] || 'bg-slate-400'}`}></div>
                    <span className="text-sm capitalize">{status}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">{data.count}</span>
                    <span className="text-sm text-slate-500 ml-2 font-mono">₹{(data.total || 0).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              ))}
              {Object.keys(stats.quotes_by_status || {}).length === 0 && (
                <p className="text-slate-400 text-center py-4">No quotation data</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Outstanding */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-manrope">Top Outstanding Accounts</CardTitle>
          </CardHeader>
          <CardContent>
            {(stats.top_outstanding || []).length === 0 ? (
              <p className="text-slate-400 text-center py-4">No outstanding accounts</p>
            ) : (
              <div className="space-y-3">
                {stats.top_outstanding.map((acc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded">
                    <div>
                      <p className="font-semibold text-sm">{acc.customer_name}</p>
                      <p className="text-xs text-slate-500">{acc.billing_city}</p>
                    </div>
                    <span className="font-bold text-red-600 font-mono">₹{(acc.receivable_amount || 0).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-manrope">Recent Leads</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/crm/leads')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No leads yet</p>
            ) : (
              <div className="space-y-2">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div>
                      <p className="font-semibold text-sm">{lead.company_name}</p>
                      <p className="text-xs text-slate-500">{lead.contact_person}</p>
                    </div>
                    <Badge className={`text-xs ${
                      lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                      lead.status === 'qualified' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-800'
                    }`}>{lead.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-manrope">Recent Quotations</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/crm/quotations')}>View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            {recentQuotes.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No quotations yet</p>
            ) : (
              <div className="space-y-2">
                {recentQuotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                    <div>
                      <p className="font-semibold text-sm font-mono">{quote.quote_number}</p>
                      <p className="text-xs text-slate-500">{quote.account_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm font-mono">₹{(quote.grand_total || 0).toLocaleString('en-IN')}</p>
                      <Badge className={`text-xs ${
                        quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        quote.status === 'sent' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-800'
                      }`}>{quote.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Health Widget */}
        <CustomerHealthWidget />
      </div>
    </div>
  );
};

// ==================== LEADS LIST (LEGACY - Now using LeadsPage) ====================

// ==================== LEADS LIST ====================
const LeadsList = () => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [formData, setFormData] = useState({
    company_name: '', contact_person: '', email: '', phone: '', mobile: '',
    address: '', city: '', state: '', pincode: '',
    source: 'IndiaMART', industry: '', product_interest: '', 
    estimated_value: '', notes: '', next_followup_date: '', followup_activity: ''
  });

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    try {
      const response = await api.get('/crm/leads');
      setLeads(response.data);
    } catch (error) {
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : null
      };
      
      if (editingLead) {
        await api.put(`/crm/leads/${editingLead.id}`, payload);
        toast.success('Lead updated successfully');
      } else {
        await api.post('/crm/leads', payload);
        toast.success('Lead created successfully');
      }
      setOpen(false);
      setEditingLead(null);
      fetchLeads();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save lead');
    }
  };

  const handleEdit = (lead) => {
    setEditingLead(lead);
    setFormData({
      company_name: lead.company_name || '',
      contact_person: lead.contact_person || '',
      email: lead.email || '',
      phone: lead.phone || '',
      mobile: lead.mobile || '',
      address: lead.address || '',
      city: lead.city || '',
      state: lead.state || '',
      pincode: lead.pincode || '',
      source: lead.source || 'IndiaMART',
      industry: lead.industry || '',
      product_interest: lead.product_interest || '',
      estimated_value: lead.estimated_value || '',
      notes: lead.notes || '',
      next_followup_date: lead.next_followup_date || '',
      followup_activity: lead.followup_activity || ''
    });
    setOpen(true);
  };

  const handleDelete = async (leadId) => {
    if (!window.confirm('Are you sure you want to delete this lead?')) return;
    try {
      await api.delete(`/crm/leads/${leadId}`);
      toast.success('Lead deleted');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to delete lead');
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    try {
      await api.put(`/crm/leads/${leadId}`, { status: newStatus });
      toast.success('Status updated');
      fetchLeads();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '', contact_person: '', email: '', phone: '', mobile: '',
      address: '', city: '', state: '', pincode: '',
      source: 'IndiaMART', industry: '', product_interest: '',
      estimated_value: '', notes: '', next_followup_date: '', followup_activity: ''
    });
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = lead.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.source === sourceFilter;
    return matchesSearch && matchesStatus && matchesSource;
  });

  if (loading) return <div className="flex items-center justify-center h-96"><div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-6" data-testid="leads-list">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-manrope">Leads Management</h2>
          <p className="text-slate-600 mt-1 font-inter">{leads.length} total leads</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setEditingLead(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 font-inter" data-testid="add-lead-button">
              <Plus className="h-4 w-4 mr-2" />Add Lead
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-manrope">{editingLead ? 'Edit Lead' : 'Create New Lead'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-inter">Company Name *</Label>
                  <Input value={formData.company_name} onChange={(e) => setFormData({...formData, company_name: e.target.value})} required data-testid="lead-company-name" />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Contact Person *</Label>
                  <Input value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} required data-testid="lead-contact-person" />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Email *</Label>
                  <Input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required data-testid="lead-email" />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Phone *</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required data-testid="lead-phone" />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Mobile</Label>
                  <Input value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Source *</Label>
                  <Select value={formData.source} onValueChange={(value) => setFormData({...formData, source: value})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IndiaMART">IndiaMART</SelectItem>
                      <SelectItem value="TradeIndia">TradeIndia</SelectItem>
                      <SelectItem value="Alibaba">Alibaba</SelectItem>
                      <SelectItem value="Google">Google Search</SelectItem>
                      <SelectItem value="Exhibition">Exhibition</SelectItem>
                      <SelectItem value="Cold Call">Cold Call</SelectItem>
                      <SelectItem value="Referral">Referral</SelectItem>
                      <SelectItem value="Website">Website</SelectItem>
                      <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="font-inter">Address</Label>
                  <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">City</Label>
                  <Input value={formData.city} onChange={(e) => setFormData({...formData, city: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">State</Label>
                  <Input value={formData.state} onChange={(e) => setFormData({...formData, state: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Pincode</Label>
                  <Input value={formData.pincode} onChange={(e) => setFormData({...formData, pincode: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-inter">Industry</Label>
                  <Select value={formData.industry} onValueChange={(value) => setFormData({...formData, industry: value})}>
                    <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                      <SelectItem value="Packaging">Packaging</SelectItem>
                      <SelectItem value="Construction">Construction</SelectItem>
                      <SelectItem value="Automotive">Automotive</SelectItem>
                      <SelectItem value="Electronics">Electronics</SelectItem>
                      <SelectItem value="FMCG">FMCG</SelectItem>
                      <SelectItem value="Pharmaceutical">Pharmaceutical</SelectItem>
                      <SelectItem value="Textile">Textile</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Product Interest</Label>
                  <Input value={formData.product_interest} onChange={(e) => setFormData({...formData, product_interest: e.target.value})} placeholder="BOPP Tape, Masking Tape, etc." />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Estimated Value (₹)</Label>
                  <Input type="number" value={formData.estimated_value} onChange={(e) => setFormData({...formData, estimated_value: e.target.value})} placeholder="50000" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-inter">Next Follow-up Date</Label>
                  <Input type="date" value={formData.next_followup_date} onChange={(e) => setFormData({...formData, next_followup_date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Follow-up Activity</Label>
                  <Select value={formData.followup_activity} onValueChange={(value) => setFormData({...formData, followup_activity: value})}>
                    <SelectTrigger><SelectValue placeholder="Select activity" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Call">Call</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="Meeting">Meeting</SelectItem>
                      <SelectItem value="Visit">Site Visit</SelectItem>
                      <SelectItem value="Sample">Send Sample</SelectItem>
                      <SelectItem value="Quote">Send Quote</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-inter">Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} placeholder="Additional information..." rows={3} />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditingLead(null); resetForm(); }}>Cancel</Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90" data-testid="lead-submit-button">{editingLead ? 'Update' : 'Create'} Lead</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="lead-search" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            <SelectItem value="IndiaMART">IndiaMART</SelectItem>
            <SelectItem value="TradeIndia">TradeIndia</SelectItem>
            <SelectItem value="Alibaba">Alibaba</SelectItem>
            <SelectItem value="Website">Website</SelectItem>
            <SelectItem value="Referral">Referral</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Company</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Est. Value</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Next Follow-up</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLeads.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-500 font-inter">
                    {searchTerm || statusFilter !== 'all' || sourceFilter !== 'all' ? 'No leads found matching filters' : 'No leads yet. Click "Add Lead" to create your first lead.'}
                  </td></tr>
                ) : (
                  filteredLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50 transition-colors" data-testid={`lead-row-${lead.id}`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 font-inter">{lead.company_name}</div>
                        <div className="text-sm text-slate-500 font-inter">{lead.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900 font-inter">{lead.contact_person}</div>
                        <div className="text-sm text-slate-500 font-mono">{lead.phone}</div>
                      </td>
                      <td className="px-4 py-3"><Badge className="bg-blue-100 text-blue-800 font-inter">{lead.source}</Badge></td>
                      <td className="px-4 py-3">
                        <Select value={lead.status} onValueChange={(val) => handleStatusChange(lead.id, val)}>
                          <SelectTrigger className="w-[120px] h-8">
                            <Badge className={`font-inter ${
                              lead.status === 'new' ? 'bg-blue-100 text-blue-800' :
                              lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-800' :
                              lead.status === 'qualified' ? 'bg-green-100 text-green-800' :
                              lead.status === 'converted' ? 'bg-purple-100 text-purple-800' : 'bg-red-100 text-red-800'
                            }`}>{lead.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-slate-900">
                        {lead.estimated_value ? `₹${lead.estimated_value.toLocaleString('en-IN')}` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {lead.next_followup_date ? (
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 text-slate-400" />
                            <span className="text-slate-600">{new Date(lead.next_followup_date).toLocaleDateString()}</span>
                          </div>
                        ) : <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(lead)} data-testid={`edit-lead-${lead.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(lead.id)} className="text-destructive" data-testid={`delete-lead-${lead.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== ACCOUNTS LIST ====================
const AccountsList = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ industry: 'all', state: 'all', hasOutstanding: 'all' });
  const [loadingGeo, setLoadingGeo] = useState(false);

  const [formData, setFormData] = useState({
    customer_name: '', account_type: 'Customer', gstin: '', pan: '',
    billing_address: '', billing_country: 'India', billing_state: '', billing_district: '', billing_city: '', billing_pincode: '',
    shipping_addresses: [{ label: 'Default', address: '', city: '', state: '', pincode: '', country: 'India' }],
    contacts: [{ name: '', designation: '', email: '', phone: '', mobile: '', is_primary: true }],
    credit_limit: '', credit_days: '30', credit_control: 'Warn',
    payment_terms: '30 days', industry: '', website: '', location: '', notes: ''
  });

  // Field Registry integration for dynamic form fields
  const { 
    formFields: registryFields, 
    loading: registryLoading, 
    sectionLabels 
  } = useFieldRegistry('crm', 'customer_accounts');
  
  // Check if we have dynamic fields from registry
  const useDynamicForm = registryFields && registryFields.length > 0;

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    try {
      const response = await api.get('/crm/accounts');
      setAccounts(response.data);
    } catch (error) {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const tryAutoFillBillingFromPincode = async (pincode) => {
    if (!pincode || pincode.length !== 6) return;
    if ((formData.billing_country || 'India').toLowerCase() !== 'india') return;

    setLoadingGeo(true);
    try {
      const res = await api.get(`/crm/geo/pincode/${pincode}`);
      setFormData((prev) => ({
        ...prev,
        billing_country: res.data?.country || prev.billing_country,
        billing_state: res.data?.state || prev.billing_state,
        billing_district: res.data?.district || prev.billing_district,
        billing_city: res.data?.city || prev.billing_city
      }));
    } catch (e) {
      // ignore
    } finally {
      setLoadingGeo(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : 0,
        credit_days: parseInt(formData.credit_days) || 30
      };
      
      if (editingAccount) {
        await api.put(`/crm/accounts/${editingAccount.id}`, payload);
        toast.success('Account updated successfully');
      } else {
        await api.post('/crm/accounts', payload);
        toast.success('Account created successfully');
      }
      setOpen(false);
      setEditingAccount(null);
      fetchAccounts();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save account');
    }
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      customer_name: account.customer_name || '',
      account_type: account.account_type || 'Customer',
      gstin: account.gstin || '',
      pan: account.pan || '',
      billing_address: account.billing_address || '',
      billing_country: account.billing_country || 'India',
      billing_state: account.billing_state || '',
      billing_district: account.billing_district || '',
      billing_city: account.billing_city || '',
      billing_pincode: account.billing_pincode || '',
      shipping_addresses: account.shipping_addresses?.length > 0 ? account.shipping_addresses : [{ label: 'Default', address: '', city: '', state: '', pincode: '', country: 'India' }],
      contacts: account.contacts?.length > 0 ? account.contacts : [{ name: '', designation: '', email: '', phone: '', mobile: '', is_primary: true }],
      credit_limit: account.credit_limit || '',
      credit_days: account.credit_days?.toString() || '30',
      credit_control: account.credit_control || 'Warn',
      payment_terms: account.payment_terms || '30 days',
      industry: account.industry || '',
      website: account.website || '',
      location: account.location || '',
      notes: account.notes || ''
    });
    setOpen(true);
  };

  const handleDelete = async (accountId) => {
    if (!window.confirm('Are you sure you want to deactivate this account?')) return;
    try {
      await api.delete(`/crm/accounts/${accountId}`);
      toast.success('Account deactivated');
      fetchAccounts();
    } catch (error) {
      toast.error('Failed to deactivate account');
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '', account_type: 'Customer', gstin: '', pan: '',
      billing_address: '', billing_country: 'India', billing_state: '', billing_district: '', billing_city: '', billing_pincode: '',
      shipping_addresses: [{ label: 'Default', address: '', city: '', state: '', pincode: '', country: 'India' }],
      contacts: [{ name: '', designation: '', email: '', phone: '', mobile: '', is_primary: true }],
      credit_limit: '', credit_days: '30', credit_control: 'Warn',
      payment_terms: '30 days', industry: '', website: '', location: '', notes: ''
    });
  };

  const addShippingAddress = () => {
    setFormData({
      ...formData,
      shipping_addresses: [...formData.shipping_addresses, { label: '', address: '', city: '', state: '', pincode: '', country: 'India' }]
    });
  };

  const addContact = () => {
    setFormData({
      ...formData,
      contacts: [...formData.contacts, { name: '', designation: '', email: '', phone: '', mobile: '', is_primary: false }]
    });
  };

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.gstin.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesIndustry = filters.industry === 'all' || acc.industry === filters.industry;
    const matchesState = filters.state === 'all' || acc.billing_state?.includes(filters.state);
    const matchesOutstanding = filters.hasOutstanding === 'all' || 
      (filters.hasOutstanding === 'yes' && (acc.receivable_amount || 0) > 0) ||
      (filters.hasOutstanding === 'no' && (acc.receivable_amount || 0) === 0);
    return matchesSearch && matchesIndustry && matchesState && matchesOutstanding;
  });

  if (loading || registryLoading) return <div className="flex items-center justify-center h-96"><div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-6" data-testid="accounts-list">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-manrope">Customer Accounts</h2>
          <p className="text-slate-600 mt-1 font-inter">{accounts.length} total accounts</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setEditingAccount(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 font-inter" data-testid="add-account-button">
              <Plus className="h-4 w-4 mr-2" />Add Account
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="font-manrope">{editingAccount ? 'Edit' : 'Create'} Account</DialogTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('/field-registry?module=crm&entity=accounts', '_blank')}
                  className="text-slate-500 hover:text-accent"
                  title="Customize form fields"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Customize Fields
                </Button>
              </div>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <Tabs defaultValue="basic" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="address">Addresses</TabsTrigger>
                  <TabsTrigger value="contacts">Contacts</TabsTrigger>
                  <TabsTrigger value="credit">Credit & Terms</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                  {useDynamicForm ? (
                    <DynamicFormFields
                      fields={registryFields.filter(f => f.section === 'basic' || !f.section)}
                      formData={formData}
                      onChange={setFormData}
                      sectionLabels={sectionLabels}
                      groupBySection={false}
                      columns={3}
                    />
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label className="font-inter">Customer Name *</Label>
                        <Input value={formData.customer_name} onChange={(e) => setFormData({...formData, customer_name: e.target.value})} required data-testid="account-customer-name" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-inter">Account Type</Label>
                        <Select value={formData.account_type} onValueChange={(value) => setFormData({...formData, account_type: value})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Customer">Customer</SelectItem>
                            <SelectItem value="Prospect">Prospect</SelectItem>
                            <SelectItem value="Partner">Partner</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-inter">Industry</Label>
                        <Select value={formData.industry} onValueChange={(value) => setFormData({...formData, industry: value})}>
                          <SelectTrigger><SelectValue placeholder="Select industry" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                            <SelectItem value="Packaging">Packaging</SelectItem>
                            <SelectItem value="Construction">Construction</SelectItem>
                            <SelectItem value="Automotive">Automotive</SelectItem>
                            <SelectItem value="Electronics">Electronics</SelectItem>
                            <SelectItem value="FMCG">FMCG</SelectItem>
                            <SelectItem value="Pharmaceutical">Pharmaceutical</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-inter">GSTIN *</Label>
                        <div className="flex gap-2">
                          <Input value={formData.gstin} onChange={(e) => setFormData({...formData, gstin: e.target.value.toUpperCase()})} placeholder="27XXXXX0000X1ZX" required data-testid="account-gstin" className="flex-1" />
                          <Button type="button" variant="outline" size="sm" onClick={async () => {
                            if (formData.gstin.length === 15) {
                              try {
                                const res = await api.get(`/crm/accounts/gst-lookup/${formData.gstin}`);
                                if (res.data.valid) {
                                  setFormData({...formData, 
                                    billing_state: res.data.state_name || formData.billing_state,
                                    pan: res.data.pan || formData.pan
                                  });
                                  toast.success(`State: ${res.data.state_name}`);
                                }
                              } catch (e) { toast.error('Invalid GSTIN'); }
                            } else { toast.error('Enter valid 15-char GSTIN'); }
                          }}>Verify</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-inter">PAN</Label>
                        <Input value={formData.pan} onChange={(e) => setFormData({...formData, pan: e.target.value.toUpperCase()})} placeholder="AAAAA0000A" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-inter">Website</Label>
                        <Input value={formData.website} onChange={(e) => setFormData({...formData, website: e.target.value})} placeholder="https://example.com" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-inter">Aadhar No</Label>
                        <Input value={formData.aadhar_no} onChange={(e) => setFormData({...formData, aadhar_no: e.target.value})} placeholder="0000 0000 0000" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-inter">Opening Balance (₹)</Label>
                        <Input type="number" value={formData.opening_balance} onChange={(e) => setFormData({...formData, opening_balance: e.target.value})} placeholder="0.00" />
                      </div>
                      <div className="col-span-3 space-y-2">
                        <Label className="font-inter">Bank Details</Label>
                        <Textarea value={formData.bank_details} onChange={(e) => setFormData({...formData, bank_details: e.target.value})} rows={2} placeholder="Bank Name, A/C No, IFSC Code" />
                      </div>
                      <div className="col-span-3 space-y-2">
                        <Label className="font-inter">Notes</Label>
                        <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} />
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="address" className="space-y-4 mt-4">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-900">Billing Address</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 space-y-2">
                        <Label className="font-inter">Address *</Label>
                        <Textarea value={formData.billing_address} onChange={(e) => setFormData({...formData, billing_address: e.target.value})} required rows={2} />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-inter">Country</Label>
                        <Input value={formData.billing_country} onChange={(e) => setFormData({...formData, billing_country: e.target.value})} placeholder="India" />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-inter">State</Label>
                        <Input value={formData.billing_state} onChange={(e) => setFormData({...formData, billing_state: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-inter">District</Label>
                        <Input value={formData.billing_district} onChange={(e) => setFormData({...formData, billing_district: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-inter">City</Label>
                        <Input value={formData.billing_city} onChange={(e) => setFormData({...formData, billing_city: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label className="font-inter">Pincode</Label>
                        <Input value={formData.billing_pincode} onChange={(e) => {
                          const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                          setFormData({...formData, billing_pincode: v});
                          if (v.length === 6) {
                            tryAutoFillBillingFromPincode(v);
                          }
                        }} />
                        {loadingGeo && <div className="text-xs text-slate-500">Auto-filling location…</div>}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 border-t pt-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-900">Shipping Addresses</h4>
                      <Button type="button" variant="outline" size="sm" onClick={addShippingAddress}>
                        <Plus className="h-4 w-4 mr-1" />Add Address
                      </Button>
                    </div>
                    {formData.shipping_addresses.map((addr, idx) => (
                      <div key={idx} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="font-inter font-semibold">Address {idx + 1}</Label>
                          {idx > 0 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => {
                              const newAddrs = formData.shipping_addresses.filter((_, i) => i !== idx);
                              setFormData({...formData, shipping_addresses: newAddrs});
                            }}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                          <div className="space-y-2">
                            <Label className="font-inter text-sm">Label</Label>
                            <Input value={addr.label} onChange={(e) => {
                              const newAddrs = [...formData.shipping_addresses];
                              newAddrs[idx].label = e.target.value;
                              setFormData({...formData, shipping_addresses: newAddrs});
                            }} placeholder="Factory, Warehouse..." />
                          </div>
                          <div className="col-span-3 space-y-2">
                            <Label className="font-inter text-sm">Address</Label>
                            <Input value={addr.address} onChange={(e) => {
                              const newAddrs = [...formData.shipping_addresses];
                              newAddrs[idx].address = e.target.value;
                              setFormData({...formData, shipping_addresses: newAddrs});
                            }} />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-inter text-sm">City</Label>
                            <Input value={addr.city} onChange={(e) => {
                              const newAddrs = [...formData.shipping_addresses];
                              newAddrs[idx].city = e.target.value;
                              setFormData({...formData, shipping_addresses: newAddrs});
                            }} />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-inter text-sm">State</Label>
                            <Input value={addr.state} onChange={(e) => {
                              const newAddrs = [...formData.shipping_addresses];
                              newAddrs[idx].state = e.target.value;
                              setFormData({...formData, shipping_addresses: newAddrs});
                            }} />
                          </div>
                          <div className="space-y-2">
                            <Label className="font-inter text-sm">Pincode</Label>
                            <Input value={addr.pincode} onChange={(e) => {
                              const newAddrs = [...formData.shipping_addresses];
                              newAddrs[idx].pincode = e.target.value;
                              setFormData({...formData, shipping_addresses: newAddrs});
                            }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="contacts" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-900">Contact Persons</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addContact}>
                      <Plus className="h-4 w-4 mr-1" />Add Contact
                    </Button>
                  </div>
                  {formData.contacts.map((contact, idx) => (
                    <div key={idx} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="font-inter font-semibold">Contact {idx + 1}</Label>
                        <div className="flex items-center gap-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={contact.is_primary} onChange={(e) => {
                              const newContacts = formData.contacts.map((c, i) => ({...c, is_primary: i === idx ? e.target.checked : false}));
                              setFormData({...formData, contacts: newContacts});
                            }} />
                            Primary
                          </label>
                          {idx > 0 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => {
                              const newContacts = formData.contacts.filter((_, i) => i !== idx);
                              setFormData({...formData, contacts: newContacts});
                            }}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label className="font-inter text-sm">Name</Label>
                          <Input value={contact.name} onChange={(e) => {
                            const newContacts = [...formData.contacts];
                            newContacts[idx].name = e.target.value;
                            setFormData({...formData, contacts: newContacts});
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-inter text-sm">Designation</Label>
                          <Input value={contact.designation} onChange={(e) => {
                            const newContacts = [...formData.contacts];
                            newContacts[idx].designation = e.target.value;
                            setFormData({...formData, contacts: newContacts});
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-inter text-sm">Email</Label>
                          <Input type="email" value={contact.email} onChange={(e) => {
                            const newContacts = [...formData.contacts];
                            newContacts[idx].email = e.target.value;
                            setFormData({...formData, contacts: newContacts});
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-inter text-sm">Phone</Label>
                          <Input value={contact.phone} onChange={(e) => {
                            const newContacts = [...formData.contacts];
                            newContacts[idx].phone = e.target.value;
                            setFormData({...formData, contacts: newContacts});
                          }} />
                        </div>
                        <div className="space-y-2">
                          <Label className="font-inter text-sm">Mobile</Label>
                          <Input value={contact.mobile} onChange={(e) => {
                            const newContacts = [...formData.contacts];
                            newContacts[idx].mobile = e.target.value;
                            setFormData({...formData, contacts: newContacts});
                          }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="credit" className="space-y-4 mt-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label className="font-inter">Credit Limit (₹)</Label>
                      <Input type="number" value={formData.credit_limit} onChange={(e) => setFormData({...formData, credit_limit: e.target.value})} placeholder="100000" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-inter">Credit Days</Label>
                      <Input type="number" value={formData.credit_days} onChange={(e) => setFormData({...formData, credit_days: e.target.value})} placeholder="30" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-inter">Credit Control</Label>
                      <Select value={formData.credit_control} onValueChange={(value) => setFormData({...formData, credit_control: value})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ignore">Ignore (No Check)</SelectItem>
                          <SelectItem value="Warn">Warn (Show Alert)</SelectItem>
                          <SelectItem value="Block">Block (Prevent Order)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-inter">Payment Terms</Label>
                      <Select value={formData.payment_terms} onValueChange={(value) => setFormData({...formData, payment_terms: value})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Advance">Advance</SelectItem>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="7 days">7 Days</SelectItem>
                          <SelectItem value="15 days">15 Days</SelectItem>
                          <SelectItem value="30 days">30 Days</SelectItem>
                          <SelectItem value="45 days">45 Days</SelectItem>
                          <SelectItem value="60 days">60 Days</SelectItem>
                          <SelectItem value="90 days">90 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-inter">Location</Label>
                      <Input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="Mumbai, Delhi..." />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditingAccount(null); resetForm(); }}>Cancel</Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90" data-testid="account-submit-button">{editingAccount ? 'Update' : 'Create'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by name or GSTIN..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="account-search" />
        </div>
        <Select value={filters?.industry || 'all'} onValueChange={(v) => setFilters({...filters, industry: v})}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Industry" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            <SelectItem value="Manufacturing">Manufacturing</SelectItem>
            <SelectItem value="Packaging">Packaging</SelectItem>
            <SelectItem value="Construction">Construction</SelectItem>
            <SelectItem value="Automotive">Automotive</SelectItem>
            <SelectItem value="FMCG">FMCG</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters?.state || 'all'} onValueChange={(v) => setFilters({...filters, state: v})}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="State" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            <SelectItem value="Maharashtra">Maharashtra</SelectItem>
            <SelectItem value="Gujarat">Gujarat</SelectItem>
            <SelectItem value="Delhi">Delhi</SelectItem>
            <SelectItem value="Karnataka">Karnataka</SelectItem>
            <SelectItem value="Tamil Nadu">Tamil Nadu</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters?.hasOutstanding || 'all'} onValueChange={(v) => setFilters({...filters, hasOutstanding: v})}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Outstanding" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            <SelectItem value="yes">With Outstanding</SelectItem>
            <SelectItem value="no">No Outstanding</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Customer</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">City/State</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">GSTIN</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Outstanding</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Credit</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Avg Days</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Salesperson</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.length === 0 ? (
                  <tr><td colSpan="8" className="px-4 py-12 text-center text-slate-500 font-inter">
                    {searchTerm ? 'No accounts found' : 'No accounts yet. Click "Add Account" to create one.'}
                  </td></tr>
                ) : (
                  filteredAccounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50 transition-colors" data-testid={`account-row-${acc.id}`}>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-slate-900 font-inter text-sm">{acc.customer_name}</div>
                        <div className="text-xs text-slate-500 font-inter">{acc.industry || '-'}</div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm text-slate-900">{acc.billing_city || '-'}</div>
                        <div className="text-xs text-slate-500">{acc.billing_state || '-'}</div>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600">{acc.gstin}</td>
                      <td className="px-3 py-3">
                        <div className={`font-mono text-sm font-semibold ${(acc.receivable_amount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {(acc.receivable_amount || 0) > 0 ? `₹${acc.receivable_amount?.toLocaleString('en-IN')}` : '₹0'}
                        </div>
                        {(acc.payable_amount || 0) > 0 && (
                          <div className="text-xs text-blue-600 font-mono">Pay: ₹{acc.payable_amount?.toLocaleString('en-IN')}</div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-mono text-sm">₹{acc.credit_limit?.toLocaleString('en-IN') || '0'}</div>
                        <Badge className="bg-slate-100 text-slate-700 text-xs">{acc.payment_terms}</Badge>
                      </td>
                      <td className="px-3 py-3 font-mono text-sm text-slate-600">
                        {acc.avg_payment_days ? `${Math.round(acc.avg_payment_days)} days` : '-'}
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-600">
                        {acc.salesperson_name || '-'}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(acc)} data-testid={`edit-account-${acc.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(acc.id)} className="text-destructive" data-testid={`delete-account-${acc.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== QUOTATIONS LIST ====================
const QuotationsList = () => {
  const [quotations, setQuotations] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingQuotation, setEditingQuotation] = useState(null);

  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    account_id: '', contact_person: '', reference: '',
    valid_until: '', transport: '', delivery_terms: '', payment_terms: '',
    terms_conditions: '', notes: '', header_discount_percent: 0,
    billing_address: '', billing_city: '', billing_state: '', billing_pincode: '',
    shipping_address: '', shipping_city: '', shipping_state: '', shipping_pincode: '',
    gstin: '',
    items: [{ item_id: '', item_name: '', description: '', hsn_code: '', quantity: 1, unit: 'Pcs', unit_price: 0, discount_percent: 0, tax_percent: 18 }]
  });

  // Field Registry integration for dynamic form fields
  const { 
    formFields: registryFields, 
    loading: registryLoading, 
    sectionLabels 
  } = useFieldRegistry('crm', 'quotations');
  
  // Check if we have dynamic fields from registry (filter to header fields only)
  const headerFields = registryFields?.filter(f => f.section === 'header' || f.section === 'basic' || !f.section) || [];
  const useDynamicForm = headerFields.length > 0;

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [quotesRes, accountsRes] = await Promise.all([
        api.get('/crm/quotations'),
        api.get('/crm/accounts')
      ]);
      setQuotations(quotesRes.data);
      setAccounts(accountsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Auto-populate customer fields when customer is selected
  const handleCustomerSelect = (customerData) => {
    setFormData(prev => ({
      ...prev,
      account_id: customerData.account_id,
      contact_person: customerData.contact_person || prev.contact_person,
      billing_address: customerData.billing_address || '',
      billing_city: customerData.billing_city || '',
      billing_state: customerData.billing_state || '',
      billing_pincode: customerData.billing_pincode || '',
      shipping_address: customerData.shipping_address || '',
      shipping_city: customerData.shipping_city || '',
      shipping_state: customerData.shipping_state || '',
      shipping_pincode: customerData.shipping_pincode || '',
      gstin: customerData.gstin || '',
      payment_terms: customerData.payment_terms || prev.payment_terms
    }));
    toast.success('Customer details auto-populated');
  };

  // Auto-populate item fields when item is selected
  const handleItemSelect = (idx, itemData) => {
    const newItems = [...formData.items];
    newItems[idx] = {
      ...newItems[idx],
      item_id: itemData.item_id,
      item_name: itemData.item_name,
      hsn_code: itemData.hsn_code || '',
      unit: itemData.uom || 'Pcs',
      unit_price: itemData.unit_price || 0,
      tax_percent: itemData.tax_percent || 18
    };
    setFormData({ ...formData, items: newItems });
    toast.success(`Item "${itemData.item_name}" auto-populated`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        header_discount_percent: parseFloat(formData.header_discount_percent) || 0,
        items: formData.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity) || 0,
          unit_price: parseFloat(item.unit_price) || 0,
          discount_percent: parseFloat(item.discount_percent) || 0,
          tax_percent: parseFloat(item.tax_percent) || 18
        }))
      };
      
      if (editingQuotation) {
        await api.put(`/crm/quotations/${editingQuotation.id}`, payload);
        toast.success('Quotation updated successfully');
      } else {
        await api.post('/crm/quotations', payload);
        toast.success('Quotation created successfully');
      }
      setOpen(false);
      setEditingQuotation(null);
      fetchData();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save quotation');
    }
  };

  const handleStatusChange = async (quoteId, newStatus) => {
    try {
      await api.put(`/crm/quotations/${quoteId}/status?status=${newStatus}`);
      toast.success('Status updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (quoteId) => {
    if (!window.confirm('Are you sure you want to delete this quotation?')) return;
    try {
      await api.delete(`/crm/quotations/${quoteId}`);
      toast.success('Quotation deleted');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to delete quotation');
    }
  };

  const resetForm = () => {
    setFormData({
      account_id: '', contact_person: '', reference: '',
      valid_until: '', transport: '', delivery_terms: '', payment_terms: '',
      terms_conditions: '', notes: '', header_discount_percent: 0,
      billing_address: '', billing_city: '', billing_state: '', billing_pincode: '',
      shipping_address: '', shipping_city: '', shipping_state: '', shipping_pincode: '',
      gstin: '',
      items: [{ item_id: '', item_name: '', description: '', hsn_code: '', quantity: 1, unit: 'Pcs', unit_price: 0, discount_percent: 0, tax_percent: 18 }]
    });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_id: '', item_name: '', description: '', hsn_code: '', quantity: 1, unit: 'Pcs', unit_price: 0, discount_percent: 0, tax_percent: 18 }]
    });
  };

  const removeItem = (idx) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((_, i) => i !== idx)
      });
    }
  };

  const handleEditQuotation = (quote) => {
    setEditingQuotation(quote);
    setFormData({
      account_id: quote.account_id || '',
      contact_person: quote.contact_person || '',
      reference: quote.reference || '',
      valid_until: quote.valid_until || '',
      transport: quote.transport || '',
      delivery_terms: quote.delivery_terms || '',
      payment_terms: quote.payment_terms || '',
      terms_conditions: quote.terms_conditions || '',
      notes: quote.notes || '',
      header_discount_percent: quote.header_discount_percent || 0,
      items: (quote.items && quote.items.length > 0) ? quote.items.map((it) => ({
        item_name: it.item_name || '',
        description: it.description || '',
        hsn_code: it.hsn_code || '',
        quantity: it.quantity || 1,
        unit: it.unit || 'Pcs',
        unit_price: it.unit_price || 0,
        discount_percent: it.discount_percent || 0,
        tax_percent: it.tax_percent || 18
      })) : [{ item_name: '', description: '', hsn_code: '', quantity: 1, unit: 'Pcs', unit_price: 0, discount_percent: 0, tax_percent: 18 }]
    });
    setOpen(true);
  };

  const calculateTotals = () => {
    let subtotal = 0;
    formData.items.forEach(item => {
      const lineSubtotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
      subtotal += lineSubtotal;
    });
    const headerDiscount = subtotal * ((parseFloat(formData.header_discount_percent) || 0) / 100);
    const taxable = subtotal - headerDiscount;
    const tax = taxable * 0.18; // Simplified - actual varies per item
    return { subtotal, headerDiscount, taxable, tax, total: taxable + tax };
  };

  const totals = calculateTotals();

  const filteredQuotations = quotations.filter(quote => {
    const matchesSearch = quote.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quote.account_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || quote.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading || registryLoading) return <div className="flex items-center justify-center h-96"><div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-6" data-testid="quotations-list">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-manrope">Quotations</h2>
          <p className="text-slate-600 mt-1 font-inter">{quotations.length} total quotations</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setEditingQuotation(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 font-inter" data-testid="add-quotation-button">
              <Plus className="h-4 w-4 mr-2" />New Quotation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="font-manrope">Create Quotation</DialogTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('/field-registry?module=crm&entity=quotations', '_blank')}
                  className="text-slate-500 hover:text-accent"
                  title="Customize form fields"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Customize Fields
                </Button>
              </div>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Core header fields - always shown (customer select has special logic) */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="font-inter">Customer *</Label>
                  <CustomerSearchSelect
                    value={formData.account_id}
                    onChange={(v) => setFormData({...formData, account_id: v})}
                    onCustomerSelect={handleCustomerSelect}
                    placeholder="Search customer..."
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Contact Person</Label>
                  <Input value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Reference</Label>
                  <Input value={formData.reference} onChange={(e) => setFormData({...formData, reference: e.target.value})} placeholder="Enquiry ref, PO ref..." />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Valid Until *</Label>
                  <Input type="date" value={formData.valid_until} onChange={(e) => setFormData({...formData, valid_until: e.target.value})} required data-testid="quotation-valid-until" />
                </div>
              </div>
              
              {/* Dynamic header fields from Field Registry */}
              {useDynamicForm && headerFields.length > 0 && (
                <DynamicFormFields
                  fields={headerFields}
                  formData={formData}
                  onChange={setFormData}
                  sectionLabels={sectionLabels}
                  groupBySection={false}
                  columns={4}
                />
              )}

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-slate-900">Line Items</h4>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />Add Item
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">Item Name *</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600">HSN</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 w-20">Qty *</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 w-20">Unit</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 w-28">Price *</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 w-20">Disc %</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 w-20">Tax %</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 w-28">Total</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {formData.items.map((item, idx) => {
                        const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0) * (1 - (parseFloat(item.discount_percent) || 0) / 100) * (1 + (parseFloat(item.tax_percent) || 0) / 100);
                        return (
                          <tr key={idx}>
                            <td className="px-3 py-2">
                              <ItemSearchSelect
                                value={item.item_id}
                                onChange={(v) => {
                                  const newItems = [...formData.items];
                                  newItems[idx].item_id = v;
                                  setFormData({...formData, items: newItems});
                                }}
                                onItemSelect={(itemData) => handleItemSelect(idx, itemData)}
                                placeholder="Search item..."
                                className="h-8"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <Input value={item.hsn_code} onChange={(e) => {
                                const newItems = [...formData.items];
                                newItems[idx].hsn_code = e.target.value;
                                setFormData({...formData, items: newItems});
                              }} className="h-8" />
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" value={item.quantity} onChange={(e) => {
                                const newItems = [...formData.items];
                                newItems[idx].quantity = e.target.value;
                                setFormData({...formData, items: newItems});
                              }} required className="h-8" min="0" step="0.01" data-testid={`item-qty-${idx}`} />
                            </td>
                            <td className="px-3 py-2">
                              <Select value={item.unit} onValueChange={(value) => {
                                const newItems = [...formData.items];
                                newItems[idx].unit = value;
                                setFormData({...formData, items: newItems});
                              }}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Pcs">Pcs</SelectItem>
                                  <SelectItem value="Box">Box</SelectItem>
                                  <SelectItem value="Rolls">Rolls</SelectItem>
                                  <SelectItem value="Kg">Kg</SelectItem>
                                  <SelectItem value="Mtr">Mtr</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" value={item.unit_price} onChange={(e) => {
                                const newItems = [...formData.items];
                                newItems[idx].unit_price = e.target.value;
                                setFormData({...formData, items: newItems});
                              }} required className="h-8" min="0" step="0.01" data-testid={`item-price-${idx}`} />
                            </td>
                            <td className="px-3 py-2">
                              <Input type="number" value={item.discount_percent} onChange={(e) => {
                                const newItems = [...formData.items];
                                newItems[idx].discount_percent = e.target.value;
                                setFormData({...formData, items: newItems});
                              }} className="h-8" min="0" max="100" />
                            </td>
                            <td className="px-3 py-2">
                              <Select value={item.tax_percent.toString()} onValueChange={(value) => {
                                const newItems = [...formData.items];
                                newItems[idx].tax_percent = parseFloat(value);
                                setFormData({...formData, items: newItems});
                              }}>
                                <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="0">0%</SelectItem>
                                  <SelectItem value="5">5%</SelectItem>
                                  <SelectItem value="12">12%</SelectItem>
                                  <SelectItem value="18">18%</SelectItem>
                                  <SelectItem value="28">28%</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2 font-mono text-sm font-semibold">₹{lineTotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                            <td className="px-3 py-2">
                              {formData.items.length > 1 && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(idx)}>
                                  <X className="h-4 w-4 text-red-500" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="font-inter">Transport</Label>
                      <Select value={formData.transport} onValueChange={(value) => setFormData({...formData, transport: value})}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ex-Works">Ex-Works</SelectItem>
                          <SelectItem value="FOR Destination">FOR Destination</SelectItem>
                          <SelectItem value="CIF">CIF</SelectItem>
                          <SelectItem value="To Pay">To Pay</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-inter">Payment Terms</Label>
                      <Select value={formData.payment_terms} onValueChange={(value) => setFormData({...formData, payment_terms: value})}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Advance">Advance</SelectItem>
                          <SelectItem value="30 days">30 Days</SelectItem>
                          <SelectItem value="45 days">45 Days</SelectItem>
                          <SelectItem value="60 days">60 Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-inter">Terms & Conditions</Label>
                    <Textarea value={formData.terms_conditions} onChange={(e) => setFormData({...formData, terms_conditions: e.target.value})} rows={3} />
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Subtotal:</span>
                    <span className="font-mono font-semibold">₹{totals.subtotal.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">Discount:</span>
                      <Input type="number" value={formData.header_discount_percent} onChange={(e) => setFormData({...formData, header_discount_percent: e.target.value})} className="w-16 h-6 text-sm" min="0" max="100" />
                      <span className="text-slate-600">%</span>
                    </div>
                    <span className="font-mono">-₹{totals.headerDiscount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Taxable Amount:</span>
                    <span className="font-mono">₹{totals.taxable.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">GST:</span>
                    <span className="font-mono">₹{totals.tax.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-3">
                    <span>Grand Total:</span>
                    <span className="font-mono text-green-600">₹{totals.total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90" data-testid="quotation-submit-button">{editingQuotation ? 'Update Quotation' : 'Create Quotation'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search quotations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="quotation-search" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Quote #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Valid Until</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuotations.length === 0 ? (
                  <tr><td colSpan="7" className="px-4 py-12 text-center text-slate-500 font-inter">
                    {searchTerm || statusFilter !== 'all' ? 'No quotations found' : 'No quotations yet. Click "New Quotation" to create one.'}
                  </td></tr>
                ) : (
                  filteredQuotations.map((quote) => (
                    <tr key={quote.id} className="hover:bg-slate-50 transition-colors" data-testid={`quotation-row-${quote.id}`}>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-blue-600">{quote.quote_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 font-inter">{quote.account_name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">{new Date(quote.quote_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">{new Date(quote.valid_until).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">₹{quote.grand_total?.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <Select value={quote.status} onValueChange={(val) => handleStatusChange(quote.id, val)}>
                          <SelectTrigger className="w-[120px] h-8">
                            <Badge className={`font-inter ${
                              quote.status === 'draft' ? 'bg-slate-100 text-slate-800' :
                              quote.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                              quote.status === 'accepted' ? 'bg-green-100 text-green-800' :
                              quote.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                            }`}>{quote.status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="sent">Sent</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="expired">Expired</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditQuotation(quote)} data-testid={`edit-quotation-${quote.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <DocumentActions
                            documentType="quotation"
                            documentId={quote.id}
                            documentNumber={quote.quote_number}
                            recipient={{
                              name: quote.contact_person || quote.account_name,
                              email: quote.contact_email,
                              phone: quote.contact_phone
                            }}
                            compact={true}
                          />
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(quote.id)} className="text-destructive" data-testid={`delete-quotation-${quote.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== SAMPLES LIST ====================
const SamplesList = () => {
  const [samples, setSamples] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [formData, setFormData] = useState({
    account_id: '', contact_person: '', quotation_id: '',
    items: [{ product_name: '', product_specs: '', quantity: 1, unit: 'Pcs' }],
    from_location: '', courier: '', tracking_number: '',
    expected_delivery: '', feedback_due_date: '', purpose: '', notes: ''
  });
  const [editingSample, setEditingSample] = useState(null);

  // Field Registry integration for dynamic form fields
  const { 
    formFields: registryFields, 
    loading: registryLoading, 
    sectionLabels 
  } = useFieldRegistry('crm', 'samples');
  
  // Check if we have dynamic fields from registry (filter to header fields only)
  const headerFields = registryFields?.filter(f => f.section === 'header' || f.section === 'basic' || !f.section) || [];
  const useDynamicForm = headerFields.length > 0;


  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [samplesRes, accountsRes] = await Promise.all([
        api.get('/crm/samples'),
        api.get('/crm/accounts')
      ]);
      setSamples(samplesRes.data);
      setAccounts(accountsRes.data);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        items: (formData.items || []).map((it) => ({
          product_name: it.product_name,
          product_specs: it.product_specs,
          quantity: parseFloat(it.quantity) || 1,
          unit: it.unit || 'Pcs'
        }))
      };

      if (editingSample) {
        await api.put(`/crm/samples/${editingSample.id}`, payload);
        toast.success('Sample updated successfully');
      } else {
        await api.post('/crm/samples', payload);
        toast.success('Sample created successfully');
      }
      setOpen(false);
      setEditingSample(null);
      fetchData();
      resetForm();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save sample');
    }
  };

  const handleFeedback = async (sampleId, status) => {
    try {
      await api.put(`/crm/samples/${sampleId}/feedback?feedback_status=${status}`);
      toast.success('Feedback updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to update feedback');
    }
  };

  const handleDelete = async (sampleId) => {
    if (!window.confirm('Are you sure you want to delete this sample?')) return;
    try {
      await api.delete(`/crm/samples/${sampleId}`);
      toast.success('Sample deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete sample');
    }
  };


  const handleEditSample = (sample) => {
    setEditingSample(sample);
    setFormData({
      account_id: sample.account_id || '',
      contact_person: sample.contact_person || '',
      quotation_id: sample.quotation_id || '',
      items: (sample.items && sample.items.length > 0) ? sample.items.map((it) => ({
        product_name: it.product_name || '',
        product_specs: it.product_specs || '',
        quantity: it.quantity || 1,
        unit: it.unit || 'Pcs'
      })) : [{ product_name: sample.product_name || '', product_specs: sample.product_specs || '', quantity: sample.quantity || 1, unit: sample.unit || 'Pcs' }],
      from_location: sample.from_location || '',
      courier: sample.courier || '',
      tracking_number: sample.tracking_number || '',
      expected_delivery: sample.expected_delivery || '',
      feedback_due_date: sample.feedback_due_date || '',
      purpose: sample.purpose || '',
      notes: sample.notes || ''
    });
    setOpen(true);
  };

  const resetForm = () => {
    setFormData({
      account_id: '', contact_person: '', quotation_id: '',
      items: [{ product_name: '', product_specs: '', quantity: 1, unit: 'Pcs' }],
      from_location: '', courier: '', tracking_number: '',
      expected_delivery: '', feedback_due_date: '', purpose: '', notes: ''
    });
  };

  const filteredSamples = samples.filter(sample => {
    const matchesSearch = sample.sample_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.account_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sample.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sample.items || []).some((it) => (it.product_name || '').toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || sample.feedback_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading || registryLoading) return <div className="flex items-center justify-center h-96"><div className="animate-spin h-12 w-12 border-4 border-accent border-t-transparent rounded-full"></div></div>;

  return (
    <div className="space-y-6" data-testid="samples-list">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-manrope">Samples Management</h2>
          <p className="text-slate-600 mt-1 font-inter">{samples.length} total samples</p>
        </div>
        <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { setEditingSample(null); resetForm(); } }}>
          <DialogTrigger asChild>
            <Button className="bg-accent hover:bg-accent/90 font-inter" onClick={() => { setEditingSample(null); resetForm(); }} data-testid="add-sample-button">
              <Plus className="h-4 w-4 mr-2" />New Sample
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle className="font-manrope">Send Sample</DialogTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open('/field-registry?module=crm&entity=samples', '_blank')}
                  className="text-slate-500 hover:text-accent"
                  title="Customize form fields"
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Customize Fields
                </Button>
              </div>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Core header fields - always shown */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-inter">Customer *</Label>
                  <Select value={formData.account_id} onValueChange={(value) => setFormData({...formData, account_id: value})} required>
                    <SelectTrigger data-testid="sample-account"><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>{acc.customer_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Contact Person</Label>
                  <Input value={formData.contact_person} onChange={(e) => setFormData({...formData, contact_person: e.target.value})} />
                </div>
              </div>
              
              {/* Dynamic header fields from Field Registry */}
              {useDynamicForm && headerFields.length > 0 && (
                <DynamicFormFields
                  fields={headerFields}
                  formData={formData}
                  onChange={setFormData}
                  sectionLabels={sectionLabels}
                  groupBySection={false}
                  columns={2}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="font-inter">Sample Items *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => setFormData((prev) => ({
                      ...prev,
                      items: [...(prev.items || []), { product_name: '', product_specs: '', quantity: 1, unit: 'Pcs' }]
                    }))}>
                      <Plus className="h-4 w-4 mr-2" /> Add Item
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {(formData.items || []).map((it, idx) => (
                      <div key={idx} className="grid grid-cols-6 gap-2 border border-slate-200 rounded-lg p-3">
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-slate-600">Product Name</Label>
                          <Input value={it.product_name} onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            items: prev.items.map((x, i) => i === idx ? { ...x, product_name: e.target.value } : x)
                          }))} required />
                        </div>
                        <div className="col-span-2 space-y-1">
                          <Label className="text-xs text-slate-600">Specs</Label>
                          <Input value={it.product_specs} onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            items: prev.items.map((x, i) => i === idx ? { ...x, product_specs: e.target.value } : x)
                          }))} required />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-600">Qty</Label>
                          <Input type="number" min="1" value={it.quantity} onChange={(e) => setFormData((prev) => ({
                            ...prev,
                            items: prev.items.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x)
                          }))} required />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-600">Unit</Label>
                          <Select value={it.unit} onValueChange={(value) => setFormData((prev) => ({
                            ...prev,
                            items: prev.items.map((x, i) => i === idx ? { ...x, unit: value } : x)
                          }))}>
                            <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pcs">Pcs</SelectItem>
                              <SelectItem value="Rolls">Rolls</SelectItem>
                              <SelectItem value="Box">Box</SelectItem>
                              <SelectItem value="Kg">Kg</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-6 flex justify-end">
                          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setFormData((prev) => ({
                            ...prev,
                            items: prev.items.filter((_, i) => i !== idx)
                          }))} disabled={(formData.items || []).length <= 1}>
                            <Trash2 className="h-4 w-4 mr-2" /> Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">From Location *</Label>
                  <Input value={formData.from_location} onChange={(e) => setFormData({...formData, from_location: e.target.value})} placeholder="Mumbai Factory" required data-testid="sample-location" />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Courier</Label>
                  <Select value={formData.courier} onValueChange={(value) => setFormData({...formData, courier: value})}>
                    <SelectTrigger><SelectValue placeholder="Select courier" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DTDC">DTDC</SelectItem>
                      <SelectItem value="BlueDart">BlueDart</SelectItem>
                      <SelectItem value="Delhivery">Delhivery</SelectItem>
                      <SelectItem value="FedEx">FedEx</SelectItem>
                      <SelectItem value="Self">Self Delivery</SelectItem>
                      <SelectItem value="Transport">Transport</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Tracking Number</Label>
                  <Input value={formData.tracking_number} onChange={(e) => setFormData({...formData, tracking_number: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Expected Delivery</Label>
                  <Input type="date" value={formData.expected_delivery} onChange={(e) => setFormData({...formData, expected_delivery: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Feedback Due Date *</Label>
                  <Input type="date" value={formData.feedback_due_date} onChange={(e) => setFormData({...formData, feedback_due_date: e.target.value})} required data-testid="sample-feedback-date" />
                </div>
                <div className="space-y-2">
                  <Label className="font-inter">Purpose</Label>
                  <Select value={formData.purpose} onValueChange={(value) => setFormData({...formData, purpose: value})}>
                    <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Trial">Trial</SelectItem>
                      <SelectItem value="Evaluation">Evaluation</SelectItem>
                      <SelectItem value="Quality Check">Quality Check</SelectItem>
                      <SelectItem value="New Development">New Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-inter">Notes</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} rows={2} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancel</Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90" data-testid="sample-submit-button">{editingSample ? 'Update Sample' : 'Create Sample'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search samples..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="sample-search" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Feedback Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
            <SelectItem value="needs_revision">Needs Revision</SelectItem>
            <SelectItem value="no_response">No Response</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Sample #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Quantity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Feedback</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Due Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase font-inter">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSamples.length === 0 ? (
                  <tr><td colSpan="8" className="px-4 py-12 text-center text-slate-500 font-inter">
                    {searchTerm || statusFilter !== 'all' ? 'No samples found' : 'No samples yet. Click "New Sample" to create one.'}
                  </td></tr>
                ) : (
                  filteredSamples.map((sample) => (
                    <tr key={sample.id} className="hover:bg-slate-50 transition-colors" data-testid={`sample-row-${sample.id}`}>
                      <td className="px-4 py-3 font-mono text-sm font-semibold text-orange-600">{sample.sample_number}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 font-inter">{sample.account_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-900 font-inter">{sample.product_name}</div>
                        <div className="text-sm text-slate-500">{sample.product_specs}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{sample.quantity} {sample.unit}</td>
                      <td className="px-4 py-3">
                        <Badge className={`font-inter ${
                          sample.status === 'created' ? 'bg-slate-100 text-slate-800' :
                          sample.status === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                          sample.status === 'delivered' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                        }`}>{sample.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Select value={sample.feedback_status} onValueChange={(val) => handleFeedback(sample.id, val)}>
                          <SelectTrigger className="w-[130px] h-8">
                            <Badge className={`font-inter ${
                              sample.feedback_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              sample.feedback_status === 'positive' ? 'bg-green-100 text-green-800' :
                              sample.feedback_status === 'negative' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                            }`}>{sample.feedback_status}</Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="positive">Positive</SelectItem>
                            <SelectItem value="negative">Negative</SelectItem>
                            <SelectItem value="needs_revision">Needs Revision</SelectItem>
                            <SelectItem value="no_response">No Response</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">{new Date(sample.feedback_due_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEditSample(sample)} data-testid={`edit-sample-${sample.id}`}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(sample.id)} className="text-destructive" data-testid={`delete-sample-${sample.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== MAIN CRM COMPONENT ====================
const CRM = () => {
  return (
    <Routes>
      <Route index element={<CRMOverview />} />
      <Route path="leads" element={<LeadsPage />} />
      <Route path="accounts" element={<AccountsList />} />
      <Route path="quotations" element={<QuotationsList />} />
      <Route path="samples" element={<SamplesList />} />
    </Routes>
  );
};

export default CRM;
