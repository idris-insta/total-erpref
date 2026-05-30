/**
 * IB Branding Configuration
 * Ported from ib-erp-main: IB Branding doctype.
 * Manages company logo, colors, fonts, and document header/footer used across all PDFs.
 */
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

const API = '/api/branding';
const token = () => localStorage.getItem('token');
const authHeaders = () => ({ Authorization: `Bearer ${token()}` });

export default function BrandingConfig() {
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [stampUploading, setStampUploading] = useState(false);
  const logoRef = useRef();
  const stampRef = useRef();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch(API, { headers: authHeaders() });
      const data = await res.json();
      setConfig(data);
      setForm(data);
    } catch {
      toast.error('Failed to load branding config');
    }
  };

  const fetchPreview = async () => {
    try {
      const res = await fetch(`${API}/preview-pdf-header`, { headers: authHeaders() });
      const data = await res.json();
      setPreview(data.html || '');
    } catch {
      toast.error('Preview failed');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const method = config?.id ? 'PUT' : 'POST';
      const res = await fetch(API, {
        method,
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(form)
      });
      if (!res.ok) throw new Error('Save failed');
      toast.success('Branding saved successfully');
      fetchConfig();
      fetchPreview();
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleUpload = async (file, type) => {
    const setter = type === 'logo' ? setLogoUploading : setStampUploading;
    setter(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const res = await fetch(`${API}/upload-${type}`, {
        method: 'POST',
        headers: authHeaders(),
        body: fd
      });
      const data = await res.json();
      const key = `${type}_url`;
      setForm(f => ({ ...f, [key]: data[key] }));
      toast.success(`${type === 'logo' ? 'Logo' : 'Stamp'} uploaded`);
    } catch {
      toast.error('Upload failed');
    } finally {
      setter(false);
    }
  };

  const Field = ({ label, name, type = 'text', placeholder = '', half = false }) => (
    <div className={half ? 'col-span-1' : 'col-span-2'}>
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

  const ColorField = ({ label, name }) => (
    <div className="flex items-center gap-3">
      <input
        type="color"
        value={form[name] || '#1e3a5f'}
        onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
        className="h-9 w-12 rounded border border-gray-300 cursor-pointer"
      />
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-600">{label}</p>
        <p className="text-xs text-gray-400">{form[name] || '—'}</p>
      </div>
    </div>
  );

  const Section = ({ title, children }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">{title}</h3>
      {children}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Branding</h1>
          <p className="text-sm text-gray-500 mt-1">Logo, colors, fonts, and document header used across all PDF outputs</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchPreview} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
            👁 Preview Header
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {saving ? 'Saving...' : '💾 Save Branding'}
          </button>
        </div>
      </div>

      {/* PDF Header Preview */}
      {preview && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 mb-2">PDF Header Preview</p>
          <div dangerouslySetInnerHTML={{ __html: preview }} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Company Identity */}
        <Section title="🏢 Company Identity">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Name *" name="company_name" placeholder="InstaBiz Tapes Pvt Ltd" />
            <Field label="Tagline" name="tagline" placeholder="Stick with Quality" half />
            <Field label="GSTIN" name="gstin" placeholder="22AAAAA0000A1Z5" half />
            <Field label="Phone" name="phone" type="tel" half />
            <Field label="Email" name="email" type="email" half />
            <Field label="Website" name="website" placeholder="www.instabiz.in" />
            <Field label="Address Line 1" name="address_line1" />
            <Field label="Address Line 2" name="address_line2" />
            <Field label="City" name="city" half />
            <Field label="State" name="state" half />
            <Field label="Pincode" name="pincode" half />
          </div>
        </Section>

        {/* Brand Colors & Fonts */}
        <Section title="🎨 Colors & Typography">
          <div className="space-y-4">
            <ColorField label="Primary Color (PDF headers)" name="primary_color" />
            <ColorField label="Secondary Color (backgrounds)" name="secondary_color" />
            <ColorField label="Accent Color (buttons, links)" name="accent_color" />
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Font Family</label>
              <select
                value={form.font_family || 'Helvetica'}
                onChange={e => setForm(f => ({ ...f, font_family: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {['Helvetica', 'Times-Roman', 'Courier', 'Arial'].map(f => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
          </div>
        </Section>

        {/* Logo & Stamp */}
        <Section title="🖼 Logo & Stamp">
          <div className="space-y-4">
            {/* Logo */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Company Logo</p>
              <div className="flex items-center gap-4">
                {form.logo_url ? (
                  <img src={form.logo_url} alt="Logo" className="h-16 w-auto rounded border border-gray-200 object-contain p-1" />
                ) : (
                  <div className="h-16 w-24 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                    No logo
                  </div>
                )}
                <div>
                  <button
                    onClick={() => logoRef.current?.click()}
                    disabled={logoUploading}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {logoUploading ? 'Uploading...' : '⬆ Upload Logo'}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG. Used in PDF header and UI.</p>
                  <input ref={logoRef} type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files[0] && handleUpload(e.target.files[0], 'logo')} />
                </div>
              </div>
            </div>

            {/* Stamp */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Company Stamp / Seal</p>
              <div className="flex items-center gap-4">
                {form.stamp_url ? (
                  <img src={form.stamp_url} alt="Stamp" className="h-16 w-auto rounded border border-gray-200 object-contain p-1" />
                ) : (
                  <div className="h-16 w-24 bg-gray-100 rounded border border-dashed border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                    No stamp
                  </div>
                )}
                <div>
                  <button
                    onClick={() => stampRef.current?.click()}
                    disabled={stampUploading}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                  >
                    {stampUploading ? 'Uploading...' : '⬆ Upload Stamp'}
                  </button>
                  <p className="text-xs text-gray-400 mt-1">Printed on quotations and invoices.</p>
                  <input ref={stampRef} type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files[0] && handleUpload(e.target.files[0], 'stamp')} />
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Bank Details */}
        <Section title="🏦 Bank Details">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bank Name" name="bank_name" placeholder="State Bank of India" />
            <Field label="Account Number" name="bank_account_number" half />
            <Field label="IFSC Code" name="bank_ifsc" placeholder="SBIN0001234" half />
            <Field label="Branch" name="bank_branch" />
            <Field label="Authorized Signatory" name="authorized_signatory" />
          </div>
        </Section>

        {/* Custom HTML */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 pb-2 border-b border-gray-100">
            📄 Custom Document Header / Footer (HTML)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Print Header HTML (leave blank for auto)</label>
              <textarea
                value={form.print_header_html || ''}
                onChange={e => setForm(f => ({ ...f, print_header_html: e.target.value }))}
                rows={5}
                placeholder="<div>Custom header HTML...</div>"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Print Footer HTML</label>
              <textarea
                value={form.print_footer_html || ''}
                onChange={e => setForm(f => ({ ...f, print_footer_html: e.target.value }))}
                rows={5}
                placeholder="<div>Custom footer HTML...</div>"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
