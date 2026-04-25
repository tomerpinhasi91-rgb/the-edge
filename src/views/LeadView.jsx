import { useState } from 'react'
import { useApp } from '../lib/context'
import { uid } from '../lib/supabase'
import { callAI, serperSearch, tavilySearch, extractSignals, scoreLead } from '../lib/ai'
import { isDemoUser, getDemoKey, DEMO_SWEEPS, DEMO_COACH, delay } from '../lib/demo'
import { initials, PRIORITY_COLORS, PRIORITY_BG, loadProfile, buildRepContext } from '../lib/helpers'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'

// ── Score circle helper ──────────────────────────────────────────
function ScoreCircle({ score }) {
  if (!score) return null
  const n = parseInt(score, 10)
  const color = n >= 80 ? '#1D9E75' : n >= 60 ? '#BA7517' : '#A32D2D'
  const bg = n >= 80 ? '#e1f5ee' : n >= 60 ? '#FAEEDA' : '#FCEBEB'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{
        width: 60, height: 60, borderRadius: '50%',
        background: bg, border: '3px solid ' + color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: 20, color
      }}>{n}</div>
      <div style={{ fontSize: 10, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</div>
    </div>
  )
}

export default function LeadView({ lead, setView, setActiveId }) {
  const { saveAccount, deleteAccount, showToast, user } = useApp()
  const [tab, setTab] = useState('overview')

  const save = (updates) => saveAccount({ ...lead, ...updates })

  const promote = async () => {
    if (!window.confirm('Move ' + lead.name + ' to Deal Accounts?')) return
    const promoted = { ...lead, _type: 'account', stage: 'qualify', risk: 'medium', promotedAt: new Date().toISOString() }
    await saveAccount(promoted)
    setActiveId(lead.id)
    setView('account')
    showToast(lead.name + ' moved to deal accounts', 'success')
  }

  const removeLead = async () => {
    if (!window.confirm('Remove ' + lead.name + ' from leads?')) return
    await deleteAccount(lead._dbId)
    setView('leadroom')
    showToast('Lead removed', 'success')
  }

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'intelligence', label: 'Intelligence' },
    { key: 'contacts', label: 'Contacts' },
    { key: 'notes', label: 'Notes' },
    { key: 'coach', label: 'AI Coach' },
  ]

  return (
    <>
      <div className="topbar">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{lead.name}</div>
          <div style={{ fontSize: 12, color: '#9ca3af' }}>{[lead.industry, lead.location, lead.size].filter(Boolean).join(' · ')}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: '#FAEEDA', color: '#BA7517', fontWeight: 500 }}>Lead</span>
          <button className="btn btn-secondary btn-sm" onClick={removeLead}>Remove</button>
          <button className="btn btn-primary btn-sm" onClick={promote}>Convert to deal →</button>
        </div>
      </div>

      <div className="tabs">
        {TABS.map(t => <button key={t.key} className={'tab-btn' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {tab === 'overview' && <LeadOverview lead={lead} save={save} promote={promote} showToast={showToast} user={user} />}
      {tab === 'intelligence' && <LeadIntelligence lead={lead} save={save} user={user} showToast={showToast} />}
      {tab === 'contacts' && <LeadContacts lead={lead} save={save} showToast={showToast} />}
      {tab === 'notes' && <LeadNotes lead={lead} save={save} showToast={showToast} />}
      {tab === 'coach' && <LeadCoach lead={lead} save={save} user={user} showToast={showToast} />}
    </>
  )
}

// ── Overview tab ─────────────────────────────────────────────────
function LeadOverview({ lead, save, promote, showToast, user }) {
  const signals = lead.signals || []
  const urgentCount = signals.filter(s => s.priority === 'urgent').length
  const [rescoring, setRescoring] = useState(false)

  const rescore = async () => {
    setRescoring(true)
    try {
      const result = await scoreLead({ ...lead, stakeholders: lead.contacts || [] })
      await save({ score: result.score, scoreReason: result.reasoning })
      showToast('Score updated: ' + result.score + '/100', 'success')
    } catch (e) { showToast('Rescore failed', 'error') }
    setRescoring(false)
  }

  // Company info rows — only show fields that have data
  const infoRows = [
    ['Industry', lead.industry],
    ['Location', lead.location],
    ['Size', lead.size],
    ['Revenue', lead.revenue],
    ['Website', lead.website],
  ].filter(([, v]) => v)

  // Signal badge summary — first 4 signals
  const badgeSignals = signals.slice(0, 4)

  return (
    <div className="main-content">
      {/* Top row: company info card + score circle */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 0 }}>
        {/* Company info card */}
        <div className="card" style={{ flex: 1, marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2937', marginBottom: 10 }}>{lead.name}</div>
              {infoRows.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 16px', fontSize: 13 }}>
                  {infoRows.map(([label, value]) => (
                    <>
                      <span key={label + '_l'} style={{ color: '#9ca3af', fontWeight: 500 }}>{label}</span>
                      <span key={label + '_v'} style={{ color: '#374151' }}>
                        {label === 'Website'
                          ? <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: '#185FA5' }}>{value.replace(/^https?:\/\/(www\.)?/, '')}</a>
                          : value}
                      </span>
                    </>
                  ))}
                </div>
              ) : (
                <div style={{ color: '#9ca3af', fontSize: 13 }}>No company info — run an Intelligence Sweep to populate</div>
              )}
            </div>
            {lead.score ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <ScoreCircle score={lead.score} />
                {lead.scoreReason && <div style={{ fontSize: 10, color: '#9ca3af', maxWidth: 120, textAlign: 'center', lineHeight: 1.4 }}>{lead.scoreReason}</div>}
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }} onClick={rescore} disabled={rescoring}>{rescoring ? <Spinner /> : '↻ Re-score'}</button>
              </div>
            ) : (
              <button className="btn btn-secondary btn-sm" style={{ fontSize: 10, flexShrink: 0 }} onClick={rescore} disabled={rescoring}>{rescoring ? <><Spinner /> Scoring…</> : '⭐ Score lead'}</button>
            )}
          </div>

          {/* Signal badge summary */}
          {badgeSignals.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, paddingTop: 10, borderTop: '0.5px solid #f3f3f3' }}>
              {badgeSignals.map((s, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: '2px 9px', borderRadius: 20,
                  background: PRIORITY_BG[s.priority] || '#f3f3f3',
                  color: PRIORITY_COLORS[s.priority] || '#6b7280',
                  fontWeight: 500, border: '0.5px solid ' + (PRIORITY_COLORS[s.priority] || '#e5e5e5') + '55'
                }}>
                  {s.title.length > 40 ? s.title.slice(0, 40) + '…' : s.title}
                </span>
              ))}
              {signals.length > 4 && (
                <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 20, background: '#f3f3f3', color: '#9ca3af' }}>
                  +{signals.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Why this lead */}
      {lead.why && (
        <div className="card">
          <div className="card-title">Why this lead</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{lead.why}</div>
        </div>
      )}

      {/* About / description */}
      {lead.description && (
        <div className="card">
          <div className="card-title">About</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{lead.description}</div>
        </div>
      )}

      {/* Key signals */}
      {signals.length > 0 && (
        <div className="card">
          <div className="card-title">Key signals ({signals.length})</div>
          {signals.slice(0, 4).map(s => (
            <div key={s.id} className={'signal-card ' + s.priority} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_COLORS[s.priority] }}>{s.title}</div>
              <div style={{ fontSize: 12, color: '#374151', margin: '4px 0' }}>{s.body}</div>
              <div style={{ fontSize: 12, color: '#0F6E56', fontWeight: 500 }}>→ {s.action}</div>
            </div>
          ))}
        </div>
      )}

      {/* Talking points — with green left border accent */}
      {(lead.talking_points || []).length > 0 && (
        <div className="card" style={{ borderLeft: '3px solid #1D9E75' }}>
          <div className="card-title">Talking points</div>
          {(lead.talking_points || []).map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13, color: '#374151', lineHeight: 1.5, paddingBottom: 8, borderBottom: i < lead.talking_points.length - 1 ? '0.5px solid #f3f3f3' : 'none' }}>
              <span style={{ color: '#1D9E75', fontWeight: 700, flexShrink: 0, fontSize: 11 }}>{String(i + 1).padStart(2, '0')}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      )}

      {/* CTA banner — "Ready to work this deal?" */}
      <div style={{ background: '#FAEEDA', border: '0.5px solid #BA7517', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <div style={{ fontWeight: 600, color: '#7A4A00', fontSize: 14, marginBottom: 3 }}>Ready to work this deal? 🚀</div>
          <div style={{ fontSize: 12, color: '#BA7517' }}>Convert this lead to a deal account to unlock stages, activities, and full pipeline tracking.</div>
        </div>
        <button className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={promote}>
          Convert to deal →
        </button>
      </div>
    </div>
  )
}

// ── Intelligence tab (unchanged from V3) ─────────────────────────
function LeadIntelligence({ lead, save, user, showToast }) {
  const [sweepInput, setSweepInput] = useState(lead.name + ' news 2026')
  const [sweepLoading, setSweepLoading] = useState(false)
  const [parsedSignals, setParsedSignals] = useState([])
  const [sweepOutput, setSweepOutput] = useState('')

  const QUICK = [lead.name + ' news 2026', lead.industry + ' trends 2026', 'Grant opportunities ' + (lead.location || 'Australia'), 'Competitor moves ' + lead.name]

  const runSweep = async () => {
    if (!sweepInput.trim()) return
    setSweepLoading(true); setSweepOutput(''); setParsedSignals([])
    if (isDemoUser(user)) {
      await delay(1200)
      const key = getDemoKey(lead.name)
      const match = Object.keys(DEMO_SWEEPS).find(k => key.includes(k) || k.includes(key))
      if (match) setParsedSignals(DEMO_SWEEPS[match])
      else setSweepOutput('Demo sweep complete. Pre-loaded for: Apex Protein Co, BlueCrest Logistics, Summit Packaging, Harvest Ridge Foods.')
      setSweepLoading(false); return
    }
    try {
      const query = sweepInput + ' ' + lead.name + ' ' + (lead.industry || '') + ' ' + (lead.location || '')
      const [serper, tavily] = await Promise.allSettled([serperSearch(query), tavilySearch(query, 5)])
      let context = ''
      if (serper.status === 'fulfilled') {
        const news = serper.value.news || [], organic = serper.value.organic || []
        if (news.length) context += 'GOOGLE NEWS:\n' + news.slice(0, 5).map((n, i) => '[' + i + '] ' + n.title + ' — ' + (n.date || 'recent') + ': ' + n.snippet + ' (' + n.link + ')').join('\n') + '\n\n'
        if (organic.length) context += 'WEB:\n' + organic.slice(0, 4).map(r => r.title + ': ' + (r.snippet || '').slice(0, 200)).join('\n')
      }
      if (tavily.status === 'fulfilled') context += '\n' + (tavily.value.results || []).slice(0, 3).map(r => r.title + ': ' + (r.content || '').slice(0, 150)).join('\n')
      const ctx = 'Lead: ' + lead.name + ' | Industry: ' + (lead.industry || '') + ' | Location: ' + (lead.location || '')
      const prompt = 'B2B sales intelligence analyst. Return ONLY valid JSON array: [{"priority":"urgent"|"watch"|"intel"|"grant","title":"one line","body":"2-3 sentences","action":"one next step TODAY","source":"publication","source_url":"URL"}]. 3-5 signals. Context: ' + ctx
      const result = context.length > 100 ? await callAI(prompt, [{ role: 'user', content: 'Search data:\n' + context }], 800, false) : await callAI(prompt, [{ role: 'user', content: 'Find signals for: ' + query }], 800, true)
      const parsed = extractSignals(result)
      if (parsed && parsed.length) { setParsedSignals(parsed); setSweepOutput('') }
      else setSweepOutput(result)
    } catch (e) { showToast(e.message, 'error') }
    setSweepLoading(false)
  }

  const saveSignals = async () => {
    const toAdd = parsedSignals.filter(s => s._selected !== false).map(({ _selected, ...s }) => ({ id: uid(), date: new Date().toISOString().split('T')[0], ...s }))
    await save({ signals: [...(lead.signals || []), ...toAdd] })
    setParsedSignals([]); showToast(toAdd.length + ' signals saved', 'success')
  }

  const toggleSignal = (i) => setParsedSignals(prev => prev.map((s, idx) => idx === i ? { ...s, _selected: s._selected === false ? true : false } : s))

  return (
    <div className="main-content">
      <div className="ai-panel">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>Intelligence Sweep</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {QUICK.map((q, i) => (
            <button key={i} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setSweepInput(q)}>{q}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" style={{ flex: 1, fontSize: 13 }} value={sweepInput} onChange={e => setSweepInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !sweepLoading && runSweep()} placeholder="Search topic..." />
          <button className="btn btn-primary" onClick={runSweep} disabled={sweepLoading}>{sweepLoading ? <Spinner /> : 'Sweep'}</button>
        </div>
      </div>

      {parsedSignals.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Found {parsedSignals.length} signals — select to save</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setParsedSignals([])}>Dismiss</button>
              <button className="btn btn-primary btn-sm" onClick={saveSignals}>Save selected</button>
            </div>
          </div>
          {parsedSignals.map((s, i) => (
            <div key={i} onClick={() => toggleSignal(i)} style={{ padding: '10px 12px', borderRadius: 8, marginBottom: 8, cursor: 'pointer', border: '0.5px solid ' + (s._selected === false ? '#e5e5e5' : (PRIORITY_COLORS[s.priority] || '#e5e5e5')), background: s._selected === false ? '#fafafa' : (PRIORITY_BG[s.priority] || '#f9f9f9'), opacity: s._selected === false ? 0.5 : 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLORS[s.priority], textTransform: 'uppercase' }}>{s.priority}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#1f2937' }}>{s.title}</span>
              </div>
              <div style={{ fontSize: 12, color: '#374151' }}>{s.body}</div>
              {s.action && <div style={{ fontSize: 12, color: '#0F6E56', marginTop: 4 }}>→ {s.action}</div>}
            </div>
          ))}
        </div>
      )}

      {sweepOutput && (
        <div className="card">
          <div className="ai-output" style={{ fontSize: 12 }}>{sweepOutput}</div>
        </div>
      )}

      {(lead.signals || []).length > 0 && (
        <div className="card">
          <div className="card-title">Saved signals ({lead.signals.length})</div>
          {lead.signals.map(s => (
            <div key={s.id} className={'signal-card ' + s.priority} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLORS[s.priority], textTransform: 'uppercase' }}>{s.priority}</span>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{s.title}</span>
              </div>
              <div style={{ fontSize: 12, color: '#374151' }}>{s.body}</div>
              {s.action && <div style={{ fontSize: 12, color: '#0F6E56', marginTop: 4 }}>→ {s.action}</div>}
              {s.source && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>via {s.source} {s.date ? '· ' + s.date : ''}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Contacts tab (unchanged from V3) ─────────────────────────────
function LeadContacts({ lead, save, showToast }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', title: '', role: '', email: '', phone: '', linkedin: '', notes: '' })
  const contacts = lead.contacts || []
  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const addContact = async () => {
    if (!form.name.trim()) return showToast('Name required', 'error')
    await save({ contacts: [...contacts, { id: uid(), ...form }] })
    setForm({ name: '', title: '', role: '', email: '', phone: '', linkedin: '', notes: '' })
    setOpen(false); showToast('Contact added', 'success')
  }

  const removeContact = async (id) => save({ contacts: contacts.filter(c => c.id !== id) })

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Contacts ({contacts.length})</div>
        <button className="btn btn-primary btn-sm" onClick={() => setOpen(true)}>+ Add contact</button>
      </div>
      {contacts.length === 0 && <div style={{ color: '#9ca3af', fontSize: 13 }}>No contacts yet.</div>}
      {contacts.map(c => (
        <div key={c.id} className="contact-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 12, color: '#0F6E56', flexShrink: 0 }}>{initials(c.name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>{[c.title, c.role].filter(Boolean).join(' · ')}</div>
            </div>
            <button className="btn btn-danger btn-sm" style={{ fontSize: 10 }} onClick={() => removeContact(c.id)}>Remove</button>
          </div>
          {(c.email || c.phone || c.linkedin) && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: '0.5px solid #f3f3f3', display: 'flex', gap: 12, fontSize: 12 }}>
              {c.email && <a href={'mailto:' + c.email} style={{ color: '#185FA5' }}>{c.email}</a>}
              {c.phone && <span style={{ color: '#6b7280' }}>{c.phone}</span>}
              {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: '#0F6E56' }}>LinkedIn</a>}
            </div>
          )}
          {c.notes && <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>{c.notes}</div>}
        </div>
      ))}
      {open && (
        <Modal title="Add contact" onClose={() => setOpen(false)}
          footer={<><button className="btn btn-secondary" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={addContact}>Add</button></>}>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setF('name', e.target.value)} autoFocus /></div>
            <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={e => setF('title', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Role / influence</label><input className="form-input" value={form.role} onChange={e => setF('role', e.target.value)} placeholder="Decision maker, Champion..." /></div>
            <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setF('phone', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={e => setF('email', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">LinkedIn</label><input className="form-input" value={form.linkedin} onChange={e => setF('linkedin', e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Notes</label><textarea className="form-input" value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}

// ── Notes tab (unchanged from V3) ────────────────────────────────
function LeadNotes({ lead, save, showToast }) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(lead.notes || '')
  const saveNotes = async () => { await save({ notes }); setEditing(false); showToast('Notes saved', 'success') }
  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Notes</div>
        {editing
          ? <div style={{ display: 'flex', gap: 6 }}><button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); setNotes(lead.notes || '') }}>Cancel</button><button className="btn btn-primary btn-sm" onClick={saveNotes}>Save</button></div>
          : <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>}
      </div>
      {editing
        ? <textarea className="form-input" value={notes} onChange={e => setNotes(e.target.value)} rows={15} style={{ width: '100%' }} autoFocus />
        : <div className="card" style={{ minHeight: 120 }}>
            {lead.notes ? <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{lead.notes}</div> : <div style={{ color: '#9ca3af', fontSize: 13 }}>No notes yet — click Edit to add</div>}
          </div>}
    </div>
  )
}

// ── AI Coach tab (unchanged from V3) ─────────────────────────────
function LeadCoach({ lead, save, user, showToast }) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')
  const sessions = lead.coach_sessions || []

  const buildContext = () => {
    const signals = (lead.signals || []).slice(0, 3).map(s => s.title + ': ' + s.body).join(' | ')
    const contacts = (lead.contacts || []).slice(0, 3).map(c => c.name + ' (' + c.title + ')').join(', ')
    const tp = (lead.talking_points || []).join(' | ')
    return 'Lead: ' + lead.name + ' | Industry: ' + (lead.industry || '') + ' | Location: ' + (lead.location || '') + ' | Description: ' + (lead.description || '') + (signals ? ' | Signals: ' + signals : '') + (contacts ? ' | Contacts: ' + contacts : '') + (tp ? ' | Talking points: ' + tp : '')
  }

  const run = async (p) => {
    const q = p || prompt
    if (!q.trim()) return
    setLoading(true); setOutput('')
    if (isDemoUser(user)) {
      await delay(1800)
      const key = getDemoKey(lead.name)
      const match = Object.keys(DEMO_COACH.approach).find(k => key.includes(k) || k.includes(key))
      const isFirstCall = q.toLowerCase().includes('call') || q.toLowerCase().includes('prep')
      if (match) {
        const response = isFirstCall ? (DEMO_COACH.firstcall[match] || DEMO_COACH.approach[match]) : DEMO_COACH.approach[match]
        const newSession = { id: uid(), date: new Date().toISOString().split('T')[0], prompt: q, response }
        await save({ coach_sessions: [...sessions, newSession] })
        setOutput(response); setPrompt(''); showToast('Saved', 'success')
      } else setOutput('Demo coaching available for Apex Protein Co, BlueCrest Logistics, Summit Packaging, Harvest Ridge Foods.')
      setLoading(false); return
    }
    try {
      const { repName, repCtx } = buildRepContext(loadProfile(user?.id))
      let systemPrompt = 'You are an elite B2B sales coach helping a rep win this lead. Use all context provided. Be specific, direct and actionable.'
      if (repCtx) systemPrompt += '\n\nREP PROFILE: ' + repCtx
      if (repName) systemPrompt += ' When writing emails or call scripts, always sign off as ' + repName + '.'
      const result = await callAI(systemPrompt, [{ role: 'user', content: 'LEAD CONTEXT:\n' + buildContext() + '\n\nCOACHING REQUEST: ' + q }], 900)
      const newSession = { id: uid(), date: new Date().toISOString().split('T')[0], prompt: q, response: result }
      await save({ coach_sessions: [...sessions, newSession] })
      setOutput(result); setPrompt(''); showToast('Coach response saved', 'success')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const deleteSession = (id) => save({ coach_sessions: sessions.filter(s => s.id !== id) })

  const PRESETS = [
    { label: '🎯 Approach strategy', prompt: 'What is the best approach strategy for this lead? Who should I contact first and what should my opening message focus on?' },
    { label: '📞 First call prep', prompt: 'Help me prepare for my first call. What should I open with, what questions to ask, what pain points to probe?' },
    { label: '✉ Cold email', prompt: 'Write a personalised cold email to the key contact referencing the signals and talking points.' },
    { label: '⚠️ Risk check', prompt: 'What are the main risks in pursuing this lead and what should I watch out for?' },
  ]

  return (
    <div className="main-content">
      {(lead.talking_points || []).length > 0 && (
        <div className="card" style={{ borderLeft: '3px solid #1D9E75' }}>
          <div className="card-title">Research talking points</div>
          {(lead.talking_points || []).map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, fontSize: 13, color: '#374151', lineHeight: 1.5, paddingBottom: 8, borderBottom: i < lead.talking_points.length - 1 ? '0.5px solid #f3f3f3' : 'none' }}>
              <span style={{ color: '#1D9E75', fontWeight: 700, flexShrink: 0, fontSize: 11 }}>{String(i + 1).padStart(2, '0')}</span>
              <span>{t}</span>
            </div>
          ))}
        </div>
      )}

      {sessions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Saved sessions ({sessions.length})</div>
          {[...sessions].reverse().map(s => (
            <div key={s.id} className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div><div style={{ fontSize: 12, fontWeight: 600 }}>{s.prompt.slice(0, 80)}{s.prompt.length > 80 ? '...' : ''}</div><div style={{ fontSize: 11, color: '#9ca3af' }}>{s.date}</div></div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }} onClick={() => navigator.clipboard.writeText(s.response).then(() => showToast('Copied', 'success'))}>Copy</button>
                  <button className="btn btn-danger btn-sm" style={{ fontSize: 10 }} onClick={() => deleteSession(s.id)}>Delete</button>
                </div>
              </div>
              <div className="ai-output" style={{ fontSize: 12, maxHeight: 200, overflowY: 'auto' }}>{s.response}</div>
            </div>
          ))}
        </div>
      )}

      <div className="ai-panel">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>AI Coach — {lead.name}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {PRESETS.map((p, i) => <button key={i} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => run(p.prompt)} disabled={loading}>{p.label}</button>)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" style={{ flex: 1, fontSize: 13 }} placeholder="Ask anything about this lead..." value={prompt} onChange={e => setPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && !loading && run()} />
          <button className="btn btn-primary" onClick={() => run()} disabled={loading}>{loading ? <Spinner /> : 'Ask'}</button>
        </div>
      </div>

      {output && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Latest response</div>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }} onClick={() => setOutput('')}>Clear</button>
          </div>
          <div className="ai-output">{output}</div>
        </div>
      )}
    </div>
  )
}
