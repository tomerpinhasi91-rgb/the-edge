import { useState } from 'react'
import { callAI } from '../../lib/ai'
import { uid } from '../../lib/supabase'
import { loadProfile, buildRepContext } from '../../lib/helpers'
import Spinner from '../ui/Spinner'

// ── Sign-off string ───────────────────────────────────────────────
function buildSignOff(profile) {
  if (!profile) return ''
  const name = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
  return [
    'REP PROFILE:',
    name ? 'Name: ' + name : '',
    profile.jobTitle ? 'Title: ' + profile.jobTitle : '',
    profile.territory ? 'Territory: ' + profile.territory : '',
    profile.company ? 'Company: ' + profile.company : '',
    profile.mobile ? 'Mobile: ' + profile.mobile : '',
  ].filter(Boolean).join('\n')
}

// ── Reminder type colours ─────────────────────────────────────────
const REMINDER_COLORS = {
  follow_up: { bg: '#E1F5EE', color: '#0F6E56' },
  call:      { bg: '#E6F1FB', color: '#185FA5' },
  email:     { bg: '#FAEEDA', color: '#BA7517' },
  custom:    { bg: '#F3F4F6', color: '#6b7280' },
}

// ── Classification badge colours ──────────────────────────────────
const CLASS_COLORS = {
  HOT:      { bg: '#E1F5EE', color: '#0F6E56', label: '🔥 HOT' },
  NURTURE:  { bg: '#E6F1FB', color: '#185FA5', label: '🌱 NURTURE' },
  CLOSED:   { bg: '#FCEBEB', color: '#A32D2D', label: '🚫 CLOSED' },
  ENGAGED:  { bg: '#FAEEDA', color: '#BA7517', label: '💬 ENGAGED' },
  REFERRAL: { bg: '#F3EEFF', color: '#7C3AED', label: '🤝 REFERRAL' },
}

// ── Email output panel ────────────────────────────────────────────
function EmailOutput({ subject, body, onClear }) {
  const [subCopied, setSubCopied] = useState(false)
  const [bodyCopied, setBodyCopied] = useState(false)

  const copy = (text, setSt) => {
    navigator.clipboard.writeText(text)
    setSt(true)
    setTimeout(() => setSt(false), 1600)
  }

  return (
    <div className="card" style={{ borderLeft: '3px solid #185FA5' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#185FA5' }}>✉️ Generated email</div>
        <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }} onClick={onClear}>Clear</button>
      </div>

      {subject && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</div>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }} onClick={() => copy(subject, setSubCopied)}>
              {subCopied ? '✓ Copied' : 'Copy subject'}
            </button>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1f2937', background: '#f9fafb', padding: '8px 10px', borderRadius: 6, border: '0.5px solid #e5e5e5' }}>
            {subject}
          </div>
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Body</div>
          <button className="btn btn-primary btn-sm" style={{ fontSize: 10 }} onClick={() => copy(body, setBodyCopied)}>
            {bodyCopied ? '✓ Copied!' : '📋 Copy email'}
          </button>
        </div>
        <div className="ai-output" style={{ fontSize: 13, lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{body}</div>
      </div>
    </div>
  )
}

// ── Reminder card ─────────────────────────────────────────────────
export function ReminderCard({ account, save, showToast }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: '', note: '', type: 'follow_up' })
  const today = new Date().toISOString().split('T')[0]
  const reminders = (account.reminders || []).filter(r => !r.completed)

  const addReminder = async () => {
    if (!form.date || !form.note.trim()) return showToast('Date and note required', 'error')
    const r = { id: uid(), date: form.date, note: form.note.trim(), type: form.type, completed: false, createdAt: today }
    await save({ reminders: [...(account.reminders || []), r] })
    setForm({ date: '', note: '', type: 'follow_up' })
    setShowForm(false)
    showToast('Reminder set', 'success')
  }

  const markDone = async (id) => {
    await save({ reminders: (account.reminders || []).map(r => r.id === id ? { ...r, completed: true } : r) })
    showToast('Reminder done ✓', 'success')
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: (reminders.length > 0 || showForm) ? 12 : 0 }}>
        <div className="card-title" style={{ margin: 0 }}>🔔 Reminders{reminders.length > 0 ? ' (' + reminders.length + ')' : ''}</div>
        <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {reminders.map(r => {
        const overdue = r.date < today
        const isToday = r.date === today
        const tc = REMINDER_COLORS[r.type] || REMINDER_COLORS.custom
        return (
          <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: '0.5px solid #f3f3f3' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 3, alignItems: 'center' }}>
                <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, fontWeight: 600, background: overdue ? '#FCEBEB' : isToday ? '#FAEEDA' : '#f3f3f3', color: overdue ? '#A32D2D' : isToday ? '#BA7517' : '#6b7280' }}>
                  {overdue ? '⚠ Overdue · ' : isToday ? '📅 Today · ' : ''}{r.date}
                </span>
                <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 20, background: tc.bg, color: tc.color, fontWeight: 500 }}>
                  {r.type.replace('_', ' ')}
                </span>
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{r.note}</div>
            </div>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: 10, flexShrink: 0 }} onClick={() => markDone(r.id)}>✓ Done</button>
          </div>
        )
      })}

      {reminders.length === 0 && !showForm && (
        <div style={{ fontSize: 12, color: '#9ca3af', paddingTop: 4 }}>No upcoming reminders — stay on top of follow-ups</div>
      )}

      {showForm && (
        <div style={{ marginTop: 12, padding: 12, background: '#fafafa', borderRadius: 8, border: '0.5px solid #e5e5e5' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: 4 }}>Date</label>
              <input type="date" className="form-input" style={{ fontSize: 13 }} value={form.date} min={today} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: 4 }}>Type</label>
              <select className="form-input" style={{ fontSize: 13 }} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                <option value="follow_up">Follow up</option>
                <option value="call">Call</option>
                <option value="email">Email</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <label style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, display: 'block', marginBottom: 4 }}>Note</label>
            <textarea className="form-input" rows={2} style={{ fontSize: 13 }} placeholder="What do you need to do?" value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
          </div>
          <button className="btn btn-primary btn-sm" onClick={addReminder}>Set reminder</button>
        </div>
      )}
    </div>
  )
}

// ── Reply handler ─────────────────────────────────────────────────
function ReplyHandler({ account, save, user, showToast, mode }) {
  const [replyText, setReplyText] = useState('')
  const [classifying, setClassifying] = useState(false)
  const [classification, setClassification] = useState(null)
  const [draftReply, setDraftReply] = useState('')
  const [draftingReply, setDraftingReply] = useState(false)
  const [savingAct, setSavingAct] = useState(false)
  const [actSaved, setActSaved] = useState(false)
  const [reminderDate, setReminderDate] = useState('')
  const [reminderSaved, setReminderSaved] = useState(false)
  const [replyCopied, setReplyCopied] = useState(false)
  const today = new Date().toISOString().split('T')[0]

  const classify = async () => {
    if (!replyText.trim()) return showToast('Paste a reply first', 'error')
    setClassifying(true); setClassification(null); setDraftReply(''); setActSaved(false); setReminderSaved(false)
    try {
      const result = await callAI(
        'Analyse this email reply from a prospect and classify it. Return JSON only (no markdown):\n{"classification":"HOT|NURTURE|CLOSED|ENGAGED|REFERRAL","summary":"one sentence summary","sentiment":"positive|neutral|negative","key_point":"most important thing they said","suggested_reminder_months":1,"new_contact":null}',
        [{ role: 'user', content: replyText }], 300
      )
      const parsed = JSON.parse((result.match(/\{[\s\S]*\}/) || ['{}'])[0])
      if (parsed.classification) {
        setClassification(parsed)
        if (parsed.suggested_reminder_months) {
          const d = new Date()
          d.setMonth(d.getMonth() + Number(parsed.suggested_reminder_months))
          setReminderDate(d.toISOString().split('T')[0])
        }
      } else showToast('Could not classify — try again', 'error')
    } catch (e) { showToast('Classification failed', 'error') }
    setClassifying(false)
  }

  const logActivity = async () => {
    setSavingAct(true)
    const contact = account.contact || account.name
    await save({
      activities: [...(account.activities || []), {
        id: uid(), type: 'email', date: today,
        title: 'Reply received — ' + contact,
        notes: classification.summary + (classification.key_point ? '\n\nKey point: ' + classification.key_point : ''),
        next: '',
      }]
    })
    setActSaved(true); setSavingAct(false)
    showToast('Activity logged', 'success')
  }

  const draftReplyFn = async () => {
    setDraftingReply(true)
    try {
      const profile = loadProfile(user?.id)
      const signOff = buildSignOff(profile)
      const { repCtx } = buildRepContext(profile)
      const ctx = mode === 'lead'
        ? `Lead: ${account.name} | Industry: ${account.industry || ''}`
        : `Deal: ${account.name} | Stage: ${account.stage || ''} | Opportunity: ${account.opportunity || ''}`
      const focusMap = { HOT: 'moving forward quickly', NURTURE: 'nurturing the relationship', CLOSED: 'keeping the door open', ENGAGED: 'maintaining momentum', REFERRAL: 'following up on the referral mentioned' }
      const system = `You are writing a reply email for a sales rep. Classification: ${classification.classification} — focus on ${focusMap[classification.classification] || 'progressing the relationship'}.
Key point from their reply: ${classification.key_point}
${ctx}${repCtx ? '\nRep context: ' + repCtx : ''}
${signOff}
Rules: Under 100 words. Warm professional tone. Specific to what they said.
Output format:\nSUBJECT: [subject line]\n---\n[email body]`
      const result = await callAI(system, [{ role: 'user', content: 'Write a reply to:\n\n' + replyText }], 400)
      setDraftReply(result)
    } catch (e) { showToast('Draft failed', 'error') }
    setDraftingReply(false)
  }

  const saveReminder = async () => {
    if (!reminderDate) return showToast('Pick a date', 'error')
    const typeMap = { HOT: 'call', NURTURE: 'follow_up', CLOSED: 'follow_up', ENGAGED: 'call', REFERRAL: 'follow_up' }
    await save({
      reminders: [...(account.reminders || []), {
        id: uid(), date: reminderDate,
        note: classification?.summary || 'Follow up on email reply',
        type: typeMap[classification?.classification] || 'follow_up',
        completed: false, createdAt: today,
      }]
    })
    setReminderSaved(true)
    showToast('Reminder set', 'success')
  }

  const extractSubjectBody = (text) => {
    const sub = (text.match(/SUBJECT:\s*(.+?)(?:\n|$)/) || [])[1]?.trim() || ''
    const body = (text.match(/---\s*\n([\s\S]+)/) || [])[1]?.trim() || text
    return { sub, body }
  }

  const dateBtn = (label, months, days) => {
    const d = new Date()
    if (days) d.setDate(d.getDate() + days)
    else d.setMonth(d.getMonth() + months)
    const val = d.toISOString().split('T')[0]
    const active = reminderDate === val
    return (
      <button key={label} className="btn btn-secondary btn-sm" style={{ fontSize: 10, background: active ? '#0F6E56' : '', color: active ? 'white' : '', borderColor: active ? '#0F6E56' : '' }} onClick={() => setReminderDate(val)}>{label}</button>
    )
  }

  return (
    <div className="card" style={{ marginTop: 0 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>📥 Handle a reply</div>
      <textarea className="form-input" rows={4} placeholder="Paste their reply here..." value={replyText} onChange={e => setReplyText(e.target.value)} style={{ fontSize: 13, marginBottom: 8 }} />
      <button className="btn btn-primary btn-sm" onClick={classify} disabled={classifying || !replyText.trim()}>
        {classifying ? <><Spinner /> Analysing…</> : 'Analyse reply'}
      </button>

      {classification && (() => {
        const c = CLASS_COLORS[classification.classification] || { bg: '#f3f3f3', color: '#6b7280', label: classification.classification }
        return (
          <div style={{ marginTop: 16 }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: c.bg, color: c.color }}>{c.label}</span>
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#f3f3f3', color: '#6b7280' }}>{classification.sentiment}</span>
              </div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{classification.summary}</div>
              {classification.key_point && <div style={{ fontSize: 12, color: '#185FA5', marginTop: 4, fontStyle: 'italic' }}>Key point: {classification.key_point}</div>}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Card 1 — Log activity */}
              <div style={{ background: '#fafafa', border: '0.5px solid #e5e5e5', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>📝 Log activity</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8, lineHeight: 1.5 }}>
                  Type: email · Title: Reply received — {account.contact || account.name}<br />
                  {classification.summary}
                </div>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={logActivity} disabled={savingAct || actSaved}>
                  {actSaved ? '✓ Logged' : savingAct ? <Spinner /> : '💾 Log now'}
                </button>
              </div>

              {/* Card 2 — Draft reply */}
              <div style={{ background: '#fafafa', border: '0.5px solid #e5e5e5', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>✉️ Draft reply</div>
                <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={draftReplyFn} disabled={draftingReply}>
                  {draftingReply ? <><Spinner /> Drafting…</> : 'Draft reply →'}
                </button>
                {draftReply && (() => {
                  const { sub, body } = extractSubjectBody(draftReply)
                  return (
                    <div style={{ marginTop: 10 }}>
                      {sub && <div style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', marginBottom: 5 }}>Subject: {sub}</div>}
                      <div className="ai-output" style={{ fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{body}</div>
                      <button className="btn btn-primary btn-sm" style={{ fontSize: 10, marginTop: 6 }}
                        onClick={() => { navigator.clipboard.writeText(sub ? 'Subject: ' + sub + '\n\n' + body : body); setReplyCopied(true); setTimeout(() => setReplyCopied(false), 1500) }}>
                        {replyCopied ? '✓ Copied' : '📋 Copy'}
                      </button>
                    </div>
                  )
                })()}
              </div>

              {/* Card 3 — Set reminder */}
              <div style={{ background: '#fafafa', border: '0.5px solid #e5e5e5', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5 }}>🔔 Set reminder</div>
                {classification.suggested_reminder_months && (
                  <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 6 }}>AI suggestion: {classification.suggested_reminder_months} month{classification.suggested_reminder_months > 1 ? 's' : ''} from now</div>
                )}
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
                  {dateBtn('1 week', 0, 7)}
                  {dateBtn('1 month', 1)}
                  {dateBtn('3 months', 3)}
                  {dateBtn('6 months', 6)}
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <input type="date" className="form-input" style={{ fontSize: 12, flex: 1 }} value={reminderDate} onChange={e => setReminderDate(e.target.value)} />
                  <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={saveReminder} disabled={reminderSaved || !reminderDate}>
                    {reminderSaved ? '✓ Set' : 'Set reminder'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── Main EmailsTab export ─────────────────────────────────────────
export default function EmailsTab({ account, save, user, showToast, mode }) {
  const [subType, setSubType] = useState('post_meeting')
  const [lastContact, setLastContact] = useState(() => {
    const acts = [...(account.activities || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    if (acts.length > 0) return acts[0].date + ' — ' + (acts[0].title || acts[0].type || 'contact')
    return ''
  })
  const [signal, setSignal] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState(null)
  const signals = account.signals || []

  const getRecentActivity = () => {
    const acts = [...(account.activities || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    return acts.slice(0, 3).map(a => a.date + ': ' + (a.title || a.type) + (a.notes ? ' — ' + a.notes.slice(0, 80) : '')).join('\n') || 'No activities logged'
  }

  const extractSubjectBody = (text) => {
    const sub = (text.match(/SUBJECT:\s*(.+?)(?:\n|$)/) || [])[1]?.trim() || ''
    const body = (text.match(/---\s*\n([\s\S]+)/) || [])[1]?.trim() || text
    return { subject: sub, body }
  }

  const draft = async () => {
    setLoading(true); setEmail(null)
    try {
      const profile = loadProfile(user?.id)
      const signOff = buildSignOff(profile)
      const { repName, repCtx } = buildRepContext(profile)
      let system = '', userMsg = ''

      if (mode === 'lead') {
        system = `You are writing a follow-up email for ${repName || 'the rep'} at Select Equip to a lead they have already contacted. This is NOT a cold email — there is prior context.

FORMULA:
1. Reference the prior contact specifically (date, what happened)
2. One new thing — a signal, market development, or their recent news
3. Single low-commitment ask — shorter than the original cold email

RULES:
- Under 100 words
- Warmer tone than cold — picking up a conversation, not starting one
- Never "just checking in" — always anchor to something specific
- Pull all context from the lead data provided

${signOff}

Output format:
SUBJECT: [subject line]
---
[email body]`
        const selectedSignal = signal ? signals.find(s => s.id === signal) : null
        userMsg = `LEAD: ${account.name}
Industry: ${account.industry || ''}
Location: ${account.location || ''}
Primary contact: ${account.contact || ''}
Last contact: ${lastContact || 'No prior contact on record'}
${selectedSignal ? 'Lead with this signal: ' + selectedSignal.title + ' — ' + selectedSignal.body : ''}
Recent activity:
${getRecentActivity()}
${repCtx ? '\nRep context: ' + repCtx : ''}`

      } else {
        const subLabels = { post_meeting: 'Post-meeting follow-up', proposal: 'Proposal covering email', decision_chase: 'Decision chase', objection: 'Objection response' }
        const subLabel = subLabels[subType] || subType
        system = `You are writing a ${subLabel} email for ${repName || 'the rep'} at Select Equip for an active deal account.

Sub-type instructions:
- Post-meeting follow-up: reference the meeting, one key takeaway, agreed next step with date
- Proposal covering email: professional intro to proposal, 2-3 key points addressed, clear next step
- Decision chase: respectful, not pushy, reference timeline discussed, make it easy to reply
- Objection response: acknowledge their concern directly, respond with evidence or alternative

RULES:
- 80-150 words
- Collaborative professional tone — you're working together, not selling at them
- Always include a specific next step with a date
- Full name + title sign-off — more formal, on record

${signOff}

Output format:
SUBJECT: [subject line]
---
[email body]`
        userMsg = `DEAL: ${account.name}
Stage: ${account.stage || ''}
Opportunity: ${account.opportunity || ''}
Primary contact: ${account.contact || ''}
Deal value: ${account.dealValue ? '$' + account.dealValue : 'TBD'}
Timeline: ${account.timeline || 'not set'}
Next meeting: ${account.nextMeeting || 'not set'}
Win strategy: ${account.strategy || ''}
Competitors: ${account.competitors || ''}
Recent activity:
${getRecentActivity()}
${repCtx ? '\nRep context: ' + repCtx : ''}`
      }

      const result = await callAI(system, [{ role: 'user', content: userMsg }], 500)
      setEmail(extractSubjectBody(result))
    } catch (e) { showToast(e.message || 'Draft failed', 'error') }
    setLoading(false)
  }

  return (
    <div className="main-content">
      {/* ── Email generator ── */}
      <div className="ai-panel">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
          {mode === 'lead' ? '✉️ Draft follow-up email' : '✉️ Draft deal email'}
        </div>

        {mode === 'deal' && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 6 }}>Email type</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[
                { v: 'post_meeting', l: '☎ Post-meeting' },
                { v: 'proposal', l: '📄 Proposal' },
                { v: 'decision_chase', l: '⏰ Decision chase' },
                { v: 'objection', l: '🛡 Objection' },
              ].map(({ v, l }) => (
                <button key={v} className="btn btn-sm" style={{ fontSize: 11, background: subType === v ? '#185FA5' : 'white', color: subType === v ? 'white' : '#374151', border: '0.5px solid ' + (subType === v ? '#185FA5' : '#d4d4d4') }} onClick={() => setSubType(v)}>{l}</button>
              ))}
            </div>
          </div>
        )}

        {mode === 'lead' && (
          <>
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>Last contact</div>
              <input className="form-input" style={{ fontSize: 13 }} value={lastContact} onChange={e => setLastContact(e.target.value)} placeholder="e.g. 20 Apr 2026 — intro call" />
            </div>
            {signals.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#6b7280', fontWeight: 500, marginBottom: 4 }}>Lead with a signal (optional)</div>
                <select className="form-input" style={{ fontSize: 13 }} value={signal} onChange={e => setSignal(e.target.value)}>
                  <option value="">— No specific signal —</option>
                  {signals.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                </select>
              </div>
            )}
          </>
        )}

        <button className="btn btn-primary" onClick={draft} disabled={loading}>
          {loading ? <><Spinner /> Drafting…</> : '✉️ Draft email'}
        </button>
      </div>

      {email && <EmailOutput subject={email.subject} body={email.body} onClear={() => setEmail(null)} />}

      {/* ── Reminders ── */}
      <ReminderCard account={account} save={save} showToast={showToast} />

      {/* ── Reply handler ── */}
      <ReplyHandler account={account} save={save} user={user} showToast={showToast} mode={mode} />
    </div>
  )
}
