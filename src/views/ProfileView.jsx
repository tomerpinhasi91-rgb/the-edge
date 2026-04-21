import { useState } from 'react'
import { useApp } from '../lib/context'
import { sb } from '../lib/supabase'
import { getTokenStats } from '../lib/ai'

export default function ProfileView() {
  const { user, isAdmin, showToast } = useApp()
  const [connTesting, setConnTesting] = useState(false)
  const [connResult, setConnResult] = useState(null)
  const tokens = getTokenStats()

  const signOut = async () => {
    await sb.auth.signOut()
  }

  const testConnection = async () => {
    setConnTesting(true)
    setConnResult(null)
    const results = []
    try {
      const r = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }) })
      results.push({ name: 'Anthropic API', ok: r.ok, status: r.status })
    } catch (e) { results.push({ name: 'Anthropic API', ok: false, status: e.message }) }
    try {
      const r = await fetch('/api/serper', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'test' }) })
      results.push({ name: 'Serper (Google)', ok: r.ok, status: r.status })
    } catch (e) { results.push({ name: 'Serper (Google)', ok: false, status: e.message }) }
    try {
      const r = await fetch('/api/tavily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'test', max_results: 1 }) })
      results.push({ name: 'Tavily', ok: r.ok, status: r.status })
    } catch (e) { results.push({ name: 'Tavily', ok: false, status: e.message }) }
    setConnResult(results)
    setConnTesting(false)
  }

  return (
    <div className="main-content">
      <div style={{ maxWidth: 520 }}>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>My profile</div>

        <div className="card">
          <div className="card-title">Account</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
            Signed in as <strong style={{ color: '#1f2937' }}>{user.email}</strong>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={signOut}>Sign out</button>
        </div>

        <div className="card">
          <div className="card-title">Connection test</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>Having issues? Run this and send the results to your admin.</div>
          <button className="btn btn-secondary btn-sm" onClick={testConnection} disabled={connTesting}>
            {connTesting ? 'Testing...' : '▶ Run connection test'}
          </button>
          {connResult && (
            <div style={{ marginTop: 12 }}>
              {connResult.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 13, borderTop: i > 0 ? '0.5px solid #f3f3f3' : 'none' }}>
                  <span>{r.ok ? '✅' : '❌'}</span>
                  <span style={{ color: '#374151' }}>{r.name}</span>
                  <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>{r.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
