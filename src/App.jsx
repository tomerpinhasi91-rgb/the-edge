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

// ── Empty state shown to brand-new users ─────────────────────────
function EmptyState({ setView }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '40px 24px' }}>
      <div style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        {/* Logo mark */}
        <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #0F6E56, #1D9E75)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'white', fontWeight: 700, fontSize: 20, letterSpacing: -0.5 }}>te</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>Welcome to the edge 👋</div>
        <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 32 }}>
          Your B2B sales intelligence platform. Find prospects, research companies, track deals and get AI coaching — all in one place.
        </div>

        {/* Two CTA cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
          <div
            onClick={() => setView('leadroom')}
            style={{ background: 'white', border: '1.5px solid #9FE1CB', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', textAlign: 'left', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,110,86,0.12)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>🎯</div>
              <div>
                <div style={{ fontWeight: 600, color: '#0F6E56', fontSize: 15, marginBottom: 3 }}>Start in Lead Room</div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>Find companies, research prospects and save leads to your pipeline</div>
              </div>
            </div>
          </div>

          <div
            onClick={() => setView('new-account')}
            style={{ background: 'white', border: '1.5px solid #e5e5e5', borderRadius: 14, padding: '18px 20px', cursor: 'pointer', textAlign: 'left' }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.06)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 28, flexShrink: 0 }}>💼</div>
              <div>
                <div style={{ fontWeight: 600, color: '#1f2937', fontSize: 15, marginBottom: 3 }}>Add a deal account</div>
                <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>Already working a deal? Add it and start tracking signals and activities</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 12, color: '#9ca3af' }}>Intelligence that closes deals ⚡</div>
      </div>
    </div>
  )
}

export default function App() {
  const { user, loading, accounts } = useApp()
  const [view, setViewRaw] = useState(getPersistedView)
  const [activeId, setActiveIdRaw] = useState(getPersistedActive)

  const setView = (v) => { setViewRaw(v); persistView(v) }
  const setActiveId = (id) => { setActiveIdRaw(id); persistActive(id) }

  const activeAccount = accounts.find(a => a.id === activeId && a._type === 'account')
  const activeLead = accounts.find(a => a.id === activeId && a._type === 'lead')

  // If persisted active is gone (deleted), reset to leadroom
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

  if (!user) return <><AuthScreen /><Toast /></>

  // ✅ New user empty state — no accounts AND on leadroom/default view
  const isNewUser = !loading && accounts.length === 0

  const renderMain = () => {
    if (view === 'leadroom') return <LeadRoomView setView={setView} setActiveId={setActiveId} />
    if (view === 'profile') return <ProfileView />
    if (view === 'admin') return <AdminView />
    if (view === 'new-account') return <NewAccountView onSave={(id) => { setActiveId(id); setView('account') }} onCancel={() => setView(isNewUser ? 'leadroom' : 'leadroom')} />
    if (view === 'account' && activeAccount) return <AccountView account={activeAccount} setView={setView} />
    if (view === 'lead' && activeLead) return <LeadView lead={activeLead} setView={setView} setActiveId={setActiveId} />
    // Fallback — show empty state for new users, Lead Room for returning users
    return isNewUser ? <EmptyState setView={setView} /> : <LeadRoomView setView={setView} setActiveId={setActiveId} />
  }

  return (
    <div className="app">
      <Sidebar view={view} setView={setView} activeId={activeId} setActiveId={setActiveId} />
      <div className="main">
        {/* Show empty state banner inline for new users on any non-setup view */}
        {isNewUser && view !== 'new-account' && view !== 'leadroom' && view !== 'profile' && view !== 'admin'
          ? <EmptyState setView={setView} />
          : renderMain()
        }
      </div>
      <MobileNav view={view} setView={setView} setActiveId={setActiveId} accounts={accounts} user={user} isAdmin={accounts.__isAdmin} />
      <Toast />
    </div>
  )
}
