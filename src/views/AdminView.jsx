import { useState, useEffect } from 'react'
import { useApp } from '../lib/context'
import { getTokenStats } from '../lib/ai'
import { PRIORITY_COLORS, PRIORITY_BG, STAGE_LABELS, exportAccountsCSV } from '../lib/helpers'

const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'activity', label: 'Activity Feed' },
  { key: 'signals', label: 'Signal Library' },
  { key: 'diagnostics', label: 'Diagnostics' },
]

const actTypeColors = {
  call: '#1D9E75', meeting: '#185FA5', email: '#BA7517',
  note: '#6b7280', demo: '#7C3AED', proposal: '#0F6E56'
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago'
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago'
  if (diff < 86400 * 7) return Math.floor(diff / 86400) + 'd ago'
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })
}

function fmtDateFull(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function parseUA(ua) {
  if (!ua) return null
  let browser = 'Unknown', os = 'Unknown'
  if (/Edg\//.test(ua)) browser = 'Edge'
  else if (/Chrome\//.test(ua)) browser = 'Chrome'
  else if (/Firefox\//.test(ua)) browser = 'Firefox'
  else if (/Safari\//.test(ua)) browser = 'Safari'
  if (/Windows/.test(ua)) os = 'Windows'
  else if (/Mac OS X/.test(ua)) os = 'macOS'
  else if (/iPhone|iPad/.test(ua)) os = 'iOS'
  else if (/Android/.test(ua)) os = 'Android'
  else if (/Linux/.test(ua)) os = 'Linux'
  return browser + ' / ' + os
}

export default function AdminView() {
  const { isAdmin, showToast } = useApp()
  const [tab, setTab] = useState('users')
  const [allRows, setAllRows] = useState([])
  const [authUsers, setAuthUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [connTesting, setConnTesting] = useState(false)
  const [connResult, setConnResult] = useState(null)
  const [tokens, setTokens] = useState(getTokenStats())
  const [serviceKeyMissing, setServiceKeyMissing] = useState(false)

  useEffect(() => {
    if (!isAdmin) return

    // Load accounts via service-role API (works with RLS enabled)
    const accountsPromise = fetch('/api/admin-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).then(r => r.json()).then(res => {
      if (res.error) { showToast('Failed to load accounts: ' + res.error, 'error'); return [] }
      return res.rows || []
    }).catch(() => [])

    // Load auth users via admin API (shows users with zero accounts too)
    const authPromise = fetch('/api/admin-users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).then(r => r.json()).then(res => {
      if (res.error) {
        if (res.error.includes('SUPABASE_SERVICE_KEY')) setServiceKeyMissing(true)
        return []
      }
      return res.users || []
    }).catch(() => [])

    Promise.all([accountsPromise, authPromise]).then(([rows, users]) => {
      setAllRows(rows)
      setAuthUsers(users)
      setLoading(false)
    })
  }, [isAdmin])

  useEffect(() => {
    const interval = setInterval(() => setTokens(getTokenStats()), 5000)
    return () => clearInterval(interval)
  }, [])

  if (!isAdmin) return (
    <div className="main-content">
      <div style={{ color: '#6b7280' }}>Admin access required.</div>
    </div>
  )

  // ── Build per-user data from accounts table ───────────────────
  const byUser = {}
  allRows.forEach(row => {
    const uid = row.user_id
    const d = row.data || {}
    if (!byUser[uid]) byUser[uid] = { uid, accounts: [], lastAccountUpdate: row.updated_at }
    byUser[uid].accounts.push({ ...d, _updated: row.updated_at, _created: row.created_at })
    if (row.updated_at > byUser[uid].lastAccountUpdate) byUser[uid].lastAccountUpdate = row.updated_at
  })

  // ── Merge auth users with account data ────────────────────────
  // Auth users is the source of truth for who exists
  const users = authUsers.map(au => {
    const accData = byUser[au.id] || { accounts: [], lastAccountUpdate: null }
    return {
      ...au,
      accounts: accData.accounts,
      lastAccountUpdate: accData.lastAccountUpdate,
      // Last active = most recent of: last sign-in OR last account update
      lastActive: [au.last_sign_in_at, accData.lastAccountUpdate].filter(Boolean).sort().reverse()[0] || au.created_at,
    }
  })

  // If auth API failed/missing key, fall back to deriving users from accounts only
  const usersFromAccounts = authUsers.length === 0
    ? Object.values(byUser).map(u => ({
        id: u.uid,
        email: u.accounts[0]?.userEmail || u.uid.slice(0, 8) + '...',
        accounts: u.accounts,
        created_at: null,
        last_sign_in_at: null,
        lastActive: u.lastAccountUpdate,
        lastAccountUpdate: u.lastAccountUpdate,
        confirmed_at: null,
        provider: '—',
      }))
    : []

  const allUsers = (users.length > 0 ? users : usersFromAccounts)
    .sort((a, b) => (b.lastActive || '').localeCompare(a.lastActive || ''))

  const totalAccounts = allRows.length
  const totalSignals = allRows.reduce((s, r) => s + (r.data?.signals || []).length, 0)
  const totalActivities = allRows.reduce((s, r) => s + (r.data?.activities || []).length, 0)
  const totalCoachSessions = allRows.reduce((s, r) => s + (r.data?.coach_sessions || []).length, 0)

  // Activity feed
  const allActivities = []
  allRows.forEach(row => {
    const d = row.data || {}
    ;(d.activities || []).forEach(act => {
      allActivities.push({ ...act, _userEmail: d.userEmail || '?', _accountName: d.name || '?' })
    })
  })
  allActivities.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const recentActivities = allActivities.slice(0, 50)

  // Signal library
  const allSignals = []
  allRows.forEach(row => {
    const d = row.data || {}
    ;(d.signals || []).forEach(sig => {
      allSignals.push({ ...sig, _userEmail: d.userEmail || '?', _accountName: d.name || '?' })
    })
  })
  allSignals.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const recentSignals = allSignals.slice(0, 60)

  const cost = tokens ? ((tokens.input * 3 + tokens.output * 15) / 1000000).toFixed(4) : '0.0000'

  const testConnection = async () => {
    setConnTesting(true); setConnResult(null)
    const results = []
    const test = async (name, fn) => {
      try { const r = await fn(); results.push({ name, ok: r.ok, status: r.status }) }
      catch (e) { results.push({ name, ok: false, status: e.message }) }
    }
    await test('Anthropic API', () => fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }) }))
    await test('Serper (Google)', () => fetch('/api/serper', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'test' }) }))
    await test('Tavily', () => fetch('/api/tavily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'test', max_results: 1 }) }))
    await test('Hunter.io', () => fetch('/api/hunter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'test' }) }))
    await test('Admin users API', () => fetch('/api/admin-users', { method: 'POST', headers: { 'Content-Type': 'application/json' } }))
    setConnResult(results); setConnTesting(false)
  }

  // ── User drill-down ───────────────────────────────────────────
  if (selectedUser) {
    const u = allUsers.find(x => x.id === selectedUser)
    if (!u) return null
    const allSessions = []
    u.accounts.forEach(acc => {
      ;(acc.coach_sessions || []).forEach(s => allSessions.push({ ...s, _account: acc.name || '?' }))
    })
    allSessions.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

    const allUserSignals = []
    u.accounts.forEach(acc => {
      ;(acc.signals || []).forEach(s => allUserSignals.push({ ...s, _account: acc.name || '?' }))
    })
    allUserSignals.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

    const allUserActs = []
    u.accounts.forEach(acc => {
      ;(acc.activities || []).forEach(a => allUserActs.push({ ...a, _account: acc.name || '?' }))
    })
    allUserActs.sort((a, b) => (b.date || '').localeCompare(a.date || ''))

    const sigCount = allUserSignals.length
    const actCount = allUserActs.length
    const coachCount = allSessions.length
    const leadsCount = u.accounts.filter(a => a._type === 'lead').length
    const dealsCount = u.accounts.filter(a => a._type === 'account').length

    return (
      <div className="main-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedUser(null)}>← Back</button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1f2937' }}>{u.email}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>
              Joined {fmtDateFull(u.created_at)}
              {u.last_sign_in_at && <> · Last sign-in {fmtDateFull(u.last_sign_in_at)}</>}
              {u.provider && u.provider !== '—' && <> · via {u.provider}</>}
            </div>
          </div>
        </div>

        {/* Usage summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 16 }}>
          {[
            ['Leads', leadsCount, '#BA7517'],
            ['Deal accounts', dealsCount, '#185FA5'],
            ['Signals', sigCount, '#0F6E56'],
            ['Activities', actCount, '#7C3AED'],
            ['Coach sessions', coachCount, '#A32D2D'],
          ].map(([label, val, color]) => (
            <div key={label} style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color }}>{val}</div>
            </div>
          ))}
        </div>

        {/* Recent AI coach sessions */}
        {allSessions.length > 0 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">AI Coach sessions ({coachCount})</div>
            {allSessions.slice(0, 10).map((s, i) => (
              <div key={i} style={{ padding: '10px 0', borderBottom: i < Math.min(allSessions.length, 10) - 1 ? '0.5px solid #f3f3f3' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>{fmtDate(s.date)}</span>
                  <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 20, background: '#e1f5ee', color: '#0F6E56', fontWeight: 500 }}>{s._account}</span>
                </div>
                <div style={{ fontSize: 12, color: '#374151', fontWeight: 500 }}>{s.prompt?.slice(0, 120)}{s.prompt?.length > 120 ? '…' : ''}</div>
                {s.response && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{s.response.slice(0, 160)}…</div>}
              </div>
            ))}
          </div>
        )}

        {/* Recent intelligence signals */}
        {allUserSignals.length > 0 && (
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-title">Intelligence sweeps / signals ({sigCount})</div>
            {allUserSignals.slice(0, 8).map((s, i) => {
              const p = s.priority || 'intel'
              return (
                <div key={i} style={{ padding: '8px 10px', borderRadius: 8, background: PRIORITY_BG[p] || '#f3f3f3', marginBottom: 6, border: '0.5px solid ' + (PRIORITY_COLORS[p] || '#e5e5e5') + '44' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLORS[p] || '#6b7280', textTransform: 'uppercase' }}>{p}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#1f2937' }}>{s.title}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{s._account} · {fmtDate(s.date)}</span>
                  </div>
                  {s.body && <div style={{ fontSize: 11, color: '#374151' }}>{s.body.slice(0, 160)}{s.body.length > 160 ? '…' : ''}</div>}
                </div>
              )
            })}
          </div>
        )}

        {/* Accounts list */}
        <div className="card">
          <div className="card-title">Accounts ({u.accounts.length})</div>
          {u.accounts.length === 0
            ? <div style={{ color: '#9ca3af', fontSize: 13 }}>No accounts yet — user signed up but hasn't added any leads.</div>
            : u.accounts.map((acc, i) => {
                const sigs = (acc.signals || []).length
                const acts = (acc.activities || []).length
                const cons = (acc.contacts || []).length
                const sessions = (acc.coach_sessions || []).length
                return (
                  <div key={i} style={{ padding: '12px 0', borderBottom: i < u.accounts.length - 1 ? '0.5px solid #f3f3f3' : 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{acc.name || 'Unnamed'}</span>
                          {acc._type === 'lead' && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: '#FAEEDA', color: '#BA7517', fontWeight: 500 }}>Lead</span>}
                          {acc.stage && acc._type !== 'lead' && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: '#e1f5ee', color: '#0F6E56', fontWeight: 500 }}>{STAGE_LABELS[acc.stage] || acc.stage}</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{[acc.industry, acc.location].filter(Boolean).join(' · ')}</div>
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'right', flexShrink: 0 }}>
                        {acc._updated && fmtDate(acc._updated)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 11, color: '#6b7280' }}>
                      <span>📡 {sigs} signal{sigs !== 1 ? 's' : ''}</span>
                      <span>📋 {acts} activit{acts !== 1 ? 'ies' : 'y'}</span>
                      <span>👤 {cons} contact{cons !== 1 ? 's' : ''}</span>
                      <span>🤖 {sessions} coach session{sessions !== 1 ? 's' : ''}</span>
                      {acc.dealValue && <span style={{ fontWeight: 600, color: '#1f2937' }}>${Number(acc.dealValue).toLocaleString()}</span>}
                    </div>
                  </div>
                )
              })
          }
        </div>
      </div>
    )
  }

  // ── Main admin view ───────────────────────────────────────────
  return (
    <div className="main-content">
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Admin</div>

      {serviceKeyMissing && (
        <div style={{ background: '#FAEEDA', border: '0.5px solid #BA7517', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#7A4A00' }}>
          ⚠️ <strong>SUPABASE_SERVICE_KEY</strong> is not set in your Vercel environment variables.
          Users with zero activity won't appear until this is added.
          Add it in Vercel → Settings → Environment Variables → <code>SUPABASE_SERVICE_KEY</code> = your Supabase service role key (from Supabase → Settings → API).
        </div>
      )}

      <div className="tabs" style={{ marginBottom: 20 }}>
        {TABS.map(t => (
          <button key={t.key} className={'tab-btn' + (tab === t.key ? ' active' : '')} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── USERS TAB ── */}
      {tab === 'users' && (
        <>
          {/* New users in last 24h banner */}
          {(() => {
            const newToday = allUsers.filter(u => u.created_at && Date.now() - new Date(u.created_at).getTime() < 86400000)
            if (!newToday.length) return null
            return (
              <div style={{ background: '#e1f5ee', border: '0.5px solid #9FE1CB', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 20 }}>🎉</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F6E56' }}>{newToday.length} new user{newToday.length !== 1 ? 's' : ''} in the last 24 hours</div>
                  <div style={{ fontSize: 12, color: '#0F6E56', opacity: 0.8 }}>{newToday.map(u => u.email).join(', ')}</div>
                </div>
                <a href="https://us.posthog.com" target="_blank" rel="noopener noreferrer" className="btn btn-sm" style={{ background: '#0F6E56', color: 'white', fontSize: 11 }}>View in PostHog →</a>
              </div>
            )
          })()}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total users', value: allUsers.length, color: '#0F6E56' },
              { label: 'Total accounts', value: totalAccounts, color: '#185FA5' },
              { label: 'Total signals', value: totalSignals, color: '#BA7517' },
              { label: 'Total activities', value: totalActivities, color: '#7C3AED' },
              { label: 'Coach sessions', value: totalCoachSessions, color: '#A32D2D' },
            ].map(m => (
              <div key={m.label} style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-title">All users ({allUsers.length})</div>
            {loading ? (
              <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid #e5e5e5' }}>
                    {['Email', 'Joined', 'Last sign-in', 'Leads', 'Deals', 'Signals', 'Coach', 'Status', 'PostHog', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: '#6b7280', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map(u => {
                    const sigCount = u.accounts.reduce((s, a) => s + (a.signals || []).length, 0)
                    const coachCount = u.accounts.reduce((s, a) => s + (a.coach_sessions || []).length, 0)
                    const leadsCount = u.accounts.filter(a => a._type === 'lead').length
                    const dealsCount = u.accounts.filter(a => a._type === 'account').length
                    const isNew = u.accounts.length === 0
                    return (
                      <tr key={u.id} style={{ borderBottom: '0.5px solid #f3f3f3', background: isNew ? '#FAFFF9' : 'transparent' }}>
                        <td style={{ padding: '10px 8px', color: '#1f2937', fontWeight: 500 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {u.email}
                            {isNew && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 20, background: '#e1f5ee', color: '#0F6E56', fontWeight: 600 }}>New</span>}
                          </div>
                        </td>
                        <td style={{ padding: '10px 8px', color: '#9ca3af', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(u.created_at)}</td>
                        <td style={{ padding: '10px 8px', color: u.last_sign_in_at ? '#374151' : '#d1d5db', fontSize: 12, whiteSpace: 'nowrap' }}>{fmtDate(u.last_sign_in_at)}</td>
                        <td style={{ padding: '10px 8px', color: leadsCount ? '#BA7517' : '#d1d5db', fontWeight: leadsCount ? 600 : 400 }}>{leadsCount || '—'}</td>
                        <td style={{ padding: '10px 8px', color: dealsCount ? '#185FA5' : '#d1d5db', fontWeight: dealsCount ? 600 : 400 }}>{dealsCount || '—'}</td>
                        <td style={{ padding: '10px 8px', color: sigCount ? '#0F6E56' : '#d1d5db', fontWeight: sigCount ? 600 : 400 }}>{sigCount || '—'}</td>
                        <td style={{ padding: '10px 8px', color: coachCount ? '#7C3AED' : '#d1d5db', fontWeight: coachCount ? 600 : 400 }}>{coachCount || '—'}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: u.confirmed_at ? '#e1f5ee' : '#f3f4f6', color: u.confirmed_at ? '#0F6E56' : '#9ca3af', fontWeight: 500 }}>
                            {u.confirmed_at ? '✓ Confirmed' : 'Unconfirmed'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <a href={`https://us.posthog.com/persons?search=${encodeURIComponent(u.email)}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#185FA5' }}>PostHog ↗</a>
                        </td>
                        <td style={{ padding: '10px 8px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedUser(u.id)}>View →</button>
                        </td>
                      </tr>
                    )
                  })}
                  {allUsers.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: 16, color: '#9ca3af', textAlign: 'center' }}>No users found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
          {/* Export buttons */}
          {!loading && (
            <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
              <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
                onClick={() => {
                  const leads = allRows.map(r => r.data).filter(d => d && d._type === 'lead')
                  exportAccountsCSV(leads, 'all-leads-' + new Date().toISOString().split('T')[0] + '.csv')
                }}>
                ↓ Export all leads CSV ({allRows.filter(r => r.data?._type === 'lead').length})
              </button>
              <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
                onClick={() => {
                  const deals = allRows.map(r => r.data).filter(d => d && d._type === 'account')
                  exportAccountsCSV(deals, 'all-deals-' + new Date().toISOString().split('T')[0] + '.csv')
                }}>
                ↓ Export all deals CSV ({allRows.filter(r => r.data?._type === 'account').length})
              </button>
              <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
                onClick={() => {
                  const headers = 'Email,Joined,Last Sign-in,Leads,Deals,Signals,Activities,Coach Sessions,Status'
                  const rows = allUsers.map(u => {
                    const sigCount = u.accounts.reduce((s, a) => s + (a.signals || []).length, 0)
                    const actCount = u.accounts.reduce((s, a) => s + (a.activities || []).length, 0)
                    const coachCount = u.accounts.reduce((s, a) => s + (a.coach_sessions || []).length, 0)
                    const leadsCount = u.accounts.filter(a => a._type === 'lead').length
                    const dealsCount = u.accounts.filter(a => a._type === 'account').length
                    const cells = [u.email, u.created_at ? new Date(u.created_at).toLocaleDateString('en-AU') : '', u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString('en-AU') : '', leadsCount, dealsCount, sigCount, actCount, coachCount, u.confirmed_at ? 'Confirmed' : 'Unconfirmed']
                    return cells.map(c => String(c).includes(',') ? '"' + c + '"' : c).join(',')
                  })
                  const csv = [headers, ...rows].join('\r\n')
                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const link = document.createElement('a')
                  link.href = url; link.download = 'users-' + new Date().toISOString().split('T')[0] + '.csv'
                  document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url)
                }}>
                ↓ Export users CSV ({allUsers.length})
              </button>
            </div>
          )}
        </>
      )}

      {/* ── ACTIVITY FEED TAB ── */}
      {tab === 'activity' && (
        <div className="card">
          <div className="card-title">Activity feed — last {recentActivities.length} across all users</div>
          {loading ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading...</div>
          ) : recentActivities.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>No activities yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {recentActivities.map((act, i) => (
                <div key={i} style={{ padding: '12px 0', borderBottom: i < recentActivities.length - 1 ? '0.5px solid #f3f3f3' : 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: actTypeColors[act.type] || '#9ca3af', marginTop: 5, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{act.title || act.type}</span>
                      <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 20, background: '#f3f3f3', color: '#6b7280', textTransform: 'capitalize' }}>{act.type}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                      <span style={{ color: '#0F6E56', fontWeight: 500 }}>{act._accountName}</span>
                      {' · '}{act._userEmail}
                      {act.date && ' · ' + fmtDate(act.date)}
                    </div>
                    {act.notes && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{act.notes}</div>}
                    {act.next && <div style={{ fontSize: 12, color: '#185FA5', marginTop: 2 }}>Next: {act.next}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SIGNAL LIBRARY TAB ── */}
      {tab === 'signals' && (
        <div className="card">
          <div className="card-title">Signal library — last {recentSignals.length} across all users</div>
          {loading ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading...</div>
          ) : recentSignals.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>No signals yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recentSignals.map((sig, i) => {
                const p = sig.priority || 'intel'
                return (
                  <div key={i} style={{ padding: '10px 12px', borderRadius: 10, background: PRIORITY_BG[p] || '#f3f3f3', border: '0.5px solid ' + (PRIORITY_COLORS[p] || '#e5e5e5') + '44' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLORS[p] || '#6b7280', textTransform: 'uppercase' }}>{p}</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{sig.title}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{sig._accountName} · {sig._userEmail} · {fmtDate(sig.date)}</span>
                    </div>
                    {sig.body && <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>{sig.body}</div>}
                    {sig.action && <div style={{ fontSize: 12, color: '#185FA5' }}>→ {sig.action}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DIAGNOSTICS TAB ── */}
      {tab === 'diagnostics' && (
        <>
          <div style={{ background: '#e1f5ee', border: '0.5px solid #9FE1CB', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#085041', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Today — AI token usage (this browser session)</div>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              {[
                ['AI calls', tokens?.calls ?? 0],
                ['Input tokens', (tokens?.input ?? 0).toLocaleString()],
                ['Output tokens', (tokens?.output ?? 0).toLocaleString()],
                ['Est. cost', '$' + cost],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: '#0F6E56', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#085041', marginTop: 2 }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#0F6E56', marginTop: 10, opacity: 0.7 }}>Sonnet 4 pricing ($3 / $15 per M tokens) · resets on page reload</div>
          </div>

          <div className="card">
            <div className="card-title">API Connection Test</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>Test all API integrations in one click — includes the new admin users endpoint.</div>
            <button className="btn btn-primary btn-sm" onClick={testConnection} disabled={connTesting}>
              {connTesting ? 'Testing...' : '▶ Run connection test'}
            </button>
            {connResult && (
              <div style={{ marginTop: 16 }}>
                {connResult.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', fontSize: 13, borderTop: i > 0 ? '0.5px solid #f3f3f3' : 'none' }}>
                    <span style={{ fontSize: 16 }}>{r.ok ? '✅' : '❌'}</span>
                    <span style={{ color: '#374151', fontWeight: 500, flex: 1 }}>{r.name}</span>
                    <span style={{ color: r.ok ? '#1D9E75' : '#A32D2D', fontSize: 12 }}>{r.ok ? 'OK' : r.status}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 10 }}>
                  {connResult.every(r => r.ok) ? '✅ All systems operational' : '⚠️ One or more APIs are failing — check your Vercel env vars.'}
                </div>
                {connResult.find(r => r.name === 'Admin users API' && !r.ok) && (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#BA7517', background: '#FAEEDA', borderRadius: 8, padding: '8px 12px' }}>
                    Admin users API failing → Add <strong>SUPABASE_SERVICE_KEY</strong> to Vercel env vars (Supabase → Settings → API → service_role key).
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
