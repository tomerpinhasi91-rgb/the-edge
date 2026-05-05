import { useState, useRef } from 'react'
import { useApp } from '../../lib/context'
import { uid } from '../../lib/supabase'
import { callAI, callAIStream, extractJSON } from '../../lib/ai'
import { isDemoUser, getDemoKey, DEMO_COACH, delay } from '../../lib/demo'
import { loadProfile, buildRepContext } from '../../lib/helpers'
import { ev } from '../../lib/analytics'
import Modal from '../ui/Modal'
import Spinner from '../ui/Spinner'
import RFQReader from '../shared/RFQReader'

const TYPES = ['call', 'meeting', 'email', 'note', 'demo', 'proposal']
const TYPE_ICONS = { call: '📞', meeting: '🤝', email: '✉️', note: '📝', demo: '💻', proposal: '📄' }

const DEAL_AI_ACTIONS = [
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

const LEAD_AI_ACTIONS = [
  {
    label: '✉️ First outreach email',
    prompt: (account, recent) =>
      'Write a compelling cold outreach email to the key contact at this prospect. Reference any signals or talking points if available. Make it concise, specific, and end with a clear ask. Output subject line then body only.\n\nLEAD: ' + account.name +
      ' | Industry: ' + (account.industry || '') +
      ' | Location: ' + (account.location || '') +
      ' | Opportunity: ' + (account.opportunity || '') +
      ' | Why this lead: ' + (account.why || '') +
      '\nRECENT TOUCHPOINTS:\n' + recent
  },
  {
    label: '📞 Discovery call script',
    prompt: (account, recent) =>
      'Write a first-call discovery script for this prospect. Include: warm opener, 4 key discovery questions to uncover pain, value bridge statement, objection handles for "not interested" and "send me info", and a clear next step close.\n\nLEAD: ' + account.name +
      ' | Industry: ' + (account.industry || '') +
      ' | Opportunity: ' + (account.opportunity || '') +
      '\nRECENT TOUCHPOINTS:\n' + recent
  },
  {
    label: '🎯 Next best actions',
    prompt: (account, recent) =>
      'You are a B2B sales coach. Given this prospect and the touchpoints so far, recommend the 3-5 highest-impact next actions to move this lead forward. Be specific and actionable.\n\nLEAD: ' + account.name +
      ' | Industry: ' + (account.industry || '') +
      ' | Timeline: ' + (account.timeline || 'unknown') +
      ' | Next meeting: ' + (account.nextMeeting || 'not set') +
      '\nRECENT TOUCHPOINTS:\n' + recent
  },
  {
    label: '📅 Meeting agenda',
    prompt: (account, recent) =>
      'Build a tight first-meeting agenda for this prospect. Include a strong opener, 3-4 discovery questions, a value positioning moment, and a concrete next step / close. Keep it to 45 minutes.\n\nLEAD: ' + account.name +
      ' | Industry: ' + (account.industry || '') +
      ' | Opportunity: ' + (account.opportunity || '') +
      '\nRECENT TOUCHPOINTS:\n' + recent
  },
]

export default function ActivitiesTab({ account, isLead = false, onConvert }) {
  const { saveAccount, showToast, user } = useApp()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'call', title: '', date: new Date().toISOString().split('T')[0], notes: '', next: '' })
  const [aiLoading, setAiLoading] = useState(false)
  const [aiOutput, setAiOutput] = useState('')
  const [aiLabel, setAiLabel] = useState('')
  const [showFollowUpPrompt, setShowFollowUpPrompt] = useState(false) // #10

  // ── Capture panel state (voice / email / rfq — one at a time) ────
  const [activeCapture, setActiveCapture] = useState(null) // null | 'voice' | 'email' | 'rfq'
  const [voiceRecording, setVoiceRecording] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const [voiceProcessing, setVoiceProcessing] = useState(false)
  const [voiceResult, setVoiceResult] = useState(null)
  const recognitionRef = useRef(null)
  const [emailText, setEmailText] = useState('')
  const [emailAnalysis, setEmailAnalysis] = useState(null)
  const [emailLoading, setEmailLoading] = useState(false)

  const AI_ACTIONS = isLead ? LEAD_AI_ACTIONS : DEAL_AI_ACTIONS
  const save = (updates) => saveAccount({ ...account, ...updates })
  const setF = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const addActivity = async () => {
    if (!form.title.trim()) return showToast('Title required', 'error')
    const activities = [...(account.activities || []), { id: uid(), ...form }]
    await save({ activities })
    ev.activityLogged(form.type, account.name)
    setShowForm(false)
    // #10 After logging a call or meeting, prompt to draft a follow-up
    if (form.type === 'call' || form.type === 'meeting') setShowFollowUpPrompt(true)
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
      const { repName, repCtx } = buildRepContext(loadProfile(user?.id))
      // #10 Compressed system prompt
      let systemPrompt = 'Elite B2B sales coach. Specific, direct, immediately actionable. Clean formatted text, no preamble.'
      if (repCtx) systemPrompt += '\nREP: ' + repCtx
      if (repName) systemPrompt += '\nSign emails as ' + repName + '.'
      // #11 Stream so user sees output appear immediately
      await callAIStream(systemPrompt, [{ role: 'user', content: action.prompt(account, recent) }], 900,
        (_chunk, full) => setAiOutput(full)
      )
      ev.activityAI(action.label, account._type || 'lead')
    } catch (e) {
      showToast(e.message, 'error')
    }
    setAiLoading(false)
  }

  // ── Voice Logger logic ────────────────────────────────────────────
  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      showToast('Use Chrome or Safari for voice recording', 'error')
      return
    }
    setVoiceTranscript('')
    setVoiceResult(null)
    const rec = new SpeechRecognition()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-AU'
    rec.onresult = (e) => {
      let full = ''
      for (let i = 0; i < e.results.length; i++) {
        full += e.results[i][0].transcript + ' '
      }
      setVoiceTranscript(full.trim())
    }
    rec.onerror = (e) => {
      showToast('Voice error: ' + e.error, 'error')
      setVoiceRecording(false)
    }
    recognitionRef.current = rec
    rec.start()
    setVoiceRecording(true)
  }

  const stopAndProcess = async () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setVoiceRecording(false)
    if (!voiceTranscript.trim()) return

    setVoiceProcessing(true)

    if (isDemoUser(user)) {
      await delay(2000)
      const demo = {
        type: 'call',
        title: 'Discovery call — Packaging Manager re: tray seal upgrade',
        notes: 'Spoke with Lee at packaging plant. They are evaluating 3 vendors. Budget $800K approved. Throughput requirement 60 trays/min. MAP not required at launch but likely in 6 months.',
        next: 'Send technical spec sheet and reference site list by Friday',
        signals: [
          { priority: 'urgent', title: 'Budget approved — $800K capex confirmed', body: 'Lee confirmed board-approved budget of $800K for the tray seal upgrade. Evaluation timeline is 6 weeks.', action: 'Get on the shortlist — send capability overview today.' }
        ]
      }
      setVoiceResult(demo)
      setForm({ type: demo.type, title: demo.title, date: new Date().toISOString().split('T')[0], notes: demo.notes, next: demo.next })
      setVoiceProcessing(false)
      return
    }

    const system = 'Extract a structured activity log from these spoken call notes. Return ONLY valid JSON: {"type":"call"|"meeting"|"email"|"note","title":string,"notes":string,"next":string,"signals":[{"priority":"urgent"|"watch"|"intel","title":string,"body":string,"action":string}]}'
    try {
      const raw = await callAI(system, [{ role: 'user', content: voiceTranscript }], 500, false, 'claude-haiku-4-5')
      const parsed = extractJSON(raw)
      if (parsed) {
        setVoiceResult(parsed)
        setForm({
          type: parsed.type || 'call',
          title: parsed.title || '',
          date: new Date().toISOString().split('T')[0],
          notes: parsed.notes || '',
          next: parsed.next || '',
        })
      } else {
        showToast('Could not structure transcript', 'error')
      }
    } catch (e) {
      showToast(e.message, 'error')
    }
    setVoiceProcessing(false)
  }

  // ── Email Analyser logic ──────────────────────────────────────────
  const analyseEmail = async () => {
    if (!emailText.trim()) return
    setEmailLoading(true)
    setEmailAnalysis(null)

    if (isDemoUser(user)) {
      await delay(1800)
      setEmailAnalysis({
        sentiment: 'positive',
        summary: 'Procurement manager Sarah Chen at Apex Protein confirmed they are moving forward with the tray seal evaluation. They have shortlisted 3 vendors and are requesting a formal proposal by end of month. Budget is confirmed at $950K.',
        key_phrases: [
          '"We have confirmed budget of $950K for this project."',
          '"The shortlist is down to three vendors — you are on it."',
          '"We need proposals by end of month — no extensions."',
          '"FAT at the supplier facility would be preferred."',
        ],
        key_decisions: [
          'Shortlist reduced to 3 vendors including us',
          'Proposal deadline: end of month',
        ],
        open_questions: [
          'What is the exact commissioning date required?',
          'Will FAT be conducted at their site or supplier facility?',
        ],
        signals: [
          { priority: 'urgent', title: 'Proposal deadline — end of month', body: 'Sarah confirmed the proposal is due by end of month. Late submissions will not be evaluated.', action: 'Submit proposal by 28th — start today.' }
        ],
        suggested_reply: 'Hi Sarah,\n\nThank you for confirming the shortlist — we are pleased to be included in the evaluation. We will have a comprehensive proposal to you by [date], covering technical compliance, commissioning timeline and a 5-year TCO model.\n\nCould you confirm the preferred commissioning date so we can include a project schedule? We would also like to propose a Factory Acceptance Test at our Melbourne facility prior to order — happy to discuss timing.\n\nLooking forward to the next steps.\n\nBest regards,\n[Your name]',
        next_step: 'Prepare and submit proposal before end of month — prioritise commissioning timeline and FAT offer as differentiators.',
      })
      setEmailLoading(false)
      return
    }

    const system = 'You are a B2B sales intelligence analyst. Analyse this email thread and return ONLY valid JSON: {"sentiment":"positive"|"neutral"|"negative"|"urgent","summary":string,"key_phrases":[string],"key_decisions":[string],"open_questions":[string],"signals":[{"priority":"urgent"|"watch"|"intel","title":string,"body":string,"action":string}],"suggested_reply":string,"next_step":string}\n\nkey_phrases: extract 2-4 verbatim sentences or short quotes from the email that carry the most sales intelligence value — e.g. budget confirmations, timelines, objections, commitments. Copy exact wording from the email.'
    try {
      const raw = await callAI(system, [{ role: 'user', content: emailText }], 800)
      const parsed = extractJSON(raw)
      if (parsed) setEmailAnalysis(parsed)
      else showToast('Could not parse email analysis', 'error')
    } catch (e) {
      showToast(e.message, 'error')
    }
    setEmailLoading(false)
  }

  const saveSignal = async (signal) => {
    const signals = [...(account.signals || []), { id: uid(), ...signal }]
    await saveAccount({ ...account, signals })
    showToast('Signal saved', 'success')
  }

  const sentimentStyle = (s) => {
    const map = {
      positive: { bg: '#E1F5EE', color: '#0F6E56' },
      neutral: { bg: '#F3F4F6', color: '#6b7280' },
      negative: { bg: '#FEE2E2', color: '#B91C1C' },
      urgent: { bg: '#FEF3C7', color: '#92400E' },
    }
    return map[s] || map.neutral
  }

  const sorted = [...(account.activities || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''))

  const toggleCapture = (panel) => setActiveCapture(v => v === panel ? null : panel)

  return (
    <div className="main-content">

      {/* ── AI Activity Assistant ── */}
      <div className="ai-panel" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>AI Activity Assistant</div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
          Generate content using this {isLead ? "lead's" : "deal's"} context and recent activity history.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {AI_ACTIONS.map((action, i) => (
            <button key={i} className="btn btn-secondary btn-sm" style={{ fontSize: 12 }} onClick={() => runAI(action)} disabled={aiLoading}>
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
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }} onClick={() => navigator.clipboard.writeText(aiOutput).then(() => showToast('Copied', 'success'))}>Copy</button>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }} onClick={() => setAiOutput('')}>Clear</button>
              </div>
            </div>
            <div className="ai-output" style={{ fontSize: 13, whiteSpace: 'pre-wrap', lineHeight: 1.65 }}>{aiOutput}</div>
          </div>
        )}

        {/* ── Capture divider ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0 12px' }}>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
          <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Capture</span>
          <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className={`btn btn-sm ${activeCapture === 'voice' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12 }}
            onClick={() => toggleCapture('voice')}
          >🎙️ Voice log</button>
          <button
            className={`btn btn-sm ${activeCapture === 'email' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12 }}
            onClick={() => toggleCapture('email')}
          >📧 Analyse email</button>
          <button
            className={`btn btn-sm ${activeCapture === 'rfq' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: 12 }}
            onClick={() => toggleCapture('rfq')}
          >📄 RFQ</button>
        </div>

        {/* ── Voice panel ── */}
        {activeCapture === 'voice' && (
          <div style={{ marginTop: 14, borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
            {!voiceRecording && !voiceProcessing && !voiceResult && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <button onClick={startRecording} style={{ width: 64, height: 64, borderRadius: '50%', background: '#0F6E56', border: 'none', color: 'white', fontSize: 26, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(15,110,86,0.3)' }} title="Tap to start recording">🎙️</button>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Tap to start — speak your call debrief out loud</div>
              </div>
            )}
            {voiceRecording && (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <button onClick={stopAndProcess} style={{ width: 64, height: 64, borderRadius: '50%', background: '#EF4444', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', animation: 'pulse 1.5s ease-in-out infinite', boxShadow: '0 4px 16px rgba(239,68,68,0.4)' }}>⏹️</button>
                <div style={{ fontSize: 12, color: '#EF4444', marginTop: 8, fontWeight: 600 }}>Recording… tap to stop</div>
                {voiceTranscript && <div style={{ marginTop: 10, fontSize: 12, color: '#374151', background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', textAlign: 'left', maxHeight: 80, overflowY: 'auto', lineHeight: 1.6 }}>{voiceTranscript}</div>}
              </div>
            )}
            {voiceProcessing && <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', color: '#6b7280', fontSize: 13 }}><Spinner /> Structuring notes…</div>}
            {voiceResult && !voiceProcessing && (
              <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 14px' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#0F6E56', marginBottom: 8 }}>Extracted activity</div>
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}><strong>Type:</strong> {voiceResult.type}</div>
                <div style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}><strong>Title:</strong> {voiceResult.title}</div>
                {voiceResult.notes && <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4, lineHeight: 1.5 }}>{voiceResult.notes}</div>}
                {voiceResult.next && <div style={{ fontSize: 12, color: '#0F6E56', marginBottom: 8 }}>→ {voiceResult.next}</div>}
                <button className="btn btn-primary btn-sm" onClick={() => { setShowForm(true); toggleCapture('voice') }} style={{ fontSize: 12 }}>Open activity form →</button>
              </div>
            )}
          </div>
        )}

        {/* ── Email panel ── */}
        {activeCapture === 'email' && (
          <div style={{ marginTop: 14, borderTop: '1px solid #e5e7eb', paddingTop: 14 }}>
            <textarea
              className="form-input"
              rows={5}
              placeholder="Paste email thread here…"
              value={emailText}
              onChange={e => { setEmailText(e.target.value); setEmailAnalysis(null) }}
              style={{ marginBottom: 10, fontSize: 12, lineHeight: 1.6 }}
            />
            <button className="btn btn-primary btn-sm" onClick={analyseEmail} disabled={!emailText.trim() || emailLoading} style={{ marginBottom: 12 }}>
              {emailLoading ? <><Spinner /> Analysing…</> : 'Analyse'}
            </button>
            {emailAnalysis && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ ...sentimentStyle(emailAnalysis.sentiment), borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{emailAnalysis.sentiment?.toUpperCase()}</span>
                </div>
                {emailAnalysis.summary && <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.65 }}>{emailAnalysis.summary}</div>}
                {emailAnalysis.key_phrases?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Key phrases</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {emailAnalysis.key_phrases.map((phrase, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: '#FAFAFA', border: '1px solid #e5e7eb', borderLeft: '3px solid #0F6E56', borderRadius: 6, padding: '7px 10px' }}>
                          <span style={{ flex: 1, fontSize: 12, color: '#374151', fontStyle: 'italic', lineHeight: 1.55 }}>{phrase}</span>
                          <button onClick={() => navigator.clipboard.writeText(phrase).then(() => showToast('Copied', 'success'))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9ca3af', flexShrink: 0, padding: '0 2px' }} title="Copy phrase">⧉</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {emailAnalysis.key_decisions?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Key decisions</div>
                    {emailAnalysis.key_decisions.map((d, i) => (
                      <div key={i} style={{ fontSize: 13, color: '#374151', display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: '#0F6E56' }}>✓</span> {d}</div>
                    ))}
                  </div>
                )}
                {emailAnalysis.open_questions?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Open questions</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {emailAnalysis.open_questions.map((q, i) => (
                        <span key={i} style={{ background: '#EFF6FF', color: '#1D4ED8', borderRadius: 6, padding: '3px 9px', fontSize: 12 }}>{q}</span>
                      ))}
                    </div>
                  </div>
                )}
                {emailAnalysis.signals?.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Signals</div>
                    {emailAnalysis.signals.map((s, i) => (
                      <div key={i} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 12px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div>
                            <span className={`badge badge-${s.priority}`} style={{ marginRight: 8 }}>{s.priority}</span>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{s.title}</span>
                            {s.body && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{s.body}</div>}
                          </div>
                          <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, flexShrink: 0 }} onClick={() => saveSignal(s)}>Save</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {emailAnalysis.suggested_reply && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Suggested reply</div>
                    <div className="ai-output" style={{ fontSize: 12, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{emailAnalysis.suggested_reply}</div>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, marginTop: 6 }} onClick={() => navigator.clipboard.writeText(emailAnalysis.suggested_reply).then(() => showToast('Copied', 'success'))}>Copy reply</button>
                  </div>
                )}
                {emailAnalysis.next_step && (
                  <div style={{ background: '#f0fdf7', border: '1px solid #9FE1CB', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#0F6E56', fontWeight: 500 }}>
                    Next step: {emailAnalysis.next_step}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── RFQ panel ── */}
        {activeCapture === 'rfq' && (
          <div style={{ marginTop: 14, borderTop: '1px solid #e5e7eb', paddingTop: 4 }}>
            <RFQReader user={user} showToast={showToast} account={account} embedded />
          </div>
        )}
      </div>

      {/* #10 Follow-up prompt — shown after logging a call or meeting */}
      {showFollowUpPrompt && (
        <div style={{ background: '#E6F1FB', border: '0.5px solid #185FA5', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 13, color: '#185FA5', fontWeight: 500 }}>✉️ Draft a follow-up email for this {account._type === 'account' ? 'deal' : 'lead'}?</div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => {
              setShowFollowUpPrompt(false)
              runAI(AI_ACTIONS.find(a => a.label.includes('Follow up') || a.label.includes('outreach')))
            }}>Draft now</button>
            <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setShowFollowUpPrompt(false)}>Dismiss</button>
          </div>
        </div>
      )}

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

      {/* Convert to deal CTA — shown at bottom when this is a lead with activity */}
      {isLead && onConvert && sorted.length > 0 && (
        <div style={{ background: '#FAEEDA', border: '0.5px solid #BA7517', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 8 }}>
          <div>
            <div style={{ fontWeight: 600, color: '#7A4A00', fontSize: 13, marginBottom: 2 }}>Ready to move this forward? 🚀</div>
            <div style={{ fontSize: 12, color: '#BA7517' }}>Convert to a deal account to unlock pipeline stages, risk tracking and full deal management.</div>
          </div>
          <button className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap', flexShrink: 0 }} onClick={onConvert}>
            Convert to deal →
          </button>
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
