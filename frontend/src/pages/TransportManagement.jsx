/**
 * Transport & Transporter Master
 * Ported from ib-erp-main: IB Transport doctype + Gatepass transporter logic.
 * Handles transporter master, vehicle fleet, and LR (Lorry Receipt) tracking.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

const API = '/api/transport';
const token = () => localStorage.getItem('token');
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` });

const STATUS_COLORS = {
  'In Transit': 'bg-blue-100 text-blue-800',
  'Delivered':  'bg-green-100 text-green-800',
  'Returned':   'bg-red-100 text-red-800',
};

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function TransportManagement() {
  const [tab, setTab] = useState('transporters');
  const [transporters, setTransporters] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [lrEntries, setLrEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);   // 'transporter' | 'vehicle' | 'lr'
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, vRes, lrRes] = await Promise.all([
        fetch(`${API}/transporters`, { headers: headers() }),
        fetch(`${API}/vehicles`,     { headers: headers() }),
        fetch(`${API}/lr-entries`,   { headers: headers() }),
      ]);
      const [td, vd, ld] = await Promise.all([tRes.json(), vRes.json(), lrRes.json()]);
      setTransporters(td.transporters || []);
      setVehicles(vd.vehicles || []);
      setLrEntries(ld.lr_entries || []);
    } catch {
      toast.error('Failed to load transport data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const openModal = (type, defaults = {}) => {
    setForm(defaults);
    setModal(type);
  };

  const handleSave = async () => {
    setSaving(true);
    const endpoints = {
      transporter: `${API}/transporters`,
      vehicle:     `${API}/vehicles`,
      lr:          `${API}/lr-entries`,
    };
    try {
      const res = await fetch(endpoints[modal], {
        method: 'POST', headers: headers(), body: JSON.stringify(form)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Save failed');
      }
      toast.success('Saved successfully');
      setModal(null);
      fetchAll();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const markDelivered = async (lrId) => {
    try {
      await fetch(`${API}/lr-entries/${lrId}/deliver`, { method: 'PUT', headers: headers() });
      toast.success('LR marked as Delivered');
      fetchAll();
    } catch {
      toast.error('Failed to update LR');
    }
  };

  const Field = ({ label, name, type = 'text', placeholder = '' }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={form[name] || ''}
        onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
      />
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transport Management</h1>
          <p className="text-sm text-gray-500 mt-1">Transporters · Vehicles · Lorry Receipts</p>
        </div>
        <div className="flex gap-2">
          {tab === 'transporters' && (
            <button onClick={() => openModal('transporter')} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
              + Add Transporter
            </button>
          )}
          {tab === 'vehicles' && (
            <button onClick={() => openModal('vehicle')} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
              + Add Vehicle
            </button>
          )}
          {tab === 'lr' && (
            <button onClick={() => openModal('lr')} className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700">
              + New LR
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {[['transporters', 'Transporters'], ['vehicles', 'Vehicles'], ['lr', 'Lorry Receipts']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === val ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Transporters Tab */}
          {tab === 'transporters' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {transporters.length === 0 ? (
                <p className="text-gray-400 col-span-2 text-center py-8">No transporters yet</p>
              ) : transporters.map(t => (
                <div key={t.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{t.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">GSTIN: {t.gstin || 'N/A'}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {t.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="mt-3 text-xs text-gray-600 space-y-1">
                    {t.contact_person && <p>👤 {t.contact_person} · {t.phone}</p>}
                    {t.city && <p>📍 {t.city}, {t.state}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Vehicles Tab */}
          {tab === 'vehicles' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    {['Vehicle No.', 'Type', 'Transporter', 'Driver', 'Capacity (KG)', 'Status'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vehicles.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-gray-400">No vehicles registered</td></tr>
                  ) : vehicles.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-indigo-700">{v.vehicle_number}</td>
                      <td className="px-4 py-3">{v.vehicle_type}</td>
                      <td className="px-4 py-3">{v.transporter_name || '—'}</td>
                      <td className="px-4 py-3">{v.driver_name || '—'}</td>
                      <td className="px-4 py-3">{v.capacity_kg || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {v.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* LR Tab */}
          {tab === 'lr' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    {['LR No.', 'Date', 'Transporter', 'Vehicle', 'Route', 'Weight (KG)', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lrEntries.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-gray-400">No LR entries</td></tr>
                  ) : lrEntries.map(lr => (
                    <tr key={lr.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-indigo-700">{lr.lr_number}</td>
                      <td className="px-4 py-3">{lr.lr_date}</td>
                      <td className="px-4 py-3">{lr.transporter_name || '—'}</td>
                      <td className="px-4 py-3">{lr.vehicle_number || '—'}</td>
                      <td className="px-4 py-3 text-xs">{lr.from_location} → {lr.to_location}</td>
                      <td className="px-4 py-3">{lr.weight_kg || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[lr.status] || 'bg-gray-100'}`}>
                          {lr.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {lr.status === 'In Transit' && (
                          <button onClick={() => markDelivered(lr.id)}
                            className="text-xs px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700">
                            Deliver
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      {modal === 'transporter' && (
        <Modal title="Add Transporter" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Company Name *" name="name" placeholder="Sharma Logistics" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="GSTIN" name="gstin" placeholder="22AAAAA0000A1Z5" />
              <Field label="PAN" name="pan" placeholder="AAAPL1234C" />
            </div>
            <Field label="Contact Person" name="contact_person" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" name="phone" type="tel" />
              <Field label="Email" name="email" type="email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" name="city" />
              <Field label="State" name="state" />
            </div>
          </div>
          <div className="flex gap-2 mt-5 justify-end">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'vehicle' && (
        <Modal title="Add Vehicle" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <Field label="Vehicle Number *" name="vehicle_number" placeholder="MH 12 AB 1234" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Vehicle Type</label>
                <select value={form.vehicle_type || 'Truck'} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                  {['Truck', 'Tempo', 'Mini-Truck', 'Motorcycle'].map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <Field label="Capacity (KG)" name="capacity_kg" type="number" />
            </div>
            <Field label="Driver Name" name="driver_name" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Driver Phone" name="driver_phone" type="tel" />
              <Field label="Driver License" name="driver_license" />
            </div>
          </div>
          <div className="flex gap-2 mt-5 justify-end">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </Modal>
      )}

      {modal === 'lr' && (
        <Modal title="New Lorry Receipt" onClose={() => setModal(null)}>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="LR Number *" name="lr_number" placeholder="LR-2026-001" />
              <Field label="LR Date *" name="lr_date" type="date" />
            </div>
            <Field label="Transporter Name" name="transporter_name" />
            <Field label="Vehicle Number" name="vehicle_number" placeholder="MH 12 AB 1234" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="From Location" name="from_location" />
              <Field label="To Location" name="to_location" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Weight (KG)" name="weight_kg" type="number" />
              <Field label="Freight Amount (₹)" name="freight_amount" type="number" />
            </div>
            <Field label="Expected Delivery Date" name="expected_delivery_date" type="date" />
          </div>
          <div className="flex gap-2 mt-5 justify-end">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving...' : 'Create LR'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
