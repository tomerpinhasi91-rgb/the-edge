import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://gevhkkgywtdqppsqnhqq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdldmhra2d5d3RkcXBwc3FuaHFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MDUyNzIsImV4cCI6MjA5MDA4MTI3Mn0.9f5P7Aky09i-Yt7zlxBVou4hh59tWf2OaClB-VFzLnY'

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true }
})

export const ADMIN_EMAIL = 'tomerpinhasi91@gmail.com'

export const uid = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)

export const db = {
  async loadAccounts(userId) {
    const { data, error } = await sb.from('accounts').select('*').eq('user_id', userId).order('updated_at', { ascending: false })
    if (error) throw error
    return (data || []).map(row => ({ ...row.data, id: row.data.id || row.id, _dbId: row.id }))
  },

  async saveAccount(userId, account) {
    const payload = { user_id: userId, data: account, updated_at: new Date().toISOString() }
    if (account._dbId) {
      const { error } = await sb.from('accounts').update(payload).eq('id', account._dbId)
      if (error) throw error
      return account._dbId
    } else {
      const { data, error } = await sb.from('accounts').insert({ ...payload, created_at: new Date().toISOString() }).select().single()
      if (error) throw error
      return data.id
    }
  },

  async deleteAccount(dbId) {
    const { error } = await sb.from('accounts').delete().eq('id', dbId)
    if (error) throw error
  }
}
