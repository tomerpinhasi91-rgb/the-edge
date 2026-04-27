import { useState } from 'react'
import { callAI, serperSearch, extractJSON } from '../../lib/ai'
import { isDemoUser, delay } from '../../lib/demo'
import Spinner from '../ui/Spinner'

// ── Reusable Market Intel Panel (Stages 1 + 2) ──────────────────
// Use anywhere: Lead Room tab, Lead view, Deal view, inline after research
// Props:
//   initialIndustry  — pre-fill industry (e.g. from lead.industry)
//   initialRegion    — defaults to 'Australia'
//   user             — for demo mode check
//   showToast
//   compact          — true = no chips, smaller padding

const SIGNAL_STYLE = {
  growth:      { bg: '#E1F5EE', color: '#0F6E56' },
  opportunity: { bg: '#E6F1FB', color: '#185FA5' },
  risk:        { bg: '#FCEBEB', color: '#A32D2D' },
}

const DEMO_RESULT = {
  market_size: '$3.8B AUD',
  cagr: '5.4% p.a.',
  tam_estimate: '~$42M reachable (SMB, 5–200 reps)',
  trends: [
    { title: 'Supply chain digitalisation accelerating', body: 'Post-COVID pressure on procurement teams to adopt AI-driven tools is driving 2× the usual software evaluation cycles.', signal: 'opportunity' },
    { title: 'Labour costs squeezing margins', body: 'Rising wages are pushing manufacturers to automate sales intelligence tasks previously done manually.', signal: 'growth' },
    { title: 'CRM dissatisfaction at record high', body: 'Gartner reports 71% of sales reps find their CRM too admin-heavy — creating an opening for intelligence-first tools.', signal: 'opportunity' },
    { title: 'M&A consolidation risk in mid-market', body: 'High deal activity means some target accounts may change key decision-makers within 6 months of initial outreach.', signal: 'risk' },
  ],
  key_players: [
    { name: 'George Weston Foods', position: 'Largest manufacturer, 4,000+ employees' },
    { name: "Ingham's Group", position: 'Poultry leader, $2.8B revenue' },
    { name: 'Simplot Australia', position: 'Frozen food & agriculture' },
    { name: 'Sanitarium Health Food Company', position: 'FMCG, 700+ employees' },
    { name: 'Beak & Johnston', position: 'Meat processing, strong sales team' },
  ],
  buyer_insights: 'Decision makers are typically Sales Directors or National Sales Managers aged 40–55. They value ROI clarity and are sceptical of "another tool". Best approached with a specific signal about their market — not a generic pitch.',
  best_time_to_reach: 'Q1 (Jan–Mar) when budgets reset, and Aug–Sep before end-of-year planning.',
}

export default function MarketIntelPanel({ initialIndustry = '', initialRegion = 'Australia', user, showToast, compact = false }) {
  const [industry, setIndustry] = useState(initialIndustry)
  const [region, setRegion] = useState(initialRegion)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [status, setStatus] = useState('')

  const CHIPS = ['food manufacturing', 'cold chain logistics', 'agriculture', 'industrial packaging', 'meat processing']

  const run = async (ind, reg) => {
    const i = (ind !== undefined ? ind : industry).trim()
    const r = (reg !== undefined ? reg : region).trim() || 'Australia'
    if (!i) return showToast('Enter an industry to analyse', 'error')
    setLoading(true); setResult(null); setStatus('Searching market data...')

    if (isDemoUser(user)) {
      await delay(1800)
      setResult({ ...DEMO_RESULT, industry: i, region: r })
      setStatus('')
      setLoading(false); return
    }

    try {
      const [r1, r2, r3] = await Promise.allSettled([
        serperSearch(i + ' market size Australia 2025 2026 revenue'),
        serperSearch(i + ' industry trends ' + r + ' growth forecast digital'),
        serperSearch(i + ' top companies ' + r + ' largest players'),
      ])

      setStatus('Analysing with AI...')

      const fmt = (res, label) => {
        if (res.status !== 'fulfilled') return ''
        const org = (res.value.organic || []).slice(0, 4)
        const news = (res.value.news || []).slice(0, 3)
        let s = label + ':\n'
        org.forEach(o => { s += o.title + ': ' + (o.snippet || '').slice(0, 200) + '\n' })
        news.forEach(n => { s += '[NEWS] ' + n.title + ': ' + (n.snippet || '').slice(0, 150) + '\n' })
        return s + '\n'
      }

      const context = fmt(r1, 'MARKET SIZE & REVENUE') + fmt(r2, 'TRENDS & GROWTH') + fmt(r3, 'KEY PLAYERS')
      const prompt = `You are a market research analyst. Build a market intelligence report for the "${i}" industry in ${r}. Return ONLY valid JSON (no markdown): {"market_size":"e.g. $4.2B AUD","cagr":"e.g. 6.2% p.a.","tam_estimate":"total addressable market for a B2B sales intelligence tool targeting this space","trends":[{"title":string,"body":string,"signal":"growth"|"risk"|"opportunity"}],"key_players":[{"name":string,"position":string}],"buyer_insights":"2-3 sentences about decision makers and what they care about","best_time_to_reach":"when buyers are most active"}`

      const raw = await callAI(prompt, [{ role: 'user', content: 'Search data:\n\n' + context }], 1200)
      const parsed = extractJSON(raw)
      if (parsed) {
        setResult({ ...parsed, industry: i, region: r })
        setStatus('')
      } else {
        setStatus('Could not parse — try again')
      }
    } catch (e) { showToast(e.message, 'error'); setStatus('Search failed') }
    setLoading(false)
  }

  // Auto-run if initialIndustry provided
  const [autoRan, setAutoRan] = useState(false)
  if (initialIndustry && !autoRan && !result && !loading) {
    setAutoRan(true)
    setTimeout(() => run(initialIndustry, initialRegion), 0)
  }

  return (
    <div>
      {/* Search bar — hide in compact mode if industry is pre-filled */}
      {(!compact || !initialIndustry) && (
        <div style={{ display: 'flex', gap: 8, marginBottom: compact ? 10 : 12, flexWrap: 'wrap' }}>
          <input className="form-input" style={{ flex: 2, minWidth: 140 }}
            placeholder="e.g. food manufacturing, cold chain logistics..."
            value={industry} onChange={e => setIndustry(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()} />
          <input className="form-input" style={{ width: 130 }}
            placeholder="Region" value={region} onChange={e => setRegion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && run()} />
          <button className="btn btn-primary" onClick={() => run()} disabled={loading}>
            {loading ? <><Spinner /> Analysing…</> : 'Analyse'}
          </button>
        </div>
      )}

      {/* Compact mode: just a refresh button if industry is known */}
      {compact && initialIndustry && !result && !loading && (
        <button className="btn btn-primary btn-sm" style={{ marginBottom: 10 }} onClick={() => run(initialIndustry, region)} disabled={loading}>
          📊 Analyse {initialIndustry} market
        </button>
      )}

      {compact && result && (
        <button className="btn btn-secondary btn-sm" style={{ marginBottom: 10, fontSize: 11 }} onClick={() => run()} disabled={loading}>
          🔄 Refresh
        </button>
      )}

      {!compact && !initialIndustry && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {CHIPS.map((c, i) => (
            <button key={i} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => { setIndustry(c); run(c) }}>{c}</button>
          ))}
        </div>
      )}

      {status && <div style={{ fontSize: 12, marginBottom: 8, color: '#9ca3af' }}>{status}</div>}

      {loading && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '20px 0', color: '#6b7280', fontSize: 13 }}>
          <Spinner /> Analysing {industry} market...
        </div>
      )}

      {result && (
        <div>
          {/* TAM metrics — Stage 2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {[
              ['Market size', result.market_size, '#0078D4'],
              ['Growth (CAGR)', result.cagr, '#1D9E75'],
              ['Your TAM', result.tam_estimate, '#F97316'],
            ].map(([label, val, color]) => (
              <div key={label} style={{ background: '#F3F4F6', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{label}</div>
                <div style={{ fontSize: compact ? 12 : 13, fontWeight: 700, color, lineHeight: 1.3 }}>{val || 'N/A'}</div>
              </div>
            ))}
          </div>

          {/* Trends — Stage 1 */}
          {(result.trends || []).length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Market trends</div>
              {result.trends.map((t, i) => {
                const s = SIGNAL_STYLE[t.signal] || SIGNAL_STYLE.opportunity
                return (
                  <div key={i} style={{ padding: '8px 10px', borderRadius: 7, background: s.bg, marginBottom: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: s.color, marginBottom: 2 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: '#374151', lineHeight: 1.5 }}>{t.body}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Key players + buyer insights */}
          <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 10 }}>
            {(result.key_players || []).length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Key players</div>
                {result.key_players.slice(0, compact ? 3 : 5).map((p, i) => (
                  <div key={i} style={{ fontSize: 12, padding: '5px 0', borderBottom: i < result.key_players.length - 1 ? '0.5px solid #f3f3f3' : 'none' }}>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    {p.position && <div style={{ fontSize: 10, color: '#9ca3af' }}>{p.position}</div>}
                  </div>
                ))}
              </div>
            )}
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Buyer insights</div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.6, marginBottom: 8 }}>{result.buyer_insights}</div>
              {result.best_time_to_reach && (
                <div style={{ background: '#E6F1FB', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#185FA5' }}>
                  📅 Best time: {result.best_time_to_reach}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
