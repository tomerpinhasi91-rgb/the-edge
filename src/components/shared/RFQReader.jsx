import { useState, useRef, useEffect } from 'react'
import { useApp } from '../../lib/context'
import { callAI, extractJSON } from '../../lib/ai'
import { isDemoUser, delay } from '../../lib/demo'
import { uid } from '../../lib/supabase'
import Spinner from '../ui/Spinner'

const DEMO_ANALYSIS = {
  title: 'Woolworths Fresh Protein Tray Sealing Line RFQ',
  buyer: 'Woolworths Group — Fresh Food Procurement',
  deadline: '30 June 2026',
  budget: '$1.2M – $1.8M capital equipment budget',
  requirements: [
    { item: 'Tray sealing throughput: minimum 80 trays/min across all fresh protein formats', critical: true, note: 'Must sustain throughput with <2% downtime at rated speed' },
    { item: 'MAP (Modified Atmosphere Packaging) capability for extended shelf life', critical: true, note: 'CO2/N2 gas mix, residual O2 <0.5%' },
    { item: 'Auto film changeover — less than 5 minutes downtime per roll', critical: true, note: 'Required for continuous 3-shift operation' },
    { item: 'Integration with existing Ishida multihead weighers', critical: false, note: 'Preferred but not mandatory — adaptor plate acceptable' },
    { item: 'Seal integrity verification — 100% in-line testing', critical: true, note: 'SQF audit requirement, must log and report failures' },
    { item: 'Tray formats: 175×113mm, 227×178mm, 300×227mm', critical: false, note: 'All 3 formats must run on same line with tooling change' },
    { item: 'GMP-compliant stainless steel construction, IP65 rated', critical: true, note: 'Washdown environment, daily chemical sanitisation' },
    { item: 'Local service and spare parts availability — 4-hour response SLA', critical: false, note: 'Preferred supplier for nationwide rollout consideration' },
  ],
  evaluation_criteria: [
    'Technical compliance with throughput and MAP specification',
    'Total cost of ownership over 5 years (capex + opex)',
    'Commissioning timeline and ability to meet June 2026 go-live',
    'After-sales service capability and response SLA',
    'Reference sites in Australian food manufacturing',
    'Supplier financial stability and local presence',
  ],
  risks: [
    { risk: 'Commissioning timeline — 12-week lead time on MAP tooling may push past deadline', severity: 'high', mitigation: 'Confirm tooling lead time immediately; negotiate parallel manufacture with deposit.' },
    { risk: 'Woolworths may apply their preferred vendor list — new suppliers face longer approval', severity: 'medium', mitigation: 'Engage Woolworths QA team early; provide audit-ready documentation ahead of submission.' },
    { risk: 'Gas mix specification may require on-site testing not currently planned for in scope', severity: 'medium', mitigation: 'Include a MAP validation run in FAT scope; propose on-site commissioning test as part of offer.' },
    { risk: 'Three tray format tooling changes may increase TCO significantly', severity: 'low', mitigation: 'Price tooling separately and highlight fast-changeover as a differentiator.' },
  ],
  win_strategy: 'Position as the only vendor who can hit the June 2026 commissioning deadline with proven MAP tray sealing at Woolworths-scale throughput. Lead with Australian reference sites (Baiada, Hilton Food) and offer a paid FAT at your Melbourne facility before contract signature to reduce Woolworths\' risk. Price the 5-year service agreement separately to lower the upfront capex optics for procurement.',
  key_questions: [
    'Is the June 2026 go-live date fixed by a Woolworths range review, or is there flexibility if commissioning runs to August?',
    'Will existing Woolworths QA team conduct the vendor audit, or is a third-party audit required before equipment approval?',
    'Is MAP capability required at launch or phased in — which SKUs run MAP first?',
    'What is the evaluation committee composition and who has final sign-off?',
  ],
  response_structure: [
    'Executive Summary — one page, deadline compliance + reference sites upfront',
    'Technical Compliance Matrix — table mapping each requirement to your specification',
    'MAP Capability Section — gas mix, residual O2 testing, validation methodology',
    'Commissioning Plan — week-by-week from order to go-live, FAT scope included',
    'Total Cost of Ownership — 5-year model, capex + service + consumables',
    'Reference Sites — 2-3 Australian food manufacturers with contact details',
    'After-Sales Service Proposal — response SLA, parts inventory, training',
    'Commercial Terms and Pricing Schedule',
  ],
  red_flags: [
    'No site visit mentioned in RFQ — ask if one is available before submission',
    'Evaluation criteria weighting not disclosed — request clarification to avoid over-investing in price alone',
    'IP65 rating required but no cleaning validation protocol specified — confirm your rating covers their chemical regime',
  ],
}

const DEMO_EMAIL = 'Subject: Response to Woolworths Fresh Protein Tray Sealing Line RFQ\n\nDear Woolworths Fresh Food Procurement Team,\n\nThank you for the opportunity to respond to your Tray Sealing Line RFQ. We are well-positioned to meet your requirements, including the 80 trays/min throughput target and full MAP capability with residual O2 <0.5%.\n\nOur primary focus in this submission will be commissioning certainty. We have completed similar installations at Baiada and Hilton Food on comparable timelines and can commit to your June 2026 go-live. To address the MAP tooling lead time risk, we propose initiating tooling manufacture on receipt of a Letter of Intent — this eliminates schedule risk without requiring full contract execution.\n\nWe would welcome the opportunity to discuss the evaluation process and, if possible, arrange a Factory Acceptance Test at our Melbourne facility prior to contract signature — at no cost to Woolworths — to validate throughput and MAP performance against your specification.\n\nCould we schedule a 30-minute call this week to clarify two or three points before we commit to the full proposal?\n\nKind regards,\n[Your name]\n[Title] | [Company]'

const SYSTEM_PROMPT = 'You are a senior B2B capital equipment sales strategist. Analyse this RFQ/tender document and return ONLY valid JSON.\n\nSchema:\n{\n  "title": "document title or best guess",\n  "buyer": "company name",\n  "deadline": "submission deadline if found",\n  "budget": "budget range if mentioned",\n  "requirements": [{ "item": string, "critical": boolean, "note": string }],\n  "evaluation_criteria": [string],\n  "risks": [{ "risk": string, "severity": "high"|"medium"|"low", "mitigation": string }],\n  "win_strategy": "3-4 sentence strategic summary of how to win this",\n  "key_questions": ["3-4 clarifying questions to ask the buyer"],\n  "response_structure": ["recommended sections for the response document in order"],\n  "red_flags": [string]\n}'

function SeverityBadge({ severity }) {
  const map = {
    high: { bg: '#FEE2E2', color: '#B91C1C', label: 'High' },
    medium: { bg: '#FEF3C7', color: '#92400E', label: 'Medium' },
    low: { bg: '#F3F4F6', color: '#6b7280', label: 'Low' },
  }
  const s = map[severity] || map.low
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>
      {s.label}
    </span>
  )
}

function CollapsibleSection({ title, badge, open, onToggle, children }) {
  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{ width: '100%', background: open ? '#f9fafb' : 'white', border: 'none', padding: '11px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151' }}
      >
        <span>
          {title}
          {badge !== undefined && (
            <span style={{ background: '#e5e7eb', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 600, marginLeft: 7, color: '#374151' }}>{badge}</span>
          )}
        </span>
        <span style={{ color: '#9ca3af', fontSize: 11 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div style={{ padding: '14px', borderTop: '1px solid #f3f4f6' }}>{children}</div>}
    </div>
  )
}

export default function RFQReader({ user, showToast, account, embedded = false, onSaveActivity }) {
  const { dealAccounts, saveAccount } = useApp()

  // ── Upload / paste state ────────────────────────────────────────
  const [mode, setMode] = useState('upload')
  const [pasteText, setPasteText] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileContent, setFileContent] = useState(null)
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef(null)

  // ── Draft email state ───────────────────────────────────────────
  const [draftEmail, setDraftEmail] = useState('')
  const [draftEmailLoading, setDraftEmailLoading] = useState(false)
  const [emailCopied, setEmailCopied] = useState(false)

  // ── Save to deal state ──────────────────────────────────────────
  const [openSaveSection, setOpenSaveSection] = useState(null)
  const [selectedSignalIdxs, setSelectedSignalIdxs] = useState(new Set())
  const [savingSignals, setSavingSignals] = useState(false)
  const [activitySaved, setActivitySaved] = useState(false)
  const [savingActivity, setSavingActivity] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)

  // ── Checklist + call prep state ─────────────────────────────────
  const [checklistSaving, setChecklistSaving] = useState(false)
  const [checklistSaved, setChecklistSaved] = useState(false)
  const [callPrepCopied, setCallPrepCopied] = useState(false)

  // ── Deal account selector (when no account prop) ─────────────────
  const [selectedDealId, setSelectedDealId] = useState('')

  // Resolve which account to save to
  const targetAccount = account || dealAccounts.find(a => a.id === selectedDealId) || null

  // Pre-select all signals when analysis loads
  useEffect(() => {
    if (!analysis) return
    const count =
      (analysis.risks?.filter(r => r.severity === 'high').length || 0) +
      (analysis.risks?.filter(r => r.severity === 'medium').length || 0) +
      (analysis.red_flags?.length || 0)
    setSelectedSignalIdxs(new Set(Array.from({ length: count }, (_, i) => i)))
    setActivitySaved(false)
    setNotesSaved(false)
    setChecklistSaved(false)
    setDraftEmail('')
  }, [analysis])

  // Build signal candidates from risks + red flags
  const signalCandidates = analysis ? [
    ...(analysis.risks?.filter(r => r.severity === 'high').map(r => ({
      priority: 'urgent',
      title: r.risk,
      body: 'Mitigation: ' + r.mitigation,
      action: 'Address immediately',
    })) || []),
    ...(analysis.risks?.filter(r => r.severity === 'medium').map(r => ({
      priority: 'watch',
      title: r.risk,
      body: 'Mitigation: ' + r.mitigation,
      action: 'Monitor and mitigate',
    })) || []),
    ...(analysis.red_flags?.map(f => ({
      priority: 'watch',
      title: f,
      body: '',
      action: 'Clarify before submission',
    })) || []),
  ] : []

  const hasContent = mode === 'paste' ? pasteText.trim().length > 20 : !!fileContent

  // ── File processing ─────────────────────────────────────────────
  const processFile = (file) => {
    if (!file) return
    const name = file.name
    setFileName(name)
    const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf')
    if (isPdf) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target.result.replace(/^data:application\/pdf;base64,/, '')
        setFileContent({ type: 'pdf', data: base64 })
      }
      reader.readAsDataURL(file)
    } else {
      const reader = new FileReader()
      reader.onload = (e) => setFileContent({ type: 'text', data: e.target.result })
      reader.readAsText(file)
    }
  }

  const handleFileChange = (e) => processFile(e.target.files?.[0])
  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files?.[0]) }

  // ── Analyse ─────────────────────────────────────────────────────
  const analyse = async () => {
    setLoading(true)
    setAnalysis(null)
    if (isDemoUser(user)) {
      await delay(2200)
      setAnalysis(DEMO_ANALYSIS)
      setLoading(false)
      return
    }
    try {
      const accountCtx = account
        ? ('\n\nSELLER CONTEXT: You are helping a sales rep selling to ' + account.name + (account.industry ? ' (' + account.industry + ')' : '') + '. Tailor win strategy and questions to this specific account.')
        : ''
      const systemWithCtx = SYSTEM_PROMPT + accountCtx
      let messages
      if (mode === 'paste') {
        messages = [{ role: 'user', content: pasteText }]
      } else if (fileContent?.type === 'pdf') {
        messages = [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileContent.data } },
          { type: 'text', text: 'Analyse this RFQ document.' }
        ]}]
      } else {
        messages = [{ role: 'user', content: fileContent?.data || '' }]
      }
      const raw = await callAI(systemWithCtx, messages, 2000)
      const parsed = extractJSON(raw)
      if (!parsed) throw new Error('Could not parse analysis response')
      setAnalysis(parsed)
    } catch (e) {
      showToast(e.message || 'Analysis failed', 'error')
    }
    setLoading(false)
  }

  // ── Draft email ─────────────────────────────────────────────────
  const generateDraftEmail = async () => {
    setDraftEmailLoading(true)
    setDraftEmail('')
    if (isDemoUser(user)) {
      await delay(2000)
      setDraftEmail(DEMO_EMAIL)
      setDraftEmailLoading(false)
      return
    }
    try {
      const prompt = 'Write a professional first-response covering email to ' + (analysis.buyer || 'the buyer') + ' regarding their RFQ: "' + (analysis.title || 'RFQ') + '".' +
        '\n\nWin strategy to reflect: ' + analysis.win_strategy +
        '\n\nTop risks to address: ' + (analysis.risks?.slice(0, 2).map(r => r.risk).join('; ') || 'none listed') +
        '\n\nWrite a Subject line then the email body. 3-4 short paragraphs. Professional, confident, specific. End with a proposed next step.'
      const system = 'You are a senior B2B sales professional writing a first-response covering email to an RFQ. Be concise, professional, and reference the win strategy positioning. Output Subject line first, then the full email body.'
      const result = await callAI(system, [{ role: 'user', content: prompt }], 600)
      setDraftEmail(result)
    } catch (e) {
      showToast(e.message, 'error')
    }
    setDraftEmailLoading(false)
  }

  // ── Copy call prep ───────────────────────────────────────────────
  const copyCallPrep = () => {
    const lines = ['Call Prep — ' + (analysis.title || 'RFQ'), '']
    ;(analysis.key_questions || []).forEach((q, i) => lines.push((i + 1) + '. ' + q))
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCallPrepCopied(true)
      setTimeout(() => setCallPrepCopied(false), 2000)
    })
  }

  // ── Create checklist ─────────────────────────────────────────────
  const createChecklist = async () => {
    if (!targetAccount) return showToast('Select a deal account first', 'error')
    setChecklistSaving(true)
    const newItems = (analysis.response_structure || []).map(s => ({ id: uid(), text: s, done: false }))
    const existing = targetAccount.checklist || []
    await saveAccount({ ...targetAccount, checklist: [...existing, ...newItems] })
    setChecklistSaving(false)
    setChecklistSaved(true)
    showToast(newItems.length + ' checklist items saved to ' + targetAccount.name, 'success')
  }

  // ── Save signals ─────────────────────────────────────────────────
  const saveSelectedSignals = async () => {
    if (!targetAccount) return showToast('Select a deal account first', 'error')
    if (selectedSignalIdxs.size === 0) return showToast('Select at least one signal', 'error')
    setSavingSignals(true)
    const toSave = signalCandidates
      .filter((_, i) => selectedSignalIdxs.has(i))
      .map(s => ({ id: uid(), ...s, date: new Date().toISOString().split('T')[0], source: 'RFQ Analysis' }))
    const signals = [...(targetAccount.signals || []), ...toSave]
    await saveAccount({ ...targetAccount, signals })
    setSavingSignals(false)
    showToast(toSave.length + ' signal(s) saved to ' + targetAccount.name, 'success')
  }

  // ── Log activity ─────────────────────────────────────────────────
  const logActivity = async () => {
    if (!targetAccount) return showToast('Select a deal account first', 'error')
    setSavingActivity(true)
    const notesLines = [
      analysis.budget ? 'Budget: ' + analysis.budget : '',
      analysis.deadline ? 'Deadline: ' + analysis.deadline : '',
      '',
      analysis.win_strategy ? 'Win strategy: ' + analysis.win_strategy : '',
    ].filter((l, i) => i < 2 ? l : true)
    const entry = {
      id: uid(),
      type: 'note',
      title: 'RFQ received — ' + (analysis.buyer || targetAccount.name),
      date: new Date().toISOString().split('T')[0],
      notes: notesLines.join('\n'),
      next: analysis.key_questions?.[0] || '',
    }
    const activities = [...(targetAccount.activities || []), entry]
    await saveAccount({ ...targetAccount, activities })
    setSavingActivity(false)
    setActivitySaved(true)
    showToast('Activity logged to ' + targetAccount.name, 'success')
  }

  // ── Save to notes ────────────────────────────────────────────────
  const saveToNotes = async () => {
    if (!targetAccount) return showToast('Select a deal account first', 'error')
    setSavingNotes(true)
    const lines = [
      '=== RFQ Analysis — ' + (analysis.title || 'RFQ') + ' ===',
      '',
      'WIN STRATEGY',
      analysis.win_strategy || '',
      '',
      'RED FLAGS',
      ...(analysis.red_flags || []).map(f => '• ' + f),
    ]
    const newNotes = lines.join('\n')
    const existing = targetAccount.notes || ''
    await saveAccount({ ...targetAccount, notes: existing ? existing + '\n\n---\n\n' + newNotes : newNotes })
    setSavingNotes(false)
    setNotesSaved(true)
    showToast('Saved to ' + targetAccount.name + ' notes', 'success')
  }

  const toggleSection = (key) => setOpenSaveSection(prev => prev === key ? null : key)
  const toggleSignal = (i) => setSelectedSignalIdxs(prev => {
    const next = new Set(prev)
    next.has(i) ? next.delete(i) : next.add(i)
    return next
  })

  return (
    <div>
      {!embedded && (
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1f2937', marginBottom: 16 }}>
          📄 RFQ / Tender Analyser
          {account && <span style={{ fontSize: 13, fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>{'— ' + account.name}</span>}
        </div>
      )}
      {embedded && account && (
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>Analysing RFQ for <strong>{account.name}</strong></div>
      )}

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[{ key: 'upload', label: 'Upload file' }, { key: 'paste', label: 'Paste text' }].map(m => (
          <button
            key={m.key}
            className={'btn btn-sm ' + (mode === m.key ? 'btn-primary' : 'btn-secondary')}
            onClick={() => { setMode(m.key); setAnalysis(null); setFileContent(null); setFileName('') }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Upload mode */}
      {mode === 'upload' && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed ' + (dragOver ? '#0F6E56' : '#d1d5db'),
            borderRadius: 12, padding: '32px 20px', textAlign: 'center',
            cursor: 'pointer', background: dragOver ? '#f0fdf7' : '#fafafa',
            transition: 'all 0.15s', marginBottom: 16,
          }}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,.txt,.docx" style={{ display: 'none' }} onChange={handleFileChange} />
          {fileName ? (
            <div>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📎</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#0F6E56' }}>{fileName}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Click to change file</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Click to upload or drag & drop</div>
              <div style={{ fontSize: 12, color: '#9ca3af' }}>PDF, .txt, .docx supported</div>
            </div>
          )}
        </div>
      )}

      {/* Paste mode */}
      {mode === 'paste' && (
        <textarea
          className="form-input"
          rows={20}
          placeholder="Paste the RFQ or tender document text here…"
          value={pasteText}
          onChange={e => setPasteText(e.target.value)}
          style={{ marginBottom: 16, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6 }}
        />
      )}

      {/* Analyse button */}
      <button className="btn btn-primary" onClick={analyse} disabled={!hasContent || loading} style={{ marginBottom: 24 }}>
        {loading ? <><Spinner /> Analysing document…</> : '🔍 Analyse RFQ'}
      </button>

      {/* Results */}
      {analysis && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Header info */}
          <div className="card">
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>{analysis.title}</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 13, color: '#6b7280' }}>
              {analysis.buyer && <span>{'🏢 ' + analysis.buyer}</span>}
              {analysis.deadline && <span>{'📅 ' + analysis.deadline}</span>}
              {analysis.budget && <span>{'💰 ' + analysis.budget}</span>}
            </div>
          </div>

          {/* Win strategy */}
          {analysis.win_strategy && (
            <div style={{ background: '#f0fdf7', border: '1px solid #9FE1CB', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#0F6E56', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Win Strategy</div>
              <div style={{ fontSize: 13, color: '#1f2937', lineHeight: 1.65 }}>{analysis.win_strategy}</div>
            </div>
          )}

          {/* Requirements */}
          {analysis.requirements?.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>Requirements</div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #e5e7eb' }}>
                      <th style={{ textAlign: 'left', padding: '6px 10px', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>Requirement</th>
                      <th style={{ textAlign: 'left', padding: '6px 10px', color: '#6b7280', fontWeight: 600, fontSize: 11, whiteSpace: 'nowrap' }}>Critical</th>
                      <th style={{ textAlign: 'left', padding: '6px 10px', color: '#6b7280', fontWeight: 600, fontSize: 11 }}>Note</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.requirements.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', background: r.critical ? '#FFF5F5' : 'transparent' }}>
                        <td style={{ padding: '8px 10px', color: r.critical ? '#B91C1C' : '#374151', fontWeight: r.critical ? 600 : 400 }}>
                          {r.critical && '⚠️ '}{r.item}
                        </td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                          {r.critical
                            ? <span style={{ background: '#FEE2E2', color: '#B91C1C', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 600 }}>Critical</span>
                            : <span style={{ background: '#F3F4F6', color: '#6b7280', borderRadius: 4, padding: '2px 7px', fontSize: 11 }}>Standard</span>
                          }
                        </td>
                        <td style={{ padding: '8px 10px', color: '#6b7280', fontSize: 12 }}>{r.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Risks */}
          {analysis.risks?.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>Risks</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {analysis.risks.map((r, i) => (
                  <div key={i} style={{ borderLeft: '3px solid ' + (r.severity === 'high' ? '#EF4444' : r.severity === 'medium' ? '#F59E0B' : '#9ca3af'), paddingLeft: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <SeverityBadge severity={r.severity} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{r.risk}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#0F6E56' }}>{'Mitigation: ' + r.mitigation}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key questions */}
          {analysis.key_questions?.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Key Questions to Ask</div>
                <button
                  className={'btn btn-sm ' + (callPrepCopied ? 'btn-primary' : 'btn-secondary')}
                  style={{ fontSize: 11 }}
                  onClick={copyCallPrep}
                >
                  {callPrepCopied ? '✓ Copied!' : '📋 Copy call prep'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {analysis.key_questions.map((q, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <span style={{ color: '#0F6E56', fontWeight: 700, flexShrink: 0 }}>{'Q' + (i + 1) + '.'}</span>
                    <span style={{ fontSize: 13, color: '#374151' }}>{q}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Response structure */}
          {analysis.response_structure?.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div className="card-title" style={{ marginBottom: 0 }}>Recommended Response Structure</div>
                <button
                  className={'btn btn-sm ' + (checklistSaved ? 'btn-primary' : 'btn-secondary')}
                  style={{ fontSize: 11 }}
                  onClick={createChecklist}
                  disabled={checklistSaving || (checklistSaved && !targetAccount)}
                  title={!targetAccount ? 'Select a deal account below to save checklist' : ''}
                >
                  {checklistSaving ? <><Spinner /> Saving…</> : checklistSaved ? '✓ Checklist saved' : '✅ Create checklist'}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {analysis.response_structure.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#374151' }}>
                    <span style={{ color: '#9ca3af', flexShrink: 0, fontFamily: 'monospace' }}>{String(i + 1).padStart(2, '0') + '.'}</span>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evaluation criteria */}
          {analysis.evaluation_criteria?.length > 0 && (
            <div className="card">
              <div className="card-title" style={{ marginBottom: 10 }}>Evaluation Criteria</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {analysis.evaluation_criteria.map((c, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#374151', display: 'flex', gap: 8 }}>
                    <span style={{ color: '#0F6E56' }}>→</span> {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Red flags */}
          {analysis.red_flags?.length > 0 && (
            <div style={{ background: '#FFF5F5', border: '1px solid #FECACA', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#B91C1C', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>🚩 Red Flags</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {analysis.red_flags.map((f, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#B91C1C', display: 'flex', gap: 8 }}>
                    <span style={{ flexShrink: 0 }}>•</span> {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════ */}
          {/* ACTIONS PANEL                                               */}
          {/* ═══════════════════════════════════════════════════════════ */}
          <div style={{ border: '1.5px solid #0F6E56', borderRadius: 12, overflow: 'hidden' }}>

            {/* Panel header */}
            <div style={{ background: '#0F6E56', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>⚡ Actions</span>
              {!account && dealAccounts.length > 0 && (
                <select
                  value={selectedDealId}
                  onChange={e => setSelectedDealId(e.target.value)}
                  style={{ fontSize: 12, borderRadius: 6, padding: '4px 8px', border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', cursor: 'pointer', maxWidth: 180 }}
                >
                  <option value="">— Select deal —</option>
                  {dealAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              )}
            </div>

            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>

              {/* Quick action buttons */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary btn-sm"
                  style={{ fontSize: 12 }}
                  onClick={generateDraftEmail}
                  disabled={draftEmailLoading}
                >
                  {draftEmailLoading ? <><Spinner /> Drafting…</> : '✉️ Draft email'}
                </button>
              </div>

              {/* Draft email output */}
              {draftEmail && (
                <div style={{ marginTop: 4 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Draft email</div>
                  <textarea
                    className="form-input"
                    rows={10}
                    value={draftEmail}
                    onChange={e => setDraftEmail(e.target.value)}
                    style={{ fontSize: 12, lineHeight: 1.65, fontFamily: 'inherit' }}
                  />
                  <button
                    className={'btn btn-sm ' + (emailCopied ? 'btn-primary' : 'btn-secondary')}
                    style={{ fontSize: 11, marginTop: 6 }}
                    onClick={() => navigator.clipboard.writeText(draftEmail).then(() => { setEmailCopied(true); setTimeout(() => setEmailCopied(false), 2000) })}
                  >
                    {emailCopied ? '✓ Copied!' : 'Copy email'}
                  </button>
                </div>
              )}

              {/* Save to deal — 3 collapsible sections */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Save to {targetAccount ? targetAccount.name : 'deal'}</div>

                {/* Signals */}
                {signalCandidates.length > 0 && (
                  <CollapsibleSection
                    title={'🔔 Signals to save'}
                    badge={selectedSignalIdxs.size + '/' + signalCandidates.length}
                    open={openSaveSection === 'signals'}
                    onToggle={() => toggleSection('signals')}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {signalCandidates.map((s, i) => (
                        <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={selectedSignalIdxs.has(i)}
                            onChange={() => toggleSignal(i)}
                            style={{ marginTop: 3, accentColor: '#0F6E56', flexShrink: 0 }}
                          />
                          <div>
                            <span className={'badge badge-' + s.priority} style={{ marginRight: 6 }}>{s.priority}</span>
                            <span style={{ fontSize: 13, color: '#374151' }}>{s.title}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: 12 }}
                      onClick={saveSelectedSignals}
                      disabled={savingSignals || selectedSignalIdxs.size === 0}
                    >
                      {savingSignals ? <><Spinner /> Saving…</> : 'Save selected signals'}
                    </button>
                  </CollapsibleSection>
                )}

                {/* Log activity */}
                <CollapsibleSection
                  title={'📋 Log activity'}
                  open={openSaveSection === 'activity'}
                  onToggle={() => toggleSection('activity')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12, background: '#f9fafb', borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
                    <div><strong>Type:</strong> Note</div>
                    <div><strong>Title:</strong> {'RFQ received — ' + (analysis.buyer || targetAccount?.name || '…')}</div>
                    {analysis.budget && <div><strong>Budget:</strong> {analysis.budget}</div>}
                    {analysis.deadline && <div><strong>Deadline:</strong> {analysis.deadline}</div>}
                    {analysis.key_questions?.[0] && <div style={{ color: '#0F6E56' }}><strong>Next:</strong> {analysis.key_questions[0]}</div>}
                  </div>
                  <button
                    className={'btn btn-sm ' + (activitySaved ? 'btn-secondary' : 'btn-primary')}
                    style={{ fontSize: 12 }}
                    onClick={logActivity}
                    disabled={savingActivity || activitySaved}
                  >
                    {savingActivity ? <><Spinner /> Logging…</> : activitySaved ? '✓ Activity logged' : 'Log activity'}
                  </button>
                </CollapsibleSection>

                {/* Save to notes */}
                <CollapsibleSection
                  title={'📝 Save to notes'}
                  open={openSaveSection === 'notes'}
                  onToggle={() => toggleSection('notes')}
                >
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12, lineHeight: 1.55 }}>
                    Saves the win strategy and red flags to {targetAccount ? targetAccount.name + "'s" : 'the deal'} Notes tab. Appended below any existing notes.
                  </div>
                  <button
                    className={'btn btn-sm ' + (notesSaved ? 'btn-secondary' : 'btn-primary')}
                    style={{ fontSize: 12 }}
                    onClick={saveToNotes}
                    disabled={savingNotes || notesSaved}
                  >
                    {savingNotes ? <><Spinner /> Saving…</> : notesSaved ? '✓ Notes saved' : 'Save to notes'}
                  </button>
                </CollapsibleSection>
              </div>

            </div>
          </div>

          {/* Legacy save-as-activity (for embedded callback mode) */}
          {onSaveActivity && (
            <button
              className="btn btn-secondary btn-sm"
              style={{ alignSelf: 'flex-start', fontSize: 12 }}
              onClick={() => onSaveActivity({
                type: 'note',
                title: 'RFQ Analysis — ' + (analysis.title || account?.name || 'RFQ'),
                notes: [
                  analysis.win_strategy ? 'Win strategy: ' + analysis.win_strategy : '',
                  analysis.requirements?.filter(r => r.critical).length
                    ? 'Critical requirements: ' + analysis.requirements.filter(r => r.critical).map(r => r.item).join('; ')
                    : '',
                  analysis.red_flags?.length ? 'Red flags: ' + analysis.red_flags.join('; ') : '',
                ].filter(Boolean).join('\n\n'),
                next: analysis.key_questions?.[0] || '',
              })}
            >
              💾 Save as activity (quick)
            </button>
          )}

        </div>
      )}
    </div>
  )
}
