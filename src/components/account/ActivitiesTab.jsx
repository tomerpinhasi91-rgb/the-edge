import { useState } from 'react'
import { useApp } from '../../lib/context'
import { uid } from '../../lib/supabase'
import { callAI } from '../../lib/ai'
import { isDemoUser, getDemoKey, DEMO_COACH, delay } from '../../lib/demo'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'

const TYPES = ['call', 'meeting', 'email', 'note', 'demo', 'proposal']
const TYPE_ICONS = { call: '📞', meeting: '🤝', email: '✉️', note: '📝', demo: '💻', proposal: '📄' }

const AI_ACTIONS = [
  {
    label: '✉️ Follow up email',
    prompt: (account, recent) =>
      'Write a concise, professional follow-up email for the deal below. Reference recent activity and next steps. Output the email only — subject line then body.\n\nDEAL: ' + account.name +
      ' | Stage: ' + (account.stage || '') +
      ' | Opportunity: ' + (account.opportunity || '') +
      ' | Primary contact: ' + (account.contact || '') +
      '\nRECENT ACTIVITY:\n' + recent
  },
  {
    label: '📞 Call script',
    prompt: (account, recent) =>
      'Write a punchy call script for the deal below. Include: opener, 3 discovery questions, key value props, objection handles, close. Be direct and specific.\n\nDEAL: ' + account.name +
      ' | Stage: ' + (account.stage || '') +
      ' | Opportunity: ' + (account.opportunity || '') +
      ' | Competitors: ' + (account.competitors || 'unknown') +
      '\nRECENT ACTIVITY:\n' + recent
  },
  {
    label: '🎯 Next best actions',
    prompt: (account, recent) =>
      'You are a B2B sales coach. Given the deal context and recent activity, recommend the 3-5 highest-impact next actions to advance this deal. Be specific and prioritised.\n\nDEAL: ' + account.name +
      ' | Stage: ' + (account.stage || '') +
      ' | Risk: ' + (account.risk || '') +
      ' | Timeline: ' + (account.timeline || 'unknown') +
      ' | Next meeting: ' + (account.nextMeeting || 'not set') +
      ' | Opportunity: ' + (account.opportunity || '') +
      '\nRECENT ACTIVITY:\n' + recent
  },
  {
    label: '📄 Proposal prep',
    prompt: (account, recent) =>
      'Help prepare a winning proposal outline for the deal below. Include: executive summary angle, key pain points to address, proposed solution structure, ROI / value proof points, risk mitigants, suggested pricing approach.\n\nDEAL: ' + account.name +
      ' | Stage: ' + (account.stage || '') +
      ' | Deal value: ' + (account.dealValue ? '$' + account.dealValue : 'TBD') +
      ' | Opportunity: ' + (account.opportunity || '') +
      ' | Strategy: ' + (account.strategy || 'not set') +
      ' | Competitors: ' + (account.competitors || 'unknown') +
      '\nRECENT ACTIVITY:\n' + recent
  },
]

export default function ActivitiesTab({ account }) {
  const { saveAccount, showToast, user } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'call', title: '', date: new Date().toISOString().split('T')[0], notes: '', next: '' })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiOutput, setAiOutput] = useState('')
  const [aiLabel, setAiLabel] = useState('')

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

  const runAI = async (action) => {
    setAiLoading(true)
    setAiOutput('')
    setAiLabel(action.label)

    // Build recent activity context — last 5 sorted by date
    const sorted5 = [...(account.activities || [])]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 5)
    const recent = sorted5.length > 0
      ? sorted5.map(a => '- [' + a.type + '] ' + a.title + ' (' + a.date + ')' + (a.notes ? ': ' + a.notes : '') + (a.next ? ' → Next: ' + a.next : '')).join('\n')
      : 'No activities logged yet.'

    // Demo mode
    if (isDemoUser(user)) {
      await delay(1600)
      const key = getDemoKey(account.name)
      const match = Object.keys(DEMO_COACH.approach).find(k => key.includes(k) || k.includes(key))
      if (match) setAiOutput(DEMO_COACH.approach[match])
      else setAiOutput('Demo AI assistant available for: Apex Protein Co, BlueCrest Logistics, Summit Packaging, Harvest Ridge Foods.')
      setAiLoading(false)
      return
    }

    try {
      const systemPrompt = 'You are an elite B2B sales coach and strategist. Use all deal context provided. Be specific, direct, and immediately actionable. Output clean formatted text — no unnecessary preamble.'
      const result = await callAI(systemPrompt, [{ role: 'user', content: action.prompt(account, recent) }], 900)
      setAiOutput(result)
    } catch (e) {
      showToast(e.message, 'error')
    }
    setAiLoading(false)
  }

  const sorted = [...(account.activities || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  return (
    <div className="main-content">

      {/* ── AI Activity Assistant ── */}
      <div className="ai-panel" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>AI Activity Assistant</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
          Generate content using this deal's context and recent activity history.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {AI_ACTIONS.map((action, i) => (
            <button
              key={i}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 12 }}
              onClick={() => runAI(action)}
              disabled={aiLoading}
            >
              {action.label}
            </button>
          ))}
        </div>

        {aiLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, color: '#6b7280', fontSize: 13 }}>
            <Spinner /> <span>Generating {aiLabel}...</span>
          </div>
        )}

        {aiOutput && !aiLoading && (
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{aiLabel}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: 10 }}
                  onClick={() => navigator.clipboard.writeText(aiOutput).then(() => showToast('Copied', 'success'))}
                >
                  Copy
                </button>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }} onClick={() => setAiOutput('')}>Clear</button>
              </div>
            </div>
            <div className="ai-output" style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{aiOutput}</div>
          </div>
        )}
      </div>

      {/* ── Activity log ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 500 }}>Activity log ({sorted.length})</div>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(true)}>+ Log activity</button>
      </div>

      {sorted.map((a, i) => (
        <div key={a.id} style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: '#f3f3f3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
              {TYPE_ICONS[a.type] || '📝'}
            </div>
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
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9ca3af', fontSize: 13 }}>
          No activities logged yet — log your first touchpoint above
        </div>
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
