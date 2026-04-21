import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/context'
import { getTokenStats } from '../lib/ai'
import { PRIORITY_COLORS, PRIORITY_BG, STAGE_LABELS } from '../lib/helpers'

const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'activity', label: 'Activity Feed' },
  { key: 'signals', label: 'Signal Library' },
  { key: 'diagnostics', label: 'Diagnostics' },
]

export default function AdminView() {
  const { isAdmin, showToast } = useApp()
  const [tab, setTab] = useState('users')
  const [allRows, setAllRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [connTesting, setConnTesting] = useState(false)
  const [connResult, setConnResult] = useState(null)
  const [tokens, setTokens] = useState(getTokenStats())

  useEffect(() => {
    if (!isAdmin) return
    sb.from('accounts').select('user_id, data, updated_at').then(({ data, error }) => {
      if (error) { showToast('Failed to load admin data', 'error'); return }
      setAllRows(data || [])
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

  // ── Derived data ──────────────────────────────────────────────
  const byUser = {}
  allRows.forEach(row => {
    const uid = row.user_id
    const d = row.data || {}
    if (!byUser[uid]) byUser[uid] = {
      uid,
      email: d.userEmail || uid.slice(0, 8) + '...',
      accounts: [],
      last: row.updated_at
    }
    byUser[uid].accounts.push({ ...d, _updated: row.updated_at })
    if (row.updated_at > byUser[uid].last) byUser[uid].last = row.updated_at
  })
  const users = Object.values(byUser).sort((a, b) => b.last.localeCompare(a.last))

  const totalAccounts = allRows.length
  const totalSignals = allRows.reduce((s, r) => s + (r.data?.signals || []).length, 0)
  const totalActivities = allRows.reduce((s, r) => s + (r.data?.activities || []).length, 0)

  // Activity feed — all activities across all users, sorted by date desc
  const allActivities = []
  allRows.forEach(row => {
    const d = row.data || {}
    ;(d.activities || []).forEach(act => {
      allActivities.push({ ...act, _userEmail: d.userEmail || '?', _accountName: d.name || '?' })
    })
  })
  allActivities.sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  const recentActivities = allActivities.slice(0, 50)

  // Signal library — all signals across all users
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
    setConnTesting(true)
    setConnResult(null)
    const results = []
    const test = async (name, fn) => {
      try { const r = await fn(); results.push({ name, ok: r.ok, status: r.status }) }
      catch (e) { results.push({ name, ok: false, status: e.message }) }
    }
    await test('Anthropic API', () => fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }) }))
    await test('Serper (Google)', () => fetch('/api/serper', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'test' }) }))
    await test('Tavily', () => fetch('/api/tavily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'test', max_results: 1 }) }))
    await test('Hunter.io', () => fetch('/api/hunter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'test' }) }))
    setConnResult(results)
    setConnTesting(false)
  }

  const actTypeColors = {
    call: '#1D9E75', meeting: '#185FA5', email: '#BA7517',
    note: '#6b7280', demo: '#7C3AED', proposal: '#0F6E56'
  }

  // ── User drill-down ───────────────────────────────────────────
  if (selectedUser) {
    const u = byUser[selectedUser]
    return (
      <div className="main-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedUser(null)}>← Back</button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#1f2937' }}>{u.email}</div>
            <div style={{ fontSize: 12, color: '#9ca3af' }}>{u.accounts.length} accounts · Last active {new Date(u.last).toLocaleDateString('en-AU')}</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {u.accounts.map((acc, i) => {
            const sigCount = (acc.signals || []).length
            const actCount = (acc.activities || []).length
            const conCount = (acc.contacts || []).length
            return (
              <div key={i} className="card" style={{ padding: '14px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: '#1f2937', fontSize: 14 }}>{acc.name || 'Unnamed'}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{[acc.industry, acc.location].filter(Boolean).join(' · ')}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {acc.stage && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#e1f5ee', color: '#0F6E56', fontWeight: 500 }}>
                        {STAGE_LABELS[acc.stage] || acc.stage}
                      </span>
                    )}
                    {acc._type === 'lead' && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#FAEEDA', color: '#BA7517', fontWeight: 500 }}>Lead</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 12 }}>
                  <span style={{ color: '#0F6E56' }}>📡 {sigCount} signal{sigCount !== 1 ? 's' : ''}</span>
                  <span style={{ color: '#185FA5' }}>📋 {actCount} activit{actCount !== 1 ? 'ies' : 'y'}</span>
                  <span style={{ color: '#6b7280' }}>👤 {conCount} contact{conCount !== 1 ? 's' : ''}</span>
                  {acc.dealValue && <span style={{ color: '#1f2937', fontWeight: 500 }}>${Number(acc.dealValue).toLocaleString()}</span>}
                </div>
              </div>
            )
          })}
          {u.accounts.length === 0 && (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>No accounts yet.</div>
          )}
        </div>
      </div>
    )
  }

  // ── Main admin view ───────────────────────────────────────────
  return (
    <div className="main-content">
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Admin</div>

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
          {/* Summary metric cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
            {[
              { label: 'Total users', value: users.length, color: '#0F6E56' },
              { label: 'Total accounts', value: totalAccounts, color: '#185FA5' },
              { label: 'Total signals', value: totalSignals, color: '#BA7517' },
              { label: 'Total activities', value: totalActivities, color: '#7C3AED' },
            ].map(m => (
              <div key={m.label} style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{m.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: m.color }}>{m.value}</div>
              </div>
            ))}
          </div>

          {/* User list */}
          <div className="card">
            <div className="card-title">Users ({users.length})</div>
            {loading ? (
              <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading...</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid #e5e5e5' }}>
                    {['Email', 'Accounts', 'Signals', 'Activities', 'Last active', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const sigCount = u.accounts.reduce((s, a) => s + (a.signals || []).length, 0)
                    const actCount = u.accounts.reduce((s, a) => s + (a.activities || []).length, 0)
                    return (
                      <tr key={u.uid} style={{ borderBottom: '0.5px solid #f3f3f3' }}>
                        <td style={{ padding: '10px 8px', color: '#374151', fontWeight: 500 }}>{u.email}</td>
                        <td style={{ padding: '10px 8px', color: '#6b7280' }}>{u.accounts.length}</td>
                        <td style={{ padding: '10px 8px', color: '#6b7280' }}>{sigCount}</td>
                        <td style={{ padding: '10px 8px', color: '#6b7280' }}>{actCount}</td>
                        <td style={{ padding: '10px 8px', color: '#9ca3af' }}>{new Date(u.last).toLocaleDateString('en-AU')}</td>
                        <td style={{ padding: '10px 8px' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedUser(u.uid)}>View →</button>
                        </td>
                      </tr>
                    )
                  })}
                  {users.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: 16, color: '#9ca3af', textAlign: 'center' }}>No users found.</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── ACTIVITY FEED TAB ── */}
      {tab === 'activity' && (
        <div className="card">
          <div className="card-title">Activity Feed — last {recentActivities.length} activities across all users</div>
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
                      {act.date && ' · ' + new Date(act.date).toLocaleDateString('en-AU')}
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
          <div className="card-title">Signal Library — last {recentSignals.length} signals across all users</div>
          {loading ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading...</div>
          ) : recentSignals.length === 0 ? (
            <div style={{ color: '#9ca3af', fontSize: 13 }}>No signals yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentSignals.map((sig, i) => {
                const p = sig.priority || 'intel'
                return (
                  <div key={i} style={{ padding: '12px 14px', borderRadius: 10, background: PRIORITY_BG[p] || '#f3f3f3', border: '0.5px solid ' + (PRIORITY_COLORS[p] || '#e5e5e5') + '44' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: PRIORITY_COLORS[p] || '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p}</span>
                      <span style={{ fontWeight: 600, fontSize: 13, color: '#1f2937' }}>{sig.title}</span>
                    </div>
                    {sig.body && <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>{sig.body}</div>}
                    <div style={{ fontSize: 11, color: '#9ca3af', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ color: '#0F6E56', fontWeight: 500 }}>{sig._accountName}</span>
                      <span>{sig._userEmail}</span>
                      {sig.date && <span>{new Date(sig.date).toLocaleDateString('en-AU')}</span>}
                      {sig.source && <span>via {sig.source}</span>}
                    </div>
                    {sig.action && <div style={{ fontSize: 12, color: '#185FA5', marginTop: 4 }}>Action: {sig.action}</div>}
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
          {/* Token usage card */}
          <div style={{ background: '#e1f5ee', border: '0.5px solid #9FE1CB', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#085041', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Today — AI token usage</div>
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
            <div style={{ fontSize: 11, color: '#0F6E56', marginTop: 10, opacity: 0.7 }}>Sonnet 4 pricing ($3 / $15 per M tokens) · resets daily at midnight</div>
          </div>

          {/* Connection test */}
          <div className="card">
            <div className="card-title">API Connection Test</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>Test all API integrations in one click.</div>
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
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
