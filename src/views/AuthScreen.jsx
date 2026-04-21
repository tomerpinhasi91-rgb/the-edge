import { useState } from 'react'
import { sb } from '../lib/supabase'
import { useApp } from '../lib/context'
import Spinner from '../components/ui/Spinner'

export default function AuthScreen() {
  const { showToast } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('signin')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    if (!email.trim() || !password.trim()) return showToast('Enter email and password', 'error')
    setLoading(true)
    try {
      if (mode === 'signin') {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await sb.auth.signUp({ email, password })
        if (error) throw error
        showToast('Account created — you are now signed in', 'success')
      }
    } catch (e) {
      showToast(e.message, 'error')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#f3f3f3', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 40, width: '100%', maxWidth: 400, border: '0.5px solid #e5e5e5' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, background: '#0F6E56', borderRadius: 12, marginBottom: 16 }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 16, letterSpacing: -0.5 }}>te</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, color: '#1f2937', marginBottom: 4 }}>the edge</div>
          <div style={{ fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Intelligence that closes deals</div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Email</label>
          <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} placeholder="you@company.com" autoFocus />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label className="form-label">Password</label>
          <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submit()} placeholder="••••••••" />
        </div>

        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '10px 0' }} onClick={submit} disabled={loading}>
          {loading ? <Spinner /> : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280' }}>
          {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            style={{ background: 'none', border: 'none', color: '#0F6E56', cursor: 'pointer', fontWeight: 500 }}>
            {mode === 'signin' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  )
}
