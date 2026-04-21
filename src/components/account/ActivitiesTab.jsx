import { useState } from 'react'
import { useApp } from '../../lib/context'
import { uid } from '../../lib/supabase'
import Modal from '../ui/Modal'

const TYPES = ['call', 'meeting', 'email', 'note', 'demo', 'proposal']
const TYPE_ICONS = { call: '📞', meeting: '🤝', email: '✉️', note: '📝', demo: '💻', proposal: '📄' }

export default function ActivitiesTab({ account }) {
  const { saveAccount, showToast } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'call', title: '', date: new Date().toISOString().split('T')[0], notes: '', next: '' })

  const save = (updates) => saveAccount({ ...account, ...updates })
  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const addActivity = async () => {
    if (!form.title.trim()) return showToast('Title required', 'error')
    const activities = [...(account.activities || []), { id: uid(), ...form }]
    await save({ activities })
    setShowForm(false)
    setForm({ type: 'call', title: '', date: new Date().toISOString().split('T')[0], notes: '', next: '' })
    showToast('Activity logged', 'success')
  }

  const deleteActivity = async (id) => {
    await save({ activities: (account.activities || []).filter(a => a.id !== id) })
  }

  const sorted = [...(account.activities || [])].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Activity log ({sorted.length})</div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Log activity</button>
      </div>

      {sorted.map((a, i) => (
        <div key={a.id} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3f3f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{TYPE_ICONS[a.type] || '📝'}</div>
            {i < sorted.length - 1 && <div style={{ width: 1, flex: 1, background: '#e5e5e5', margin: '4px 0' }} />}
          </div>
          <div style={{ flex: 1, paddingBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{a.title}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{a.type} · {a.date}</div>
              </div>
              <button onClick={() => deleteActivity(a.id)} style={{ background: 'none', border: 'none', color: '#d4d4d4', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
            {a.notes && <div style={{ fontSize: 12, color: '#374151', marginTop: 6, lineHeight: 1.5 }}>{a.notes}</div>}
            {a.next && <div style={{ fontSize: 12, color: '#0F6E56', marginTop: 4, fontWeight: 500 }}>→ {a.next}</div>}
          </div>
        </div>
      ))}

      {sorted.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: 13 }}>No activities logged yet</div>
      )}

      {showForm && (
        <Modal title="Log activity" onClose={() => setShowForm(false)}
          footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={addActivity}>Save</button></>}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-input" value={form.type} onChange={e => setF('type', e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{TYPE_ICONS[t]} {t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Date</label>
              <input className="form-input" type="date" value={form.date} onChange={e => setF('date', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => setF('title', e.target.value)} placeholder="e.g. Discovery call with Jane Smith" autoFocus />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-input" value={form.notes} onChange={e => setF('notes', e.target.value)} rows={3} placeholder="Key takeaways, decisions, context..." />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Next action</label>
              <input className="form-input" value={form.next} onChange={e => setF('next', e.target.value)} placeholder="e.g. Send proposal by Friday" />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
