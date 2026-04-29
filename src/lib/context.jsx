import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { sb, db, uid } from './supabase'

const AppContext = createContext(null)
export const useApp = () => useContext(AppContext)

async function checkIsAdmin(email) {
  if (!email) return false
  try {
    const res = await fetch('/api/admin-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    })
    const data = await res.json()
    return !!data.isAdmin
  } catch {
    return false
  }
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)

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
    const accountWithEmail = { ...account, userEmail: user.email }

    // Optimistic update — sidebar reflects name change immediately
    setAccounts(prev => {
      if (account._dbId) {
        return prev.map(a => a._dbId === account._dbId ? { ...accountWithEmail, _dbId: account._dbId } : a)
      }
      return prev
    })

    const dbId = await db.saveAccount(user.id, accountWithEmail)
    await loadAccounts(user.id) // full refresh from DB
    return dbId
  }, [user, loadAccounts])

  const deleteAccount = useCallback(async (dbId) => {
    await db.deleteAccount(dbId)
    setAccounts(prev => prev.filter(a => a._dbId !== dbId))
  }, [])

  useEffect(() => {
    sb.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadAccounts(u.id)
        checkIsAdmin(u.email).then(setIsAdmin)
      }
      setLoading(false)
    })

    const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        loadAccounts(u.id)
        checkIsAdmin(u.email).then(setIsAdmin)
      } else {
        setAccounts([])
        setIsAdmin(false)
      }
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
