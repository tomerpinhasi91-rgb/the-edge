import { useApp } from '../../lib/context'

export default function MobileNav({ view, setView, setActiveId, accounts }) {
  const { user, dealAccounts, isAdmin } = useApp()
  if (!user) return null

  const leads = accounts ? accounts.filter(a => a._type === 'lead') : []
  const deals = accounts ? accounts.filter(a => a._type === 'account') : []

  const items = [
    { key: 'leadroom', icon: '🔍', label: 'Research' },
    { key: 'lead',     icon: '📋', label: 'Leads',   badge: leads.length },
    { key: 'account',  icon: '💼', label: 'Deals',   badge: deals.length },
    { key: 'profile',  icon: '👤', label: 'Profile' },
  ]
  if (isAdmin) items.push({ key: 'admin', icon: '⚙️', label: 'Admin' })

  const handleClick = (key) => {
    if (key === 'lead') {
      if (leads.length) { setActiveId(leads[0].id); setView('lead') }
      else { setView('leadroom') }
    } else if (key === 'account') {
      if (deals.length) { setActiveId(deals[0].id); setView('account') }
      else { setView('new-account') }
    } else {
      setActiveId(null)
      setView(key)
    }
  }

  const isActive = (key) => {
    if (key === 'lead') return view === 'lead'
    if (key === 'account') return view === 'account' || view === 'new-account'
    return view === key
  }

  return (
    <div className="mobile-nav">
      {items.map(item => (
        <button
          key={item.key}
          onClick={() => handleClick(item.key)}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isActive(item.key) ? '#1D9E75' : 'rgba(255,255,255,0.45)',
            fontSize: 10,
            fontWeight: isActive(item.key) ? 600 : 400,
            padding: '6px 2px',
            position: 'relative',
          }}
        >
          {isActive(item.key) && (
            <div style={{ position: 'absolute', top: 4, left: '50%', transform: 'translateX(-50%)', width: 20, height: 2, borderRadius: 1, background: '#1D9E75' }} />
          )}
          <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
          <span style={{ letterSpacing: 0.2 }}>{item.label}</span>
          {item.badge > 0 && (
            <span style={{ position: 'absolute', top: 6, right: '18%', background: '#0078D4', color: 'white', fontSize: 9, fontWeight: 700, borderRadius: 8, padding: '1px 4px', lineHeight: 1.4 }}>{item.badge}</span>
          )}
        </button>
      ))}
    </div>
  )
}
