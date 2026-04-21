import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/context'
import { getTokenStats } from '../lib/ai'

export default function AdminView() {
  const { isAdmin, showToast } = useApp()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const tokens = getTokenStats()

  useEffect(() => {
    if (!isAdmin) return
    sb.from('accounts').select('user_id, data, updated_at').then(({ data }) => {
      if (!data) return
      const byUser = {}
      data.forEach(row => {
        const uid = row.user_id
        if (!byUser[uid]) byUser[uid] = { uid, email: row.data?.userEmail || uid.slice(0, 8) + '...', accounts: 0, signals: 0, activities: 0, last: row.updated_at }
        byUser[uid].accounts++
        byUser[uid].signals += (row.data?.signals || []).length
        byUser[uid].activities += (row.data?.activities || []).length
        if (row.updated_at > byUser[uid].last) byUser[uid].last = row.updated_at
      })
      setUsers(Object.values(byUser).sort((a, b) => b.last.localeCompare(a.last)))
      setLoading(false)
    })
  }, [isAdmin])

  if (!isAdmin) return <div className="main-content"><div style={{ color: '#6b7280' }}>Admin access required.</div></div>

  const cost = tokens ? ((tokens.input * 3 + tokens.output * 15) / 1000000).toFixed(4) : '0.0000'

  return (
    <div className="main-content">
      <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 20 }}>Admin view</div>

      {tokens && (
        <div style={{ background: '#e1f5ee', border: '0.5px solid #9FE1CB', borderRadius: 12, padding: '14px 18px', marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#085041', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Today token usage</div>
          <div style={{ display: 'flex', gap: 24 }}>
            {[['AI calls', tokens.calls], ['Input tokens', tokens.input?.toLocaleString()], ['Output tokens', tokens.output?.toLocaleString()], ['Est. cost', '$' + cost]].map(([label, val]) => (
              <div key={label}>
                <div style={{ fontSize: 10, color: '#0F6E56' }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#085041' }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#0F6E56', marginTop: 6, opacity: 0.7 }}>Sonnet 4 rates · resets daily</div>
        </div>
      )}

      <div className="card">
        <div className="card-title">Users ({users.length})</div>
        {loading ? <div style={{ color: '#9ca3af', fontSize: 13 }}>Loading...</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid #e5e5e5' }}>
                {['Email', 'Accounts', 'Signals', 'Activities', 'Last active'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.uid} style={{ borderBottom: '0.5px solid #f3f3f3' }}>
                  <td style={{ padding: '8px', color: '#374151' }}>{u.email}</td>
                  <td style={{ padding: '8px', color: '#6b7280' }}>{u.accounts}</td>
                  <td style={{ padding: '8px', color: '#6b7280' }}>{u.signals}</td>
                  <td style={{ padding: '8px', color: '#6b7280' }}>{u.activities}</td>
                  <td style={{ padding: '8px', color: '#9ca3af' }}>{new Date(u.last).toLocaleDateString('en-AU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
