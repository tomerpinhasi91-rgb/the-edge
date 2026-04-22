import { useState } from 'react'
import { useApp } from '../lib/context'
import { uid } from '../lib/supabase'

const STAGES = ['qualify', 'proposal', 'negotiate', 'closing', 'won', 'lost']

export default function NewAccountView({ onSave, onCancel }) {
  const { saveAccount, showToast } = useApp()
  const [form, setForm] = useState({ name: '', industry: '', location: '', stage: 'qualify', opportunity: '', contact: '', dealValue: '', competitors: '', website: '' })
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) return showToast('Company name is required', 'error')
    setSaving(true)
    try {
      const accountId = uid()
      const account = {
        ...form,
        id: accountId,
        _type: 'account',
        signals: [], contacts: [], activities: [],
        checklist: [], queries: [], coach_sessions: [],
        createdAt: new Date().toISOString()
      }
      await saveAccount(account)
      showToast(form.name + ' added', 'success')
      onSave(accountId) // ✅ Fixed: was onSave(form.id) — form has no id field
    } catch (e) {
      showToast(e.message, 'error')
    }
    setSaving(false)
  }

  return (
    <div className="main-content">
      <div style={{ maxWidth: 600 }}>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onCancel} className="btn btn-secondary btn-sm">← Back</button>
          <div style={{ fontSize: 18, fontWeight: 600 }}>Add deal account</div>
        </div>
        <div className="card">
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Company name *</label>
              <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Maggie Beer Holdings" autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Industry</label>
              <input className="form-input" value={form.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. Food Manufacturing" />
            </div>
            <div className="form-group">
              <label className="form-label">Location</label>
              <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Adelaide SA" />
            </div>
            <div className="form-group">
              <label className="form-label">Stage</label>
              <select className="form-input" value={form.stage} onChange={e => set('stage', e.target.value)}>
                {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Opportunity / what you are selling</label>
              <input className="form-input" value={form.opportunity} onChange={e => set('opportunity', e.target.value)} placeholder="e.g. CRM implementation, $120K ARR" />
            </div>
            <div className="form-group">
              <label className="form-label">Primary contact</label>
              <input className="form-input" value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="e.g. Jane Smith" />
            </div>
            <div className="form-group">
              <label className="form-label">Deal value ($)</label>
              <input className="form-input" type="number" value={form.dealValue} onChange={e => set('dealValue', e.target.value)} placeholder="e.g. 85000" />
            </div>
            <div className="form-group">
              <label className="form-label">Website</label>
              <input className="form-input" value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://company.com.au" />
            </div>
            <div className="form-group">
              <label className="form-label">Competitors</label>
              <input className="form-input" value={form.competitors} onChange={e => set('competitors', e.target.value)} placeholder="e.g. Salesforce, HubSpot" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving...' : 'Add account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
