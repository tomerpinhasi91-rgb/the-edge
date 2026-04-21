import { useState, useEffect } from 'react'
import { useApp } from './lib/context'
import Sidebar from './components/layout/Sidebar'
import MobileNav from './components/layout/MobileNav'
import Toast from './components/ui/Toast'
import AuthScreen from './views/AuthScreen'
import ProfileView from './views/ProfileView'
import AdminView from './views/AdminView'
import AccountView from './views/AccountView'
import LeadView from './views/LeadView'
import LeadRoomView from './views/LeadRoomView'
import NewAccountView from './views/NewAccountView'

const persistView = (v) => { try { localStorage.setItem('te_view', v) } catch (e) {} }
const getPersistedView = () => { try { return localStorage.getItem('te_view') || 'leadroom' } catch (e) { return 'leadroom' } }
const persistActive = (id) => { try { if (id) localStorage.setItem('te_active', id); else localStorage.removeItem('te_active') } catch (e) {} }
const getPersistedActive = () => { try { return localStorage.getItem('te_active') || null } catch (e) { return null } }

export default function App() {
  const { user, loading, accounts } = useApp()
  const [view, setViewRaw] = useState(getPersistedView)
  const [activeId, setActiveIdRaw] = useState(getPersistedActive)

  const setView = (v) => { setViewRaw(v); persistView(v) }
  const setActiveId = (id) => { setActiveIdRaw(id); persistActive(id) }

  // Find active account or lead
  const activeAccount = accounts.find(a => a.id === activeId && a._type === 'account')
  const activeLead = accounts.find(a => a.id === activeId && a._type === 'lead')

  // If persisted active is gone (deleted), reset
  useEffect(() => {
    if (activeId && accounts.length > 0 && !accounts.find(a => a.id === activeId)) {
      setActiveId(null)
      setView('leadroom')
    }
  }, [accounts, activeId])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#0F6E56', fontSize: 14 }}>
      Loading...
    </div>
  )

  if (!user) return <AuthScreen />

  const renderMain = () => {
    if (view === 'leadroom') return <LeadRoomView setView={setView} setActiveId={setActiveId} />
    if (view === 'profile') return <ProfileView />
    if (view === 'admin') return <AdminView />
    if (view === 'new-account') return <NewAccountView onSave={(id) => { setActiveId(id); setView('account') }} onCancel={() => setView('leadroom')} />
    if (view === 'account' && activeAccount) return <AccountView account={activeAccount} setView={setView} />
    if (view === 'lead' && activeLead) return <LeadView lead={activeLead} setView={setView} setActiveId={setActiveId} />
    // Fallback
    return <LeadRoomView setView={setView} setActiveId={setActiveId} />
  }

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} activeId={activeId} setActiveId={setActiveId} />
      <div className="main">
        {renderMain()}
      </div>
      <MobileNav view={view} setView={setView} setActiveId={setActiveId} />
      <Toast />
    </div>
  )
}
