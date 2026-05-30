/**
 * Customer Assignment & Daily Board
 * Ported from ib-erp-main instabiz ERPNext extension.
 * Displays the daily customer board, salesperson assignments,
 * rollover controls, and completion analytics.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const API = '/api/customer-assignment';

const STATUS_COLORS = {
  Pending: 'bg-yellow-100 text-yellow-800',
  Done:    'bg-green-100 text-green-800',
  Rolled:  'bg-blue-100 text-blue-800',
};

const PRIORITY_COLORS = {
  High:   'border-l-4 border-red-500',
  Normal: 'border-l-4 border-gray-300',
  Low:    'border-l-4 border-green-400',
};

export default function CustomerAssignment() {
  const [board, setBoard]       = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [rolling, setRolling]   = useState(false);
  const [tab, setTab]           = useState('board');    // board | analytics
  const [selectedSP, setSelectedSP] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSP) params.append('salesperson_user', selectedSP);
      const res = await fetch(`${API}/board?${params}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setBoard(data);
    } catch {
      toast.error('Failed to load daily board');
    } finally {
      setLoading(false);
    }
  }, [selectedSP]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`${API}/analytics?days=7`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      setAnalytics(data.analytics || []);
    } catch {
      toast.error('Failed to load analytics');
    }
  }, []);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);
  useEffect(() => { if (tab === 'analytics') fetchAnalytics(); }, [tab, fetchAnalytics]);

  const handleUpdateStatus = async (assignmentId, status) => {
    try {
      await fetch(`${API}/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });
      toast.success(`Marked as ${status}`);
      fetchBoard();
    } catch {
      toast.error('Update failed');
    }
  };

  const handleRollover = async () => {
    if (!confirm('Roll all Pending assignments to tomorrow?')) return;
    setRolling(true);
    try {
      const res = await fetch(`${API}/rollover`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const data = await res.json();
      toast.success(data.message);
      fetchBoard();
    } catch {
      toast.error('Rollover failed');
    } finally {
      setRolling(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Assignment Board</h1>
          <p className="text-sm text-gray-500 mt-1">{today} — Daily salesperson task board</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRollover}
            disabled={rolling}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {rolling ? 'Rolling...' : '⏩ Rollover Pending'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['board', 'analytics'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${
              tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'board' && (
        <>
          {/* Summary Pills */}
          {board && (
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Total', value: board.total, color: 'bg-gray-100' },
                { label: 'Pending', value: board.pending, color: 'bg-yellow-100 text-yellow-800' },
                { label: 'Done', value: board.done, color: 'bg-green-100 text-green-800' },
                { label: 'Rolled', value: board.rolled, color: 'bg-blue-100 text-blue-800' },
              ].map(p => (
                <div key={p.label} className={`rounded-xl p-4 text-center ${p.color}`}>
                  <p className="text-2xl font-bold">{p.value}</p>
                  <p className="text-xs font-medium mt-1">{p.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Board */}
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading board...</div>
          ) : board && Object.keys(board.board || {}).length === 0 ? (
            <div className="text-center py-12 text-gray-400">No assignments today</div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {Object.entries(board?.board || {}).map(([salesperson, assignments]) => (
                <div key={salesperson} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-5 py-3 flex items-center justify-between border-b border-gray-200">
                    <h3 className="font-semibold text-gray-800">{salesperson}</h3>
                    <span className="text-sm text-gray-500">{assignments.length} customers</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {assignments.map(a => (
                      <div key={a.id} className={`flex items-center gap-4 px-5 py-3 ${PRIORITY_COLORS[a.priority] || ''}`}>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{a.customer_name}</p>
                          <p className="text-xs text-gray-500">{a.visit_type} · {a.notes || '—'}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[a.status] || 'bg-gray-100'}`}>
                          {a.status}
                        </span>
                        {a.status === 'Pending' && (
                          <button
                            onClick={() => handleUpdateStatus(a.id, 'Done')}
                            className="text-xs px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Mark Done
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'analytics' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                {['Date', 'Total', 'Done', 'Pending', 'Rolled', 'Completion %'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analytics.map(row => (
                <tr key={row.date} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{row.date}</td>
                  <td className="px-4 py-2">{row.total}</td>
                  <td className="px-4 py-2 text-green-700">{row.done}</td>
                  <td className="px-4 py-2 text-yellow-700">{row.pending}</td>
                  <td className="px-4 py-2 text-blue-700">{row.rolled}</td>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${row.completion_rate}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{row.completion_rate}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
