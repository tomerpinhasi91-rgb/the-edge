import { useState } from 'react'
import { useApp } from '../lib/context'
import { uid } from '../lib/supabase'
import { callAI, serperSearch, tavilySearch, extractSignals } from '../lib/ai'
import { isDemoUser, getDemoKey, DEMO_SWEEPS, DEMO_COACH, delay } from '../lib/demo'
import { initials, PRIORITY_COLORS } from '../lib/helpers'
import Modal from '../components/ui/Modal'
import Spinner from '../components/ui/Spinner'

export default function LeadView({ lead, setView, setActiveId }) {
  const { saveAccount, deleteAccount, showToast, user } = useApp()
  const [tab, setTab] = useState('overview')

  const save = (updates) => saveAccount({ ...lead, ...updates })

  const promote = async () => {
    if (!window.confirm(`Move ${lead.name} to Deal Accounts?`)) return
    const promoted = { ...lead, _type: 'account', stage: 'qualify', risk: 'medium', promotedAt: new Date().toISOString() }
    await saveAccount(promoted)
    setActiveId(lead.id)
    setView('account')
    showToast(lead.name + ' moved to deal accounts', 'success')
  }

  const removeLead = async () => {
    if (!window.confirm(`Remove ${lead.name} from leads?`)) return
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
        {TABS.map(t => <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {tab === 'overview' && <LeadOverview lead={lead} save={save} />}
      {tab === 'intelligence' && <LeadIntelligence lead={lead} save={save} user={user} showToast={showToast} />}
      {tab === 'contacts' && <LeadContacts lead={lead} save={save} showToast={showToast} />}
      {tab === 'notes' && <LeadNotes lead={lead} save={save} showToast={showToast} />}
      {tab === 'coach' && <LeadCoach lead={lead} save={save} user={user} showToast={showToast} />}
    </>
  )
}

function LeadOverview({ lead, save }) {
  return (
    <div className="main-content">
      {lead.description && (
        <div className="card">
          <div className="card-title">About</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{lead.description}</div>
          {lead.website && <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#185FA5', display: 'block', marginTop: 8 }}>{lead.website}</a>}
        </div>
      )}
      {lead.why && (
        <div className="card">
          <div className="card-title">Why this lead</div>
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{lead.why}</div>
        </div>
      )}
      {(lead.signals || []).length > 0 && (
        <div className="card">
          <div className="card-title">Key signals ({lead.signals.length})</div>
          {(lead.signals || []).slice(0, 4).map(s => (
            <div key={s.id} className={`signal-card ${s.priority}`} style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_COLORS[s.priority] }}>{s.title}</div>
              <div style={{ fontSize: 12, color: '#374151', margin: '4px 0' }}>{s.body}</div>
              <div style={{ fontSize: 12, color: '#0F6E56', fontWeight: 500 }}>→ {s.action}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

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
        if (news.length) context += 'GOOGLE NEWS:\n' + news.slice(0, 5).map((n, i) => `[${i}] ${n.title} — ${n.date || 'recent'}: ${n.snippet} (${n.link})`).join('\n') + '\n\n'
        if (organic.length) context += 'WEB:\n' + organic.slice(0, 4).map(r => `${r.title}: ${(r.snippet || '').slice(0, 200)}`).join('\n')
      }
      if (tavily.status === 'fulfilled') context += '\n' + (tavily.value.results || []).slice(0, 3).map(r => r.title + ': ' + (r.content || '').slice(0, 150)).join('\n')
      const ctx = `Lead: ${lead.name} | Industry: ${lead.industry || ''} | Location: ${lead.location || ''}`
      const prompt = `B2B sales intelligence analyst. Return ONLY valid JSON array: [{"priority":"urgent"|"watch"|"intel"|"grant","title":"one line","body":"2-3 sentences","action":"one next step TODAY","source":"publication","source_url":"URL"}]. 3-5 signals. Context: ${ctx}`
      const result = context.length > 100 ? await callAI(prompt, [{ role: 'user', content: 'Search data:\n' + context }], 800, false) : await callAI(prompt, [{ role: 'user', content: 'Find signals for: ' + query }], 800, true)
      const parsed = extractSignals(result)
      if (parsed && parsed.length) { setParsedSignals(parsed); setSweepOutput('') }
      else setSweepOutput(result)
    } catch (e) { showToast(e.message, 'error') }
    setSweepLoading(false)
  }

  const saveSignals = async () => {
    const toAdd = parsedSignals.filter(s => s._selected !== false).map(({ _selected, ...s }) => ({ id: uid(), date: new Date().toISOString().split('T')[0], ...s }))
    if (!toAdd.length) return showToast('Select at least one', 'error')
    await save({ signals: [...(lead.signals || []), ...toAdd] })
    setParsedSignals([])
    showToast(`${toAdd.length} signal${toAdd.length !== 1 ? 's' : ''} saved`, 'success')
  }

  const toggleSignal = (i) => setParsedSignals(prev => prev.map((s, idx) => idx === i ? { ...s, _selected: s._selected === false ? true : false } : s))
  const deleteSignal = (id) => save({ signals: (lead.signals || []).filter(s => s.id !== id) })

  return (
    <div className="main-content">
      <div className="ai-panel">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>⚡ Intelligence sweep</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {QUICK.map((q, i) => <button key={i} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setSweepInput(q)}>{q}</button>)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" style={{ flex: 1 }} value={sweepInput} onChange={e => setSweepInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSweep()} />
          <button className="btn btn-ai" onClick={runSweep} disabled={sweepLoading}>{sweepLoading ? <><Spinner /> Searching…</> : '⚡ Sweep'}</button>
        </div>
      </div>

      {parsedSignals.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{parsedSignals.filter(s => s._selected !== false).length} selected</div>
            <button className="btn btn-primary btn-sm" onClick={saveSignals}>Save signals</button>
          </div>
          {parsedSignals.map((s, i) => {
            const selected = s._selected !== false
            return (
              <div key={i} onClick={() => toggleSignal(i)} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderBottom: i < parsedSignals.length - 1 ? '0.5px solid #f3f3f3' : 'none', background: selected ? 'white' : '#f9f9f9', opacity: selected ? 1 : 0.5, cursor: 'pointer', borderRadius: 6, marginBottom: 4 }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}><div style={{ width: 16, height: 16, border: '0.5px solid #d4d4d4', borderRadius: 4, background: selected ? '#0F6E56' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{selected && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}</div></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}><span className={`badge badge-${s.priority}`}>{s.priority}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</span></div>
                  <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>{s.body}</div>
                  <div style={{ fontSize: 12, color: '#0F6E56', fontWeight: 500 }}>→ {s.action}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      {sweepOutput && <div className="card"><div className="ai-output">{sweepOutput}</div></div>}

      {(lead.signals || []).length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Saved signals ({lead.signals.length})</div>
          {[...(lead.signals || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(s => (
            <div key={s.id} className={`signal-card ${s.priority}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span className={`badge badge-${s.priority}`}>{s.priority}</span><span style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</span></div>
                <button onClick={() => deleteSignal(s.id)} style={{ background: 'none', border: 'none', color: '#d4d4d4', cursor: 'pointer', fontSize: 14 }}>×</button>
              </div>
              <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>{s.body}</div>
              <div style={{ fontSize: 12, color: '#0F6E56', fontWeight: 500 }}>→ {s.action}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function LeadContacts({ lead, save, showToast }) {
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState(null)
  const [form, setForm] = useState({ name: '', title: '', role: 'Champion', email: '', linkedin: '', notes: '' })
  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const openAdd = () => { setEditId(null); setForm({ name: '', title: '', role: 'Champion', email: '', linkedin: '', notes: '' }); setShowForm(true) }
  const openEdit = (c) => { setEditId(c.id); setForm({ name: c.name || '', title: c.title || '', role: c.role || 'Champion', email: c.email || '', linkedin: c.linkedin || '', notes: c.notes || '' }); setShowForm(true) }
  const saveContact = async () => {
    if (!form.name.trim()) return showToast('Name required', 'error')
    const contacts = lead.contacts || []
    const updated = editId ? contacts.map(c => c.id === editId ? { ...c, ...form } : c) : [...contacts, { id: uid(), ...form }]
    await save({ contacts: updated }); setShowForm(false); showToast(editId ? 'Updated' : 'Added', 'success')
  }
  const deleteContact = async (id) => { await save({ contacts: (lead.contacts || []).filter(c => c.id !== id) }) }

  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Contacts ({(lead.contacts || []).length})</div>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>+ Add contact</button>
      </div>
      {(lead.contacts || []).map(c => (
        <div key={c.id} className="contact-card">
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#0F6E56', flexShrink: 0 }}>{initials(c.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{c.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{c.title} · {c.role}</div>
            {c.email && <div style={{ fontSize: 12, color: '#185FA5', marginTop: 4 }}>{c.email}</div>}
            {c.notes && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{c.notes}</div>}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)} style={{ fontSize: 11 }}>Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => deleteContact(c.id)} style={{ fontSize: 11 }}>×</button>
          </div>
        </div>
      ))}
      {showForm && (
        <Modal title={editId ? 'Edit contact' : 'Add contact'} onClose={() => setShowForm(false)}
          footer={<><button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={saveContact}>Save</button></>}>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setF('name', e.target.value)} autoFocus /></div>
            <div className="form-group"><label className="form-label">Title</label><input className="form-input" value={form.title} onChange={e => setF('title', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={form.email} onChange={e => setF('email', e.target.value)} /></div>
            <div className="form-group"><label className="form-label">LinkedIn</label><input className="form-input" value={form.linkedin} onChange={e => setF('linkedin', e.target.value)} /></div>
            <div className="form-group" style={{ gridColumn: '1 / -1' }}><label className="form-label">Notes</label><textarea className="form-input" value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} /></div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function LeadNotes({ lead, save, showToast }) {
  const [editing, setEditing] = useState(false)
  const [notes, setNotes] = useState(lead.notes || '')
  const saveNotes = async () => { await save({ notes }); setEditing(false); showToast('Notes saved', 'success') }
  return (
    <div className="main-content">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Notes</div>
        {editing ? (
          <div style={{ display: 'flex', gap: 6 }}><button className="btn btn-secondary btn-sm" onClick={() => { setEditing(false); setNotes(lead.notes || '') }}>Cancel</button><button className="btn btn-primary btn-sm" onClick={saveNotes}>Save</button></div>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
        )}
      </div>
      {editing ? (
        <textarea className="form-input" value={notes} onChange={e => setNotes(e.target.value)} rows={15} style={{ width: '100%' }} autoFocus />
      ) : (
        <div className="card" style={{ minHeight: 120 }}>
          {lead.notes ? <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{lead.notes}</div> : <div style={{ color: '#9ca3af', fontSize: 13 }}>No notes yet — click Edit to add</div>}
        </div>
      )}
    </div>
  )
}

function LeadCoach({ lead, save, user, showToast }) {
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')
  const sessions = lead.coach_sessions || []

  const buildContext = () => {
    const signals = (lead.signals || []).slice(0, 3).map(s => s.title + ': ' + s.body).join(' | ')
    const contacts = (lead.contacts || []).slice(0, 3).map(c => c.name + ' (' + c.title + ')').join(', ')
    const tp = (lead.talking_points || []).join(' | ')
    return `Lead: ${lead.name} | Industry: ${lead.industry || ''} | Location: ${lead.location || ''} | Description: ${lead.description || ''}${signals ? ' | Signals: ' + signals : ''}${contacts ? ' | Contacts: ' + contacts : ''}${tp ? ' | Talking points: ' + tp : ''}`
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
      const result = await callAI('You are an elite B2B sales coach helping a rep win this lead. Use all context provided. Be specific, direct and actionable.', [{ role: 'user', content: 'LEAD CONTEXT:\n' + buildContext() + '\n\nCOACHING REQUEST: ' + q }], 800)
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
        <div className="card">
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
