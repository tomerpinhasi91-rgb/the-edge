import { useState } from 'react'
import { useApp } from '../../lib/context'
import { uid } from '../../lib/supabase'
import { callAI, serperSearch, tavilySearch, extractSignals } from '../../lib/ai'
import { isDemoUser, getDemoKey, DEMO_SWEEPS, delay } from '../../lib/demo'
import { PRIORITY_COLORS, PRIORITY_BG } from '../../lib/helpers'
import Spinner from '../ui/Spinner'

export default function IntelligenceTab({ account }) {
  const { saveAccount, showToast, user } = useApp()
  const [sweepInput, setSweepInput] = useState(account.name + ' news 2026')
  const [sweepLoading, setSweepLoading] = useState(false)
  const [parsedSignals, setParsedSignals] = useState([])
  const [sweepOutput, setSweepOutput] = useState('')

  const save = (updates) => saveAccount({ ...account, ...updates })

  const QUICK = [
    account.name + ' news 2026',
    account.industry + ' trends 2026',
    'Grant opportunities ' + (account.location || 'Australia'),
    'Competitor moves ' + (account.name || '')
  ]

  const runSweep = async (override) => {
    const query = override !== undefined ? override : sweepInput
    if (!query.trim()) return
    setSweepLoading(true); setSweepOutput(''); setParsedSignals([])

    // Demo mode
    if (isDemoUser(user)) {
      await delay(1400)
      const key = getDemoKey(account.name)
      const match = Object.keys(DEMO_SWEEPS).find(k => key.includes(k) || k.includes(key))
      if (match) setParsedSignals(DEMO_SWEEPS[match])
      else setSweepOutput('Demo sweep complete. Pre-loaded signals available for BlueCrest Logistics, Apex Protein Co, Summit Packaging and Harvest Ridge Foods.')
      setSweepLoading(false); return
    }

    try {
      const ctx = `Company: ${account.name} | Industry: ${account.industry || ''} | Location: ${account.location || ''} | Stage: ${account.stage || ''}`
      const fullQuery = query + ' ' + account.name + ' ' + (account.industry || '') + ' ' + (account.location || '')
      const [serper, tavily] = await Promise.allSettled([serperSearch(fullQuery), tavilySearch(fullQuery, 5)])
      let context = ''
      if (serper.status === 'fulfilled') {
        const news = serper.value.news || [], organic = serper.value.organic || []
        if (news.length) context += 'GOOGLE NEWS:\n' + news.slice(0, 5).map((n, i) => `[${i}] ${n.title} — ${n.date || 'recent'}: ${n.snippet} (${n.link})`).join('\n') + '\n\n'
        if (organic.length) context += 'WEB:\n' + organic.slice(0, 4).map(r => `${r.title}: ${(r.snippet || '').slice(0, 200)}`).join('\n')
      }
      if (tavily.status === 'fulfilled') context += '\n' + (tavily.value.results || []).slice(0, 3).map(r => r.title + ': ' + (r.content || '').slice(0, 150)).join('\n')

      const prompt = `B2B sales intelligence analyst. Return ONLY valid JSON array: [{"priority":"urgent"|"watch"|"intel"|"grant","title":"one line","body":"2-3 sentences with specific facts","action":"one next step TODAY","source":"publication","source_url":"URL"}]. 3-5 signals. Context: ${ctx}`
      const result = context.length > 100
        ? await callAI(prompt, [{ role: 'user', content: 'Search data:\n\n' + context }], 800, false)
        : await callAI(prompt, [{ role: 'user', content: 'Find signals: ' + fullQuery }], 800, true)

      const parsed = extractSignals(result)
      if (parsed && parsed.length) { setParsedSignals(parsed); setSweepOutput('') }
      else setSweepOutput(result)
    } catch (e) { showToast(e.message, 'error') }
    setSweepLoading(false)
  }

  const saveSignals = async () => {
    const toAdd = parsedSignals.filter(s => s._selected !== false).map(({ _selected, ...s }) => ({ id: uid(), date: new Date().toISOString().split('T')[0], ...s }))
    if (!toAdd.length) return showToast('Select at least one signal', 'error')
    await save({ signals: [...(account.signals || []), ...toAdd] })
    setParsedSignals([])
    showToast(`${toAdd.length} signal${toAdd.length !== 1 ? 's' : ''} saved`, 'success')
  }

  const deleteSignal = async (id) => save({ signals: (account.signals || []).filter(s => s.id !== id) })

  const toggleSignal = (i) => setParsedSignals(prev => prev.map((s, idx) => idx === i ? { ...s, _selected: s._selected === false ? true : false } : s))

  return (
    <div className="main-content">
      {/* Sweep */}
      <div className="ai-panel">
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>⚡ Intelligence sweep</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
          {QUICK.map((q, i) => <button key={i} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} disabled={sweepLoading} onClick={() => { setSweepInput(q); runSweep(q) }}>{q}</button>)}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" style={{ flex: 1 }} value={sweepInput} onChange={e => setSweepInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && runSweep()} placeholder="Search for news, signals, competitor moves..." />
          <button className="btn btn-ai" onClick={runSweep} disabled={sweepLoading}>
            {sweepLoading ? <><Spinner /> Searching…</> : '⚡ Sweep'}
          </button>
        </div>
      </div>

      {/* Parsed signals */}
      {parsedSignals.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{parsedSignals.filter(s => s._selected !== false).length} of {parsedSignals.length} selected</div>
            <button className="btn btn-primary btn-sm" onClick={saveSignals}>Save signals</button>
          </div>
          {parsedSignals.map((s, i) => {
            const selected = s._selected !== false
            return (
              <div key={i} onClick={() => toggleSignal(i)} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderBottom: i < parsedSignals.length - 1 ? '0.5px solid #f3f3f3' : 'none', background: selected ? 'white' : '#f9f9f9', opacity: selected ? 1 : 0.5, cursor: 'pointer', borderRadius: 6, marginBottom: 4 }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  <div style={{ width: 16, height: 16, border: '0.5px solid #d4d4d4', borderRadius: 4, background: selected ? '#0F6E56' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {selected && <span style={{ color: 'white', fontSize: 10 }}>✓</span>}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <span className={`badge badge-${s.priority}`}>{s.priority}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{s.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>{s.body}</div>
                  <div style={{ fontSize: 12, color: '#0F6E56', fontWeight: 500 }}>→ {s.action}</div>
                  {s.source_url && <a href={s.source_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11, color: '#9ca3af' }}>{s.source || s.source_url}</a>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {sweepOutput && (
        <div className="card">
          <div className="ai-output">{sweepOutput}</div>
        </div>
      )}

      {/* Saved signals */}
      {(account.signals || []).length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Saved signals ({(account.signals || []).length})
          </div>
          {[...(account.signals || [])].sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(s => (
            <div key={s.id} className={`signal-card ${s.priority}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={`badge badge-${s.priority}`}>{s.priority}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1f2937' }}>{s.title}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{s.date}</span>
                  <button onClick={() => deleteSignal(s.id)} style={{ background: 'none', border: 'none', color: '#d4d4d4', cursor: 'pointer', fontSize: 14 }}>×</button>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>{s.body}</div>
              <div style={{ fontSize: 12, color: '#0F6E56', fontWeight: 500 }}>→ {s.action}</div>
              {s.source_url && <a href={s.source_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#9ca3af' }}>{s.source || s.source_url}</a>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
