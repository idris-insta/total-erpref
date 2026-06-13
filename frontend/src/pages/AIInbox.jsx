import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Bot, Check, X, RefreshCw, Mail, MessageSquare, Bell,
  AlertTriangle, DollarSign, Factory, Users, Package, Truck, Sparkles,
} from 'lucide-react';
import api from '../lib/api';
import { toast } from 'sonner';

const AGENT_META = {
  Collections:          { icon: DollarSign,    color: 'text-red-600',    bg: 'bg-red-50' },
  'Daily Brief':        { icon: Sparkles,      color: 'text-blue-600',   bg: 'bg-blue-50' },
  'Lead Responder':     { icon: Users,         color: 'text-purple-600', bg: 'bg-purple-50' },
  'Anomaly Watch':      { icon: AlertTriangle, color: 'text-amber-600',  bg: 'bg-amber-50' },
  'Quote Assistant':    { icon: DollarSign,    color: 'text-emerald-600',bg: 'bg-emerald-50' },
  Procurement:          { icon: Package,       color: 'text-orange-600', bg: 'bg-orange-50' },
  'Production Planner': { icon: Factory,       color: 'text-cyan-600',   bg: 'bg-cyan-50' },
  Quality:              { icon: AlertTriangle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  HR:                   { icon: Users,         color: 'text-pink-600',   bg: 'bg-pink-50' },
  Dispatch:             { icon: Truck,         color: 'text-teal-600',   bg: 'bg-teal-50' },
};

const CHANNEL_ICON = { Email: Mail, WhatsApp: MessageSquare, Notification: Bell };

export default function AIInbox() {
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/ai/actions?status=Pending Approval');
      setActions(Array.isArray(res.data) ? res.data : (res.data?.actions || []));
    } catch {
      toast.error('Failed to load AI actions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (id, decision) => {
    try {
      await api.post(`/ai/actions/${id}/${decision}`);
      setActions((prev) => prev.filter((a) => a.id !== id));
      toast.success(decision === 'approve' ? 'Approved & sent' : 'Rejected');
    } catch {
      toast.error('Action failed');
    }
  };

  const agents = ['all', ...Array.from(new Set(actions.map((a) => a.agent)))];
  const shown = filter === 'all' ? actions : actions.filter((a) => a.agent === filter);

  return (
    <div className="space-y-6" data-testid="ai-inbox-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Bot className="h-8 w-8 text-[#2490EF]" />
            AI Action Inbox
          </h1>
          <p className="text-slate-600 mt-1">Drafts from your 10 AI agents — review, then approve to send. Nothing goes out without you.</p>
        </div>
        <Button onClick={load} variant="outline"><RefreshCw className="h-4 w-4 mr-2" />Refresh</Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {agents.map((a) => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              filter === a ? 'bg-[#2490EF] text-white border-[#2490EF]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {a === 'all' ? `All (${actions.length})` : a}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-[#2490EF] border-t-transparent rounded-full" /></div>
      ) : shown.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-slate-400">
            <Bot className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Inbox zero 🎉</p>
            <p className="text-sm">No AI actions waiting for approval.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {shown.map((a) => {
            const meta = AGENT_META[a.agent] || { icon: Sparkles, color: 'text-slate-600', bg: 'bg-slate-50' };
            const AgentIcon = meta.icon;
            const ChIcon = CHANNEL_ICON[a.channel] || Bell;
            return (
              <Card key={a.id} className="border-slate-200 hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${meta.bg} shrink-0`}>
                      <AgentIcon className={`h-5 w-5 ${meta.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[11px]">{a.agent}</Badge>
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <ChIcon className="h-3 w-3" />{a.channel}
                        </span>
                        {a.ai_generated ? (
                          <Badge className="bg-purple-100 text-purple-700 border-0 text-[10px]">
                            <Sparkles className="h-2.5 w-2.5 mr-1" />AI-drafted
                          </Badge>
                        ) : null}
                      </div>
                      <p className="font-semibold text-slate-900 mt-1">{a.draft_subject}</p>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-3"
                         dangerouslySetInnerHTML={{ __html: a.draft_message }} />
                      {a.reference_name && (
                        <p className="text-xs text-slate-400 mt-1">Ref: {a.reference_doctype} · {a.reference_name}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button size="sm" onClick={() => act(a.id, 'approve')} className="bg-emerald-600 hover:bg-emerald-700">
                        <Check className="h-4 w-4 mr-1" />Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => act(a.id, 'reject')} className="text-red-600 border-red-200 hover:bg-red-50">
                        <X className="h-4 w-4 mr-1" />Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
