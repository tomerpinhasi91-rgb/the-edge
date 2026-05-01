import { useState } from 'react'
import { useApp } from '../../lib/context'
import { uid } from '../../lib/supabase'
import { callAI, serperSearch, tavilySearch, extractSignals, buildSearchQuery, buildAIContext, getResearchCache, setResearchCache } from '../../lib/ai'
import { isDemoUser, getDemoKey, DEMO_SWEEPS, delay } from '../../lib/demo'
import { PRIORITY_COLORS, PRIORITY_BG, loadProfile } from '../../lib/helpers'
import { loadICP } from '../../lib/icp'
import { ev } from '../../lib/analytics'
import MarketIntelPanel from '../shared/MarketIntelPanel'
import Spinner from '../ui/Spinner'

// #4 Structured output prompt with explicit schema + example
const SWEEP_PROMPT = (ctx) =>
  `B2B sales intelligence analyst. Return ONLY a JSON array — no markdown, no preamble.

Schema: [{"priority":"urgent"|"watch"|"intel"|"grant","title":"one line","body":"2-3 sentences with specific facts","action":"one concrete next step","source":"publication name","source_url":"https://..."}]

Example: [{"priority":"urgent","title":"Apex secures $12M Series B","body":"Apex Protein Co closed a Series B in March 2025. Funds earmarked for production expansion. Strong procurement spend signal.","action":"Call procurement this week while budgets are fresh","source":"AFR","source_url":"https://afr.com/article/apex-series-b"}]

Rules: 3-5 signals. Specific facts only. Omit vague items.
source_url: each search result in the data has a [url:…] tag — copy the URL from the article this signal came from. Only use URLs that appear as [url:…] in the data. If no matching URL, use "".

Context: ${ctx}`

export default function IntelligenceTab({ account }) {
  const { saveAccount, showToast, user } = useApp()
  const [sweepInput, setSweepInput] = useState(account.name + ' news ' + new Date().getFullYear())
  const [sweepLoading, setSweepLoading] = useState(false)
  const [parsedSignals, setParsedSignals] = useState([])
  const [sweepOutput, setSweepOutput] = useState('')
  const [cacheHit, setCacheHit] = useState(false)

  const save = (updates) => saveAccount({ ...account, ...updates })

  const profile = loadProfile(user?.id)
  const icp     = loadICP(user?.id)

  const QUICK = [
    account.name + ' news ' + new Date().getFullYear(),
    account.industry + ' trends ' + new Date().getFullYear(),
    'Grant opportunities ' + (account.location || 'Australia'),
    'Competitor moves ' + (account.name || '')
  ]

  const runSweep = async (override) => {
    const rawQuery = override !== undefined ? override : sweepInput
    if (!rawQuery.trim()) return
    setSweepLoading(true); setSweepOutput(''); setParsedSignals([]); setCacheHit(false)

    // Demo mode
    if (isDemoUser(user)) {
      await delay(1400)
      const key = getDemoKey(account.name)
      const match = Object.keys(DEMO_SWEEPS).find(k => key.includes(k) || k.includes(key))
      if (match) setParsedSignals(DEMO_SWEEPS[match])
      else setSweepOutput('Demo sweep complete. Pre-loaded signals available for BlueCrest Logistics, Apex Protein Co, Summit Packaging and Harvest Ridge Foods.')
      setSweepLoading(false); return
    }

    // #8 Check cache first
    const cacheKey = 'sweep_' + rawQuery.toLowerCase().trim().replace(/\s+/g, '_')
    const cached = getResearchCache(cacheKey)
    if (cached) {
      if (cached.signals) setParsedSignals(cached.signals)
      else if (cached.text) setSweepOutput(cached.text)
      setCacheHit(true)
      ev.intelSweep(rawQuery, true)
      setSweepLoading(false)
      return
    }

    try {
      const ctx = `Company: ${account.name} | Industry: ${account.industry || ''} | Location: ${account.location || ''} | Stage: ${account.stage || ''}`

      // #1 Enhance query — add year + location, no ICP injection (company-specific search)
      const enhancedQuery = buildSearchQuery(
        rawQuery + ' ' + account.name + ' ' + (account.industry || ''),
        profile,
        null  // don't inject ICP industry — query is already account-specific
      )

      // #2 #7 Parallel search + clean deduplicated context
      const [serper, tavily] = await Promise.allSettled([
        serperSearch(enhancedQuery),
        tavilySearch(enhancedQuery, 5)
      ])

      const context = buildAIContext(
        serper.status === 'fulfilled' ? serper.value : null,
        tavily.status === 'fulfilled' ? tavily.value : null,
        { maxSnippet: 300, maxNews: 5, maxOrganic: 5, maxTavily: 4, includeUrls: true }
      )

      // #4 Structured prompt
      const prompt = SWEEP_PROMPT(ctx)
      const result = context.length > 80
        ? await callAI(prompt, [{ role: 'user', content: 'Search data:\n\n' + context }], 900, false)
        : await callAI(prompt, [{ role: 'user', content: 'Find intelligence signals for: ' + enhancedQuery }], 900, true)

      const parsed = extractSignals(result)
      if (parsed && parsed.length) {
        setParsedSignals(parsed)
        setResearchCache(cacheKey, { signals: parsed }) // #8 cache
      } else {
        setSweepOutput(result)
        setResearchCache(cacheKey, { text: result })
      }
      ev.intelSweep(rawQuery, false)
    } catch (e) { showToast(e.message, 'error') }
    setSweepLoading(false)
  }

  const saveSignals = async () => {
    const toAdd = parsedSignals.filter(s => s._selected !== false).map(({ _selected, ...s }) => ({ id: uid(), date: new Date().toISOString().split('T')[0], ...s }))
    if (!toAdd.length) return showToast('Select at least one signal', 'error')
    await save({ signals: [...(account.signals || []), ...toAdd] })
    const topPriority = toAdd.find(s => s.priority === 'urgent')?.priority || toAdd[0]?.priority || 'intel'
    ev.signalSaved(toAdd.length, topPriority)
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
          {QUICK.map((q, i) => (
            <button key={i} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} disabled={sweepLoading}
              onClick={() => { setSweepInput(q); runSweep(q) }}>{q}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" style={{ flex: 1 }} value={sweepInput}
            onChange={e => setSweepInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runSweep()}
            placeholder="Search for news, signals, competitor moves..." />
          <button className="btn btn-ai" onClick={() => runSweep()} disabled={sweepLoading}>
            {sweepLoading ? <><Spinner /> Searching…</> : '⚡ Sweep'}
          </button>
        </div>
        {cacheHit && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 6 }}>
            ⚡ Cached result ·{' '}
            <button style={{ background: 'none', border: 'none', color: '#0F6E56', cursor: 'pointer', fontSize: 11, padding: 0 }}
              onClick={() => { setCacheHit(false); runSweep(sweepInput) }}>refresh
            </button>
          </div>
        )}
      </div>

      {/* Parsed signals preview */}
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
        <div className="card"><div className="ai-output">{sweepOutput}</div></div>
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

      {/* Market Intel */}
      {account.industry && (
        <div className="card">
          <div className="card-title" style={{ marginBottom: 12 }}>📊 Market intel — {account.industry}</div>
          <MarketIntelPanel
            initialIndustry={account.industry}
            initialRegion={account.location ? account.location.split(',').map(p => p.trim()).filter(p => p && !/^\d+$/.test(p)).pop() || 'Australia' : 'Australia'}
            user={user}
            showToast={showToast}
            compact={true}
          />
        </div>
      )}
    </div>
  )
}
