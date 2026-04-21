import { useState } from 'react'
import { useApp } from '../lib/context'
import DashboardTab from '../components/account/DashboardTab'
import ContactsTab from '../components/account/ContactsTab'
import ActivitiesTab from '../components/account/ActivitiesTab'
import IntelligenceTab from '../components/account/IntelligenceTab'
import CoachTab from '../components/account/CoachTab'
import Modal from '../components/ui/Modal'
import { STAGE_LABELS } from '../lib/helpers'

const STAGES = ['qualify', 'proposal', 'negotiate', 'closing', 'won', 'lost']

export default function AccountView({ account, setView }) {
  const { saveAccount, deleteAccount, showToast } = useApp()
  const [tab, setTab] = useState('dashboard')
  const [editOpen, setEditOpen] = useState(false)
  const [editForm, setEditForm] = useState(null)

  const openEdit = () => {
    setEditForm({ name: account.name || '', industry: account.industry || '', location: account.location || '', stage: account.stage || 'qualify', risk: account.risk || 'medium', opportunity: account.opportunity || '', contact: account.contact || '', dealValue: account.dealValue || '', timeline: account.timeline || '', nextMeeting: account.nextMeeting || '', competitors: account.competitors || '', website: account.website || '', strategy: account.strategy || '', description: account.description || '' })
    setEditOpen(true)
  }

  const saveEdit = async () => {
    await saveAccount({ ...account, ...editForm })
    setEditOpen(false)
    showToast('Account updated', 'success')
  }

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${account.name}? This cannot be undone.`)) return
    await deleteAccount(account._dbId)
    setView('leadroom')
    showToast('Account deleted', 'success')
  }

  const setF = (k, v) => setEditForm(prev => ({ ...prev, [k]: v }))

  const TABS = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'intelligence', label: 'Intelligence' },
    { key: 'activities', label: 'Activities' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'coach', label: 'AI Coach' },
  ]

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600, color: '#1f2937' }}>{account.name}</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{[account.industry, account.location, account.size].filter(Boolean).join(' · ')}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#e1f5ee', color: '#0F6E56', fontWeight: 500 }}>{STAGE_LABELS[account.stage] || account.stage || 'Qualify'}</span>
          <button className="btn btn-secondary btn-sm" onClick={openEdit}>Edit</button>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {TABS.map(t => (
          <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'dashboard' && <DashboardTab account={account} onEdit={openEdit} />}
      {tab === 'intelligence' && <IntelligenceTab account={account} />}
      {tab === 'activities' && <ActivitiesTab account={account} />}
      {tab === 'contacts' && <ContactsTab account={account} />}
      {tab === 'coach' && <CoachTab account={account} />}

      {/* Edit modal */}
      {editOpen && editForm && (
        <Modal title={`Edit — ${account.name}`} onClose={() => setEditOpen(false)}
          footer={<><button className="btn btn-secondary" onClick={() => setEditOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={saveEdit}>Save changes</button></>}>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Company name</label><input className="form-input" value={editForm.name} onChange={e => setF('name', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Industry</label><input className="form-input" value={editForm.industry} onChange={e => setF('industry', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Location</label><input className="form-input" value={editForm.location} onChange={e => setF('location', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Stage</label>
              <select className="form-input" value={editForm.stage} onChange={e => setF('stage', e.target.value)}>
                {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Risk</label>
              <select className="form-input" value={editForm.risk} onChange={e => setF('risk', e.target.value)}>
                {['low','medium','high'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Deal value ($)</label><input className="form-input" type="number" value={editForm.dealValue} onChange={e => setF('dealValue', e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Opportunity</label><input className="form-input" value={editForm.opportunity} onChange={e => setF('opportunity', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Primary contact</label><input className="form-input" value={editForm.contact} onChange={e => setF('contact', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Timeline</label><input className="form-input" value={editForm.timeline} onChange={e => setF('timeline', e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Next meeting</label><input className="form-input" value={editForm.nextMeeting} onChange={e => setF('nextMeeting', e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Competitors</label><input className="form-input" value={editForm.competitors} onChange={e => setF('competitors', e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Win strategy</label><textarea className="form-input" value={editForm.strategy} onChange={e => setF('strategy', e.target.value)} rows={3} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Description</label><textarea className="form-input" value={editForm.description} onChange={e => setF('description', e.target.value)} rows={3} /></div>
          </div>
        </Modal>
      )}
    </>
  )
}
