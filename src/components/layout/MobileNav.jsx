import { useApp } from '../../lib/context'

export default function MobileNav({ view, setView, setActiveId }) {
  const { user, dealAccounts, isAdmin } = useApp()
  if (!user) return null

  const items = [
    { key: 'leadroom', icon: '🎯', label: 'Leads' },
    { key: 'account', icon: '💼', label: 'Deals' },
    { key: 'profile', icon: '👤', label: 'Profile' },
  ]
  if (isAdmin) items.push({ key: 'admin', icon: '⚙️', label: 'Admin' })

  const handleClick = (key) => {
    if (key === 'account') {
      if (dealAccounts.length) {
        setActiveId(dealAccounts[0].id)
        setView('account')
      } else {
        setView('new-account')
      }
    } else {
      setActiveId(null)
      setView(key)
    }
  }

  const isActive = (key) => {
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
            gap: 3,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: isActive(item.key) ? '#1D9E75' : 'rgba(255,255,255,0.45)',
            fontSize: 10,
            fontWeight: isActive(item.key) ? 600 : 400,
            padding: '8px 4px',
            position: 'relative',
          }}
        >
          {/* Active indicator dot */}
          {isActive(item.key) && (
            <div style={{ position: 'absolute', top: 5, left: '50%', transform: 'translateX(-50%)', width: 20, height: 2, borderRadius: 1, background: '#1D9E75' }} />
          )}
          <span style={{ fontSize: 19, lineHeight: 1 }}>{item.icon}</span>
          <span style={{ letterSpacing: 0.2 }}>{item.label}</span>
        </button>
      ))}
    </div>
  )
}
