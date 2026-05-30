/**
 * Lead Sales Team Management
 * Ported from ib-erp-main: Lead Sales Team, Lead Sales Team Member, Lead Sales Team Territory doctypes.
 * Manages hierarchical sales teams, territory allocation, and lead ownership.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const API = '/api/lead-sales-team';
const token = () => localStorage.getItem('token');
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-8 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const ROLE_COLORS = { 'Team Lead': 'bg-purple-100 text-purple-700', Member: 'bg-gray-100 text-gray-600' };

export default function LeadSalesTeam() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);   // 'create' | 'assign'
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('teams');    // teams | territory

  // Territory match state
  const [territory, setTerritory] = useState({ state: '', district: '', pincode: '' });
  const [matched, setMatched] = useState(null);

  // New team form
  const [teamForm, setTeamForm] = useState({
    team_name: '', team_code: '', team_lead_name: '', description: '',
    members: [], territories: []
  });

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/teams`, { headers: headers() });
      const data = await res.json();
      setTeams(data.teams || []);
    } catch {
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeamDetail = async (teamId) => {
    try {
      const res = await fetch(`${API}/teams/${teamId}`, { headers: headers() });
      const data = await res.json();
      setSelectedTeam(data);
    } catch {
      toast.error('Failed to load team details');
    }
  };

  useEffect(() => { fetchTeams(); }, [fetchTeams]);

  const handleCreateTeam = async () => {
    if (!teamForm.team_name || !teamForm.team_code) {
      toast.error('Team Name and Code are required');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${API}/teams`, {
        method: 'POST', headers: headers(), body: JSON.stringify(teamForm)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Create failed');
      }
      toast.success('Team created');
      setModal(null);
      setTeamForm({ team_name: '', team_code: '', team_lead_name: '', description: '', members: [], territories: [] });
      fetchTeams();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (teamId) => {
    if (!confirm('Deactivate this team?')) return;
    try {
      await fetch(`${API}/teams/${teamId}`, { method: 'DELETE', headers: headers() });
      toast.success('Team deactivated');
      setSelectedTeam(null);
      fetchTeams();
    } catch {
      toast.error('Failed to deactivate');
    }
  };

  const handleTerritoryMatch = async () => {
    try {
      const params = new URLSearchParams();
      if (territory.state) params.append('state', territory.state);
      if (territory.district) params.append('district', territory.district);
      if (territory.pincode) params.append('pincode', territory.pincode);
      const res = await fetch(`${API}/territory-match?${params}`, { headers: headers() });
      const data = await res.json();
      setMatched(data);
    } catch {
      toast.error('Territory match failed');
    }
  };

  const addMember = () => {
    setTeamForm(f => ({
      ...f, members: [...f.members, { user_id: '', user_email: '', user_name: '', role: 'Member', is_active: true }]
    }));
  };

  const updateMember = (idx, key, val) => {
    setTeamForm(f => {
      const members = [...f.members];
      members[idx] = { ...members[idx], [key]: val };
      return { ...f, members };
    });
  };

  const removeMember = (idx) => {
    setTeamForm(f => ({ ...f, members: f.members.filter((_, i) => i !== idx) }));
  };

  const addTerritory = () => {
    setTeamForm(f => ({
      ...f, territories: [...f.territories, { territory_name: '', state: '', district: '', city: '' }]
    }));
  };

  const updateTerritory = (idx, key, val) => {
    setTeamForm(f => {
      const territories = [...f.territories];
      territories[idx] = { ...territories[idx], [key]: val };
      return { ...f, territories };
    });
  };

  const removeTerritory = (idx) => {
    setTeamForm(f => ({ ...f, territories: f.territories.filter((_, i) => i !== idx) }));
  };

  const inp = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Team Management</h1>
          <p className="text-sm text-gray-500 mt-1">Teams · Members · Territory Allocation · Lead Assignment</p>
        </div>
        <button onClick={() => setModal('create')} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
          + New Team
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[['teams', 'Teams'], ['territory', 'Territory Matcher']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === val ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'teams' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teams List */}
          <div className="space-y-3">
            {loading ? (
              <p className="text-center text-gray-400 py-8">Loading...</p>
            ) : teams.length === 0 ? (
              <p className="text-center text-gray-400 py-8">No teams yet</p>
            ) : teams.map(team => (
              <div
                key={team.id}
                onClick={() => fetchTeamDetail(team.id)}
                className={`bg-white border rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow ${
                  selectedTeam?.id === team.id ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{team.team_name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Code: {team.team_code}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${team.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {team.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {team.team_lead_name && (
                  <p className="text-xs text-gray-600 mt-2">👤 Lead: {team.team_lead_name}</p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>👥 {team.members?.length || 0} members</span>
                  <span>📍 {team.territories?.length || 0} territories</span>
                </div>
              </div>
            ))}
          </div>

          {/* Team Detail */}
          <div className="lg:col-span-2">
            {!selectedTeam ? (
              <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
                <p className="text-4xl mb-3">👥</p>
                <p>Select a team to view details</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedTeam.team_name}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{selectedTeam.description || 'No description'}</p>
                  </div>
                  <button
                    onClick={() => handleDeactivate(selectedTeam.id)}
                    className="text-xs px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    Deactivate
                  </button>
                </div>

                {/* Members */}
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Team Members</h3>
                  {(selectedTeam.members || []).length === 0 ? (
                    <p className="text-sm text-gray-400">No members</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTeam.members.map(m => (
                        <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                            {(m.user_name || '?')[0].toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{m.user_name}</p>
                            <p className="text-xs text-gray-500">{m.user_email}</p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[m.role] || 'bg-gray-100'}`}>
                            {m.role}
                          </span>
                          <div className="text-right text-xs text-gray-500">
                            <p className="text-green-700 font-medium">{m.won_leads || 0} won</p>
                            <p>{m.active_leads || 0} active</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Territories */}
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Assigned Territories</h3>
                  {(selectedTeam.territories || []).length === 0 ? (
                    <p className="text-sm text-gray-400">No territories assigned</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedTeam.territories.map(t => (
                        <div key={t.id} className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs">
                          <p className="font-medium text-blue-800">{t.territory_name}</p>
                          <p className="text-blue-600 mt-0.5">{[t.city, t.district, t.state].filter(Boolean).join(', ')}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'territory' && (
        <div className="max-w-xl space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Find Sales Team by Location</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">State</label>
                <input value={territory.state} onChange={e => setTerritory(t => ({ ...t, state: e.target.value }))}
                  className={inp} placeholder="Maharashtra" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">District</label>
                <input value={territory.district} onChange={e => setTerritory(t => ({ ...t, district: e.target.value }))}
                  className={inp} placeholder="Pune" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Pincode</label>
                <input value={territory.pincode} onChange={e => setTerritory(t => ({ ...t, pincode: e.target.value }))}
                  className={inp} placeholder="411001" />
              </div>
              <button onClick={handleTerritoryMatch}
                className="w-full px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
                🔍 Find Matching Team
              </button>
            </div>
          </div>

          {matched && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                {matched.count} team{matched.count !== 1 ? 's' : ''} matched
              </h3>
              {matched.matched_teams.length === 0 ? (
                <p className="text-sm text-gray-400">No teams cover this territory</p>
              ) : matched.matched_teams.map((t, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-green-50 rounded-lg mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{t.team_name}</p>
                    <p className="text-xs text-gray-500">Territory: {t.territory} · Lead: {t.team_lead || 'N/A'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Team Modal */}
      {modal === 'create' && (
        <Modal title="Create Sales Team" onClose={() => setModal(null)}>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team Name *</label>
                <input value={teamForm.team_name} onChange={e => setTeamForm(f => ({ ...f, team_name: e.target.value }))}
                  className={inp} placeholder="North Zone Team" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Team Code *</label>
                <input value={teamForm.team_code} onChange={e => setTeamForm(f => ({ ...f, team_code: e.target.value }))}
                  className={inp} placeholder="NZ-001" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Team Lead Name</label>
                <input value={teamForm.team_lead_name} onChange={e => setTeamForm(f => ({ ...f, team_lead_name: e.target.value }))}
                  className={inp} placeholder="Rajesh Kumar" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input value={teamForm.description} onChange={e => setTeamForm(f => ({ ...f, description: e.target.value }))}
                  className={inp} placeholder="Covers North India territories" />
              </div>
            </div>

            {/* Members */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600">Members</p>
                <button onClick={addMember} className="text-xs text-indigo-600 hover:underline">+ Add Member</button>
              </div>
              {teamForm.members.map((m, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-center">
                  <input value={m.user_name} onChange={e => updateMember(i, 'user_name', e.target.value)}
                    className={`${inp} col-span-2`} placeholder="Name" />
                  <input value={m.user_email} onChange={e => updateMember(i, 'user_email', e.target.value)}
                    className={`${inp} col-span-2`} placeholder="Email" />
                  <button onClick={() => removeMember(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                </div>
              ))}
            </div>

            {/* Territories */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-600">Territories</p>
                <button onClick={addTerritory} className="text-xs text-indigo-600 hover:underline">+ Add Territory</button>
              </div>
              {teamForm.territories.map((t, i) => (
                <div key={i} className="grid grid-cols-5 gap-2 mb-2 items-center">
                  <input value={t.territory_name} onChange={e => updateTerritory(i, 'territory_name', e.target.value)}
                    className={`${inp} col-span-2`} placeholder="Territory Name" />
                  <input value={t.state} onChange={e => updateTerritory(i, 'state', e.target.value)}
                    className={`${inp} col-span-2`} placeholder="State" />
                  <button onClick={() => removeTerritory(i)} className="text-red-400 hover:text-red-600 text-lg leading-none">✕</button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-5 justify-end border-t border-gray-100 pt-4">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleCreateTeam} disabled={saving}
              className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Team'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
