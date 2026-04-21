import { useApp } from '../../lib/context'
import { initials } from '../../lib/helpers'

export default function Sidebar({ view, setView, activeId, setActiveId }) {
  const { user, leads, dealAccounts, isAdmin } = useApp()

  const go = (v, id = null) => { setView(v); setActiveId(id) }

  return (
    <div className="sidebar">
      <div className="sidebar-top">
        <div className="logo">
          <div className="logo-mark">te</div>
          <span className="logo-name">the edge</span>
        </div>
        <div className="tagline">Intelligence that closes deals</div>

        {user && (
          <div className="nav">
            {isAdmin && (
              <button className={`nav-item${view === 'admin' ? ' active' : ''}`} onClick={() => go('admin')}>
                ⚙️ Admin view
              </button>
            )}
            <button className={`nav-item${view === 'leadroom' ? ' active' : ''}`}
              style={{ color: view === 'leadroom' ? '#F59E0B' : '', background: view === 'leadroom' ? 'rgba(245,158,11,0.1)' : '' }}
              onClick={() => go('leadroom')}>
              🎯 Lead Room
            </button>
            <button className={`nav-item${view === 'profile' ? ' active' : ''}`} onClick={() => go('profile')}>
              👤 My profile
            </button>
          </div>
        )}
      </div>

      {user && (
        <div className="sidebar-accounts">
          {/* Leads */}
          <div className="sidebar-section">
            <span style={{ color: '#F59E0B' }}>LEADS {leads.length > 0 && `(${leads.length})`}</span>
            <button style={{ background: 'none', border: 'none', fontSize: 11, color: '#F59E0B', cursor: 'pointer' }}
              onClick={() => go('leadroom')}>+ Find leads</button>
          </div>
          {leads.map(l => (
            <div key={l.id} className={`account-item${l.id === activeId && view === 'lead' ? ' active' : ''}`}
              onClick={() => go('lead', l.id)}>
              <div className="account-avatar" style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>{initials(l.name)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="account-name">{l.name}</div>
                <div className="account-meta">{l.industry}</div>
              </div>
            </div>
          ))}

          {/* Deal Accounts */}
          <div className="sidebar-section" style={{ marginTop: 8 }}>
            <span>DEAL ACCOUNTS</span>
          </div>
          {dealAccounts.map(a => (
            <div key={a.id} className={`account-item${a.id === activeId && view === 'account' ? ' active' : ''}`}
              onClick={() => go('account', a.id)}>
              <div className="account-avatar">{initials(a.name)}</div>
              <div style={{ minWidth: 0 }}>
                <div className="account-name">{a.name}</div>
                <div className="account-meta">{a.stage ? a.stage.charAt(0).toUpperCase() + a.stage.slice(1) : ''} · {a.location}</div>
              </div>
            </div>
          ))}

          <button className="add-account-btn" onClick={() => go('new-account')}>
            <span style={{ fontSize: 16 }}>+</span> Add account
          </button>
        </div>
      )}
    </div>
  )
}
