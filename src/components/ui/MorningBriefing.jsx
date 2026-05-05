import { useState, useEffect, useRef } from 'react'
import { callAIStream } from '../../lib/ai'
import { isDemoUser, delay } from '../../lib/demo'
import Spinner from './Spinner'

const PROPOSAL_STAGES = ['proposal', 'negotiate', 'closing']
const MS_PER_DAY = 86400000

function daysSince(isoDateStr) {
  if (!isoDateStr) return 999
  return Math.floor((Date.now() - new Date(isoDateStr)) / MS_PER_DAY)
}

function getLastActivity(account) {
  const acts = account.activities || []
  if (!acts.length) return null
  return acts.reduce((latest, a) => (!latest || a.date > latest) ? a.date : latest, null)
}

function scanGoingCold(accounts) {
  const urgent = []
  const cold = []

  for (const acc of accounts) {
    const lastAct = getLastActivity(acc)
    const days = daysSince(lastAct)
    const isProposalStage = acc._type === 'account' && PROPOSAL_STAGES.includes(acc.stage)

    if (isProposalStage && days >= 5) {
      urgent.push({ name: acc.name, days, stage: acc.stage, type: 'urgent-cold' })
    } else if (days >= 10) {
      cold.push({ name: acc.name, days, type: 'cold' })
    }
  }

  // sort by days desc, top 3 combined
  const combined = [
    ...urgent.sort((a, b) => b.days - a.days),
    ...cold.sort((a, b) => b.days - a.days),
  ]
  return combined.slice(0, 3)
}

export default function MorningBriefing({ accounts, user, setView, setActiveId }) {
  const today = new Date().toISOString().split('T')[0]
  const storageKey = `te_briefing_${today}_${user?.id}`

  const [dismissed, setDismissed] = useState(() => {
    try { return !!localStorage.getItem(storageKey) } catch (e) { return false }
  })
  const [aiText, setAiText] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiDone, setAiDone] = useState(false)
  const coldItems = scanGoingCold(accounts)
  const hasStarted = useRef(false)

  const dismiss = () => {
    try { localStorage.setItem(storageKey, '1') } catch (e) {}
    setDismissed(true)
  }

  useEffect(() => {
    if (dismissed || hasStarted.current || !user) return
    hasStarted.current = true
    setAiLoading(true)

    if (isDemoUser(user)) {
      ;(async () => {
        await delay(1800)
        const demoText = [
          '• Beak & Johnston — MAP line required by October, call Shane today.',
          '• Rivalea Foods — JBS RFQ closes soon, confirm vendor status.',
          '• Harvest Ridge — 12 days no activity, momentum fading.',
        ].join('\n')
        setAiText(demoText)
        setAiLoading(false)
        setAiDone(true)
      })()
      return
    }

    ;(async () => {
      const coldSummary = coldItems.length
        ? coldItems.map(c => `${c.name}: ${c.days} days no activity${c.stage ? `, stage: ${c.stage}` : ''}`).join('; ')
        : 'No cold accounts right now.'

      const allAccountsSummary = accounts.slice(0, 8).map(a => {
        const last = getLastActivity(a)
        const days = daysSince(last)
        return `${a.name} (${a._type === 'account' ? 'deal/' + (a.stage || 'unknown') : 'lead'}, ${days}d no activity)`
      }).join('; ')

      const system = 'You are a B2B sales coach. Be concise and direct. Return exactly 3 bullet points starting with "•" for today\'s top priorities based on the pipeline data. No preamble, no sign-off.'
      const userMsg = `Pipeline: ${allAccountsSummary}\nGoing cold: ${coldSummary}\nWhat are the 3 most important actions for today?`

      try {
        await callAIStream(system, [{ role: 'user', content: userMsg }], 300,
          (_chunk, full) => setAiText(full)
        )
      } catch (e) {
        setAiText('Could not load AI priorities — check your pipeline manually.')
      }
      setAiLoading(false)
      setAiDone(true)
    })()
  }, [dismissed, user])

  if (dismissed) return null

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{
      borderLeft: '4px solid #0F6E56',
      background: 'linear-gradient(135deg, #f0fdf7 0%, #ffffff 100%)',
      borderRadius: '0 12px 12px 0',
      padding: '16px 20px',
      margin: '0 0 0 0',
      boxShadow: '0 2px 8px rgba(15,110,86,0.08)',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F6E56' }}>
          ☀️ {greeting} — here's your day
        </div>
        <button
          onClick={dismiss}
          style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}
          title="Don't show again today"
        >
          ×
        </button>
      </div>

      {/* Going cold chips */}
      {coldItems.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
            Going cold
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {coldItems.map((c, i) => (
              <div
                key={i}
                style={{
                  background: c.type === 'urgent-cold' ? '#FEE2E2' : '#FEF3C7',
                  color: c.type === 'urgent-cold' ? '#B91C1C' : '#92400E',
                  border: `1px solid ${c.type === 'urgent-cold' ? '#FECACA' : '#FDE68A'}`,
                  borderRadius: 20,
                  padding: '3px 10px',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'default',
                }}
              >
                {c.type === 'urgent-cold' ? '🔴' : '🟡'} {c.name} — {c.days}d
              </div>
            ))}
          </div>
        </div>
      )}

      {coldItems.length === 0 && !aiLoading && (
        <div style={{ marginBottom: 10, fontSize: 12, color: '#0F6E56', fontWeight: 500 }}>
          ✅ No accounts going cold — pipeline looking healthy!
        </div>
      )}

      {/* AI priorities */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
          Today's priorities
        </div>
        {aiLoading && !aiText && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280', fontSize: 13 }}>
            <Spinner /> <span>Loading your briefing…</span>
          </div>
        )}
        {aiText && (
          <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {aiText}
            {aiLoading && <span style={{ animation: 'blink 1s infinite' }}>▋</span>}
          </div>
        )}
        {aiDone && !aiText && (
          <div style={{ fontSize: 13, color: '#9ca3af' }}>No priorities generated.</div>
        )}
      </div>

      {/* Dismiss link */}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
        <button
          onClick={dismiss}
          style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 11, cursor: 'pointer', padding: 0 }}
        >
          Don't show again today
        </button>
      </div>
    </div>
  )
}
