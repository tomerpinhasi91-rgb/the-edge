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
      setView('account')
      if (dealAccounts.length) setActiveId(dealAccounts[0].id)
    } else {
      setView(key)
      setActiveId(null)
    }
  }

  const isActive = (key) => {
    if (key === 'account') return view === 'account'
    return view === key
  }

  return (
    <div className="mobile-nav">
      {items.map(item => (
        <button key={item.key} onClick={() => handleClick(item.key)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, background: 'none', border: 'none', cursor: 'pointer', color: isActive(item.key) ? '#1D9E75' : 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: isActive(item.key) ? 600 : 400, padding: '6px 0' }}>
          <span style={{ fontSize: 20 }}>{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  )
}
