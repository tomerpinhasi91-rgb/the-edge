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
  const [inlineError, setInlineError] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const submit = async () => {
    if (!email.trim() || !password.trim()) { setInlineError('Enter your email and password'); return }
    setLoading(true); setInlineError(''); setConfirmed(false)
    try {
      if (mode === 'signin') {
        const { error } = await sb.auth.signInWithPassword({ email, password })
        if (error) {
          if (error.message.toLowerCase().includes('invalid login')) setInlineError('Email or password is incorrect')
          else setInlineError(error.message)
        }
      } else {
        const { data, error } = await sb.auth.signUp({ email, password })
        if (error) {
          if (error.message.toLowerCase().includes('already registered') || error.status === 400) {
            setInlineError('This email is already registered — try signing in instead')
          } else {
            setInlineError(error.message)
          }
        } else if (data?.user && !data?.session) {
          // Email confirmation required
          setConfirmed(true)
        } else {
          showToast('Account created — welcome!', 'success')
        }
      }
    } catch (e) {
      setInlineError(e.message || 'Something went wrong — please try again')
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

        {confirmed && (
          <div style={{ background: '#e1f5ee', border: '0.5px solid #9FE1CB', borderRadius: 10, padding: '12px 14px', marginBottom: 16, fontSize: 13, color: '#0F6E56', lineHeight: 1.5 }}>
            ✅ Check your email — we sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
          </div>
        )}

        {inlineError && (
          <div style={{ background: '#FCEBEB', border: '0.5px solid #F5C6C6', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#A32D2D' }}>
            {inlineError}
            {inlineError.includes('already registered') && (
              <button onClick={() => { setMode('signin'); setInlineError('') }} style={{ display: 'block', marginTop: 6, background: 'none', border: 'none', color: '#185FA5', cursor: 'pointer', fontSize: 13, padding: 0 }}>
                → Switch to sign in
              </button>
            )}
          </div>
        )}

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
