import { useState } from 'react'
import { useApp } from '../../lib/context'
import { uid } from '../../lib/supabase'
import { callAI } from '../../lib/ai'
import { isDemoUser, getDemoKey, DEMO_COACH, delay } from '../../lib/demo'
import Spinner from '../ui/Spinner'

export default function CoachTab({ account }) {
  const { saveAccount, showToast, user } = useApp()
  const [prompt, setPrompt] = useState('')
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState('')
  const sessions = account.coach_sessions || []

  const buildContext = () => {
    const contacts = (account.contacts || []).slice(0, 4).map(c => `${c.name} (${c.role})`).join(', ')
    const signals = [...(account.signals || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 3).map(s => s.title).join('; ')
    return `Account: ${account.name}
Industry: ${account.industry || ''}
Location: ${account.location || ''}
Stage: ${account.stage || ''}
Opportunity: ${account.opportunity || ''}
Deal value: ${account.dealValue ? '$' + account.dealValue : 'unknown'}
Competitors: ${account.competitors || 'unknown'}
Strategy: ${account.strategy || ''}
Key contacts: ${contacts}
Latest signals: ${signals}`
  }

  const run = async (p) => {
    const q = p || prompt
    if (!q.trim()) return
    setLoading(true); setOutput('')

    // Demo mode
    if (isDemoUser(user)) {
      await delay(1800)
      const key = getDemoKey(account.name)
      const match = Object.keys(DEMO_COACH.approach).find(k => key.includes(k) || k.includes(key))
      const isFirstCall = q.toLowerCase().includes('call') || q.toLowerCase().includes('prep')
      if (match) {
        const response = isFirstCall ? (DEMO_COACH.firstcall[match] || DEMO_COACH.approach[match]) : DEMO_COACH.approach[match]
        const newSession = { id: uid(), date: new Date().toISOString().split('T')[0], prompt: q, response }
        await saveAccount({ ...account, coach_sessions: [...sessions, newSession] })
        setOutput(response)
        setPrompt('')
        showToast('Coach response saved', 'success')
      } else {
        setOutput('Demo coaching is pre-loaded for BlueCrest Logistics, Summit Packaging Solutions, Apex Protein Co and Harvest Ridge Foods.')
      }
      setLoading(false); return
    }

    try {
      const result = await callAI(
        'You are an elite B2B sales coach. Give specific, actionable, deal-specific coaching. Use all account context provided. Be direct, practical and concise.',
        [{ role: 'user', content: `ACCOUNT CONTEXT:\n${buildContext()}\n\nCOACHING REQUEST: ${q}` }],
        800
      )
      const newSession = { id: uid(), date: new Date().toISOString().split('T')[0], prompt: q, response: result }
      await saveAccount({ ...account, coach_sessions: [...sessions, newSession] })
      setOutput(result)
      setPrompt('')
      showToast('Coach response saved', 'success')
    } catch (e) { showToast(e.message, 'error') }
    setLoading(false)
  }

  const deleteSession = async (id) => {
    await saveAccount({ ...account, coach_sessions: sessions.filter(s => s.id !== id) })
  }

  const PRESETS = [
    { label: '📋 Full brief', prompt: 'Give me a complete deal brief — situation, key players, risks, and my best path to winning this.' },
    { label: '🎯 Deal score', prompt: 'Score this deal out of 10 and explain exactly what is strong, what is weak, and what I need to fix.' },
    { label: '📞 Pre-call prep', prompt: 'I have a call coming up. Give me a pre-call brief — what to open with, key questions to ask, objections to prepare for.' },
    { label: '⚠️ Risk analysis', prompt: 'What are the top 3 risks in this deal and what should I do about each one right now?' },
    { label: '✉️ Draft outreach', prompt: 'Write a personalised outreach email to the primary contact that will get a response.' },
    { label: '📅 Meeting agenda', prompt: 'Build me a tight meeting agenda for my next session with this account. Include a closing ask.' },
  ]

  return (
    <div className="main-content">
      {/* Saved sessions */}
      {sessions.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Saved coaching sessions ({sessions.length})
          </div>
          {[...sessions].reverse().map(s => (
            <div key={s.id} className="card" style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{s.prompt.slice(0, 80)}{s.prompt.length > 80 ? '...' : ''}</div>
                  <div style={{ fontSize: 11, color: '#9ca3af' }}>{s.date}</div>
                </div>
                <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
                  <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }} onClick={() => navigator.clipboard.writeText(s.response).then(() => showToast('Copied', 'success'))}>Copy</button>
                  <button className="btn btn-danger btn-sm" style={{ fontSize: 10 }} onClick={() => deleteSession(s.id)}>Delete</button>
                </div>
              </div>
              <div className="ai-output" style={{ fontSize: 12, maxHeight: 200, overflowY: 'auto' }}>{s.response}</div>
            </div>
          ))}
        </div>
      )}

      {/* Ask coach */}
      <div className="ai-panel">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>🤖 AI Deal Coach — {account.name}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {PRESETS.map((p, i) => (
            <button key={i} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => run(p.prompt)} disabled={loading}>{p.label}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <textarea className="form-input" style={{ flex: 1, fontSize: 13, minHeight: 60, resize: 'none' }}
            placeholder="Ask anything about this deal..."
            value={prompt} onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run() } }} />
          <button className="btn btn-primary" onClick={() => run()} disabled={loading} style={{ alignSelf: 'flex-end' }}>
            {loading ? <Spinner /> : 'Ask'}
          </button>
        </div>
        {loading && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Generating response — auto-saves when done...</div>}
      </div>

      {/* Live output */}
      {output && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: '#9ca3af' }}>Latest response (also saved above)</div>
            <div style={{ display: 'flex', gap: 5 }}>
              <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }} onClick={() => navigator.clipboard.writeText(output).then(() => showToast('Copied', 'success'))}>Copy</button>
              <button className="btn btn-secondary btn-sm" style={{ fontSize: 10 }} onClick={() => setOutput('')}>Clear</button>
            </div>
          </div>
          <div className="ai-output">{output}</div>
        </div>
      )}
    </div>
  )
}
