import { useState } from 'react'
import { useApp } from '../../lib/context'
import { uid } from '../../lib/supabase'
import { initials } from '../../lib/helpers'
import { serperSearch, hunterPersonEmail } from '../../lib/ai'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'

const ROLES = ['Champion', 'Economic Buyer', 'Influencer', 'Blocker', 'User', 'Technical Buyer']

export default function ContactsTab({ account }) {
  const { saveAccount, showToast } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', title: '', role: 'Champion', email: '', phone: '', linkedin: '', notes: '' })
  const [showFinder, setShowFinder] = useState(false)
  const [liLoading, setLiLoading] = useState(false)
  const [liResults, setLiResults] = useState([])
  const [emailLoading, setEmailLoading] = useState({})
  const [emailResults, setEmailResults] = useState({})

  const save = (updates) => saveAccount({ ...account, ...updates })
  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const searchLinkedIn = async () => {
    setLiLoading(true); setLiResults([])
    try {
      const q = account.name + ' executives site:linkedin.com/in'
      const data = await serperSearch(q)
      const raw = (data.organic || []).slice(0, 6)
      const parsed = raw.map(r => {
        const namePart = (r.title || '').split(' - ')[0].split(' | ')[0].trim()
        const titlePart = (r.title || '').split(' - ')[1] || (r.snippet || '').split('·')[0].trim()
        return { name: namePart, title: titlePart.slice(0, 60), linkedin: r.link, snippet: r.snippet || '' }
      }).filter(r => r.name && r.name.length > 2 && !r.name.toLowerCase().includes('linkedin'))
      setLiResults(parsed)
      if (!parsed.length) showToast('No LinkedIn profiles found', 'error')
    } catch (e) { showToast('Search failed', 'error') }
    setLiLoading(false)
  }

  const findEmail = async (person, idx) => {
    setEmailLoading(prev => ({ ...prev, [idx]: true }))
    try {
      const parts = person.name.trim().split(' ')
      const firstName = parts[0] || ''
      const lastName = parts.slice(1).join(' ') || ''
      const domain = (account.website || '').replace(/^https?:\/\/(www\.)?/, '').split('/')[0]
      if (!domain) { showToast('No website on account — cannot search emails', 'error'); return }
      const result = await hunterPersonEmail(firstName, lastName, domain)
      if (result.email) {
        setEmailResults(prev => ({ ...prev, [idx]: result }))
      } else {
        showToast('No email found for ' + person.name, 'error')
      }
    } catch (e) { showToast('Email lookup failed', 'error') }
    setEmailLoading(prev => ({ ...prev, [idx]: false }))
  }

  const addFromFinder = async (person, idx) => {
    const emailData = emailResults[idx]
    const existing = account.contacts || []
    const matchIdx = existing.findIndex(c => c.name.toLowerCase() === person.name.toLowerCase())
    let contacts
    if (matchIdx >= 0) {
      contacts = existing.map((c, i) => i === matchIdx ? { ...c, linkedin: c.linkedin || person.linkedin, email: emailData ? emailData.email : c.email, emailConfidence: emailData ? emailData.score : c.emailConfidence } : c)
      showToast(person.name + ' updated', 'success')
    } else {
      contacts = [...existing, { id: uid(), name: person.name, title: person.title || '', role: 'Influencer', email: emailData ? emailData.email : '', emailConfidence: emailData ? emailData.score : undefined, linkedin: person.linkedin || '', phone: '', notes: '' }]
      showToast(person.name + ' added to contacts', 'success')
    }
    await save({ contacts })
  }

  const openAdd = () => { setEditId(null); setForm({ name: '', title: '', role: 'Champion', email: '', phone: '', linkedin: '', notes: '' }); setShowForm(true) }
  const openEdit = (c) => { setEditId(c.id); setForm({ name: c.name || '', title: c.title || '', role: c.role || 'Champion', email: c.email || '', phone: c.phone || '', linkedin: c.linkedin || '', notes: c.notes || '' }); setShowForm(true) }

  const saveContact = async () => {
    if (!form.name.trim()) return showToast('Name required', 'error')
    const contacts = account.contacts || []
    let updated
    if (editId) {
      updated = contacts.map(c => c.id === editId ? { ...c, ...form } : c)
    } else {
      updated = [...contacts, { id: uid(), ...form }]
    }
    await save({ contacts: updated })
    setShowForm(false)
    showToast(editId ? 'Contact updated' : 'Contact added', 'success')
  }

  const deleteContact = async (id) => {
    await save({ contacts: (account.contacts || []).filter(c => c.id !== id) })
    showToast('Contact removed', 'success')
  }

  const ROLE_COLORS = { 'Champion': '#0F6E56', 'Economic Buyer': '#185FA5', 'Blocker': '#A32D2D', 'Influencer': '#BA7517', 'User': '#6b7280', 'Technical Buyer': '#533AB7' }

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Contacts ({(account.contacts || []).length})</div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add contact</button>
      </div>

      {(account.contacts || []).map(c => (
        <div key={c.id} className="contact-card">
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#0F6E56', flexShrink: 0 }}>
            {initials(c.name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{c.name}</div>
              <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#f3f3f3', color: ROLE_COLORS[c.role] || '#6b7280', fontWeight: 600 }}>{c.role}</span>
            </div>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{c.title}</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {c.email && <a href={`mailto:${c.email}`} style={{ fontSize: 12, color: '#185FA5' }}>{c.email}</a>}
              {c.phone && <span style={{ fontSize: 12, color: '#6b7280' }}>{c.phone}</span>}
              {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#185FA5' }}>LinkedIn</a>}
            </div>
            {c.notes && <div style={{ fontSize: 12, color: '#374151', marginTop: 6, lineHeight: 1.5 }}>{c.notes}</div>}
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)} style={{ fontSize: 11 }}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => deleteContact(c.id)} style={{ fontSize: 11 }}>×</button>
          </div>
        </div>
      ))}

      {(account.contacts || []).length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: 13 }}>
          No contacts yet — add your first key stakeholder
        </div>
      )}

      {/* Find contacts online panel */}
      <div className="ai-panel" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showFinder ? 12 : 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Find contacts online</div>
          <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => { setShowFinder(f => !f); if (!showFinder) setLiResults([]) }}>
            {showFinder ? 'Hide' : 'Search LinkedIn + emails'}
          </button>
        </div>
        {showFinder && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <button className="btn btn-primary btn-sm" onClick={searchLinkedIn} disabled={liLoading}>
                {liLoading ? <Spinner /> : '🔍 Search LinkedIn'}
              </button>
              <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center' }}>Searching: {account.name}</span>
            </div>
            {liResults.map((r, i) => {
              const emailData = emailResults[i]
              const confColor = emailData ? (emailData.score >= 90 ? '#1D9E75' : emailData.score >= 70 ? '#BA7517' : '#A32D2D') : '#6b7280'
              return (
                <div key={i} style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{r.title}</div>
                      {r.linkedin && <a href={r.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#185FA5' }}>LinkedIn ↗</a>}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {!emailData && <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }} onClick={() => findEmail(r, i)} disabled={emailLoading[i]}>{emailLoading[i] ? <Spinner /> : '📧 Email'}</button>}
                      <button className="btn btn-primary btn-sm" style={{ fontSize: 10 }} onClick={() => addFromFinder(r, i)}>+ Add</button>
                    </div>
                  </div>
                  {emailData && (
                    <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
                      <a href={'mailto:' + emailData.email} style={{ color: '#185FA5' }}>{emailData.email}</a>
                      <span style={{ padding: '1px 6px', borderRadius: 10, background: confColor + '22', color: confColor, fontWeight: 600 }}>{emailData.score}%</span>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }} onClick={() => navigator.clipboard.writeText(emailData.email)}>Copy</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editId ? 'Edit contact' : 'Add contact'} onClose={() => setShowForm(false)}
          footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={saveContact}>Save</button></>}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e => setF('name', e.target.value)} autoFocus />
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={form.title} onChange={e => setF('title', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={form.role} onChange={e => setF('role', e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={e => setF('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-input" value={form.phone} onChange={e => setF('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">LinkedIn URL</label>
              <input className="form-input" value={form.linkedin} onChange={e => setF('linkedin', e.target.value)} />
            </div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">Notes</label>
              <textarea className="form-input" value={form.notes} onChange={e => setF('notes', e.target.value)} rows={3} />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
