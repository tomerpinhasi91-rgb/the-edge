import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { sb, db, ADMIN_EMAIL, uid } from './supabase'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const isAdmin = user?.email === ADMIN_EMAIL

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: uid() })
    setTimeout(() => setToast(null), 3500)
  }, [])

  const loadAccounts = useCallback(async (userId) => {
    try {
      const data = await db.loadAccounts(userId)
      setAccounts(data)
    } catch (e) {
      showToast('Failed to load accounts', 'error')
    }
  }, [showToast])

  const saveAccount = useCallback(async (account) => {
    if (!user) throw new Error('Not logged in')
    const dbId = await db.saveAccount(user.id, account)
    await loadAccounts(user.id)
    return dbId
  }, [user, loadAccounts])

  const deleteAccount = useCallback(async (dbId) => {
    await db.deleteAccount(dbId)
    setAccounts(prev => prev.filter(a => a._dbId !== dbId))
  }, [])

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) loadAccounts(session.user.id)
      setLoading(false)
    })
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadAccounts(session.user.id)
      else setAccounts([])
    })
    return () => subscription.unsubscribe()
  }, [loadAccounts])

  const leads = accounts.filter(a => a._type === 'lead')
  const dealAccounts = accounts.filter(a => a._type === 'account')

  return (
    <AppContext.Provider value={{ user, accounts, leads, dealAccounts, isAdmin, loading, toast, showToast, saveAccount, deleteAccount, loadAccounts }}>
      {children}
    </AppContext.Provider>
  )
}
