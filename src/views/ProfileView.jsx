import { useState, useEffect } from 'react'
import { useApp } from '../lib/context'
import { sb, uid } from '../lib/supabase'
import { getTokenStats } from '../lib/ai'
import { initials, loadProfile } from '../lib/helpers'
import { loadICP, saveICP, EMPTY_ICP, EMPTY_PERSONA, ICP_SIZES } from '../lib/icp'

const DEAL_SIZES = ['Under $10K', '$10K–$50K', '$50K–$150K', '$150K–$500K', '$500K+']
const SALES_CYCLES = ['Under 1 month', '1–3 months', '3–6 months', '6–12 months', '12+ months']

const saveProfileToStorage = (userId, profile) => {
  try { localStorage.setItem('te_profile_' + userId, JSON.stringify(profile)) } catch (e) {}
}

const EMPTY_PROFILE = {
  firstName: '', lastName: '',
  mobile: '', officePhone: '',
  jobTitle: '', department: '', company: '', industry: '', territory: '', targetMarket: '',
  whatYouSell: '', typicalDealSize: '', averageSalesCycle: '',
}

// ── Persona Card sub-component ───────────────────────────────────
function PersonaCard({ persona, index, onChange, onRemove }) {
  const set = (k, v) => onChange({ ...persona, [k]: v })
  const PAIN_LAYERS = [
    ['painOperational', '⚙️ Operational pain', 'Day-to-day problems and friction they face...'],
    ['painStrategic',   '🎯 Strategic pain',   'Business goals being blocked or slowed...'],
    ['painPersonal',    '😓 Personal pain',    "What keeps them up at night personally..."],
    ['painFinancial',   '💰 Financial pain',   'Revenue lost or costs caused by this problem...'],
  ]
  return (
    <div className="card" style={{ border: '0.5px solid var(--color-primary-border)', background: '#F8FBFF', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div className="card-title" style={{ margin: 0, color: 'var(--color-primary)' }}>Persona {index + 1}</div>
        {onRemove && (
          <button className="btn btn-danger btn-sm" style={{ fontSize: 10 }} onClick={onRemove}>Remove</button>
        )}
      </div>

      <div className="form-group">
        <label className="form-label">Persona name</label>
        <input className="form-input" value={persona.name} onChange={e => set('name', e.target.value)}
          placeholder="e.g. Sales Manager at Mid-Market Manufacturer" />
      </div>

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Target job titles</label>
          <input className="form-input" value={persona.titles} onChange={e => set('titles', e.target.value)}
            placeholder="e.g. Sales Manager, Director of Sales" />
        </div>
        <div className="form-group">
          <label className="form-label">Company size (employees)</label>
          <select className="form-input" value={persona.size} onChange={e => set('size', e.target.value)}>
            <option value="">Any size</option>
            {ICP_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label className="form-label">Target industries</label>
          <input className="form-input" value={persona.industries} onChange={e => set('industries', e.target.value)}
            placeholder="e.g. Food Manufacturing, Agriculture, Logistics" />
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '14px 0 8px', borderTop: '0.5px solid var(--color-border)', paddingTop: 12 }}>
        4 Pain Layers
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {PAIN_LAYERS.map(([key, label, placeholder]) => (
          <div key={key} className="form-group" style={{ margin: 0 }}>
            <label className="form-label">{label}</label>
            <textarea className="form-input" value={persona[key]} onChange={e => set(key, e.target.value)}
              placeholder={placeholder} rows={2} style={{ minHeight: 'unset' }} />
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '14px 0 8px', borderTop: '0.5px solid var(--color-border)', paddingTop: 12 }}>
        Messaging for this persona
      </div>
      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Opening hook</label>
          <input className="form-input" value={persona.hook} onChange={e => set('hook', e.target.value)}
            placeholder="1-line opener that grabs their attention..." />
        </div>
        <div className="form-group">
          <label className="form-label">Core value proposition</label>
          <input className="form-input" value={persona.valueProposition} onChange={e => set('valueProposition', e.target.value)}
            placeholder="What you uniquely offer this persona..." />
        </div>
      </div>
    </div>
  )
}

export default function ProfileView() {
  const { user, showToast } = useApp()
  const [profile, setProfile] = useState(EMPTY_PROFILE)
  const [icp, setICP] = useState(EMPTY_ICP())
  const [activeTab, setActiveTab] = useState('profile')
  const [saving, setSaving] = useState(false)
  const [pwForm, setPwForm] = useState({ newPw: '', confirmPw: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [connTesting, setConnTesting] = useState(false)
  const [connResult, setConnResult] = useState(null)
  const [tokens, setTokens] = useState(getTokenStats())

  useEffect(() => {
    if (!user) return
    const saved = loadProfile(user.id)
    if (saved) setProfile({ ...EMPTY_PROFILE, ...saved })
    const savedICP = loadICP(user.id)
    if (savedICP) setICP(savedICP)
  }, [user])

  useEffect(() => {
    const interval = setInterval(() => setTokens(getTokenStats()), 5000)
    return () => clearInterval(interval)
  }, [])

  const set = (k, v) => setProfile(prev => ({ ...prev, [k]: v }))

  const saveProfile = async () => {
    setSaving(true)
    saveProfileToStorage(user.id, profile)
    await new Promise(r => setTimeout(r, 300))
    setSaving(false)
    showToast('Profile saved', 'success')
  }

  const saveIcpData = async () => {
    setSaving(true)
    saveICP(user.id, icp)
    await new Promise(r => setTimeout(r, 300))
    setSaving(false)
    showToast('ICP saved — Prospect Finder will now score companies', 'success')
  }

  const addPersona = () => {
    if (icp.personas.length >= 3) return
    setICP(prev => ({ ...prev, personas: [...prev.personas, EMPTY_PERSONA()] }))
  }

  const updatePersona = (index, updated) => {
    setICP(prev => ({ ...prev, personas: prev.personas.map((p, i) => i === index ? updated : p) }))
  }

  const removePersona = (index) => {
    setICP(prev => ({ ...prev, personas: prev.personas.filter((_, i) => i !== index) }))
  }

  const changePassword = async () => {
    if (!pwForm.newPw || !pwForm.confirmPw) return showToast('Enter both password fields', 'error')
    if (pwForm.newPw !== pwForm.confirmPw) return showToast('Passwords do not match', 'error')
    if (pwForm.newPw.length < 6) return showToast('Password must be at least 6 characters', 'error')
    setPwSaving(true)
    const { error } = await sb.auth.updateUser({ password: pwForm.newPw })
    setPwSaving(false)
    if (error) return showToast(error.message, 'error')
    showToast('Password updated', 'success')
    setPwForm({ newPw: '', confirmPw: '' })
  }

  const signOut = async () => { await sb.auth.signOut() }

  const testConnection = async () => {
    setConnTesting(true); setConnResult(null)
    const results = []
    const test = async (name, fn) => {
      try { const r = await fn(); results.push({ name, ok: r.ok, status: r.status }) }
      catch (e) { results.push({ name, ok: false, status: e.message }) }
    }
    await test('Anthropic API', () => fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'claude-sonnet-4-5', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] }) }))
    await test('Serper (Google)', () => fetch('/api/serper', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'test' }) }))
    await test('Tavily', () => fetch('/api/tavily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'test', max_results: 1 }) }))
    await test('Hunter.io', () => fetch('/api/hunter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: 'test' }) }))
    setConnResult(results); setConnTesting(false)
  }

  const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
  const avatarInitials = displayName ? initials(displayName) : (user?.email?.[0] || '?').toUpperCase()
  const cost = tokens ? ((tokens.input * 3 + tokens.output * 15) / 1000000).toFixed(4) : '0.0000'

  const PROFILE_TABS = [
    { key: 'profile', label: 'Profile' },
    { key: 'icp', label: '🎯 ICP' },
    { key: 'security', label: 'Security' },
    { key: 'diagnostics', label: 'Diagnostics' },
  ]

  return (
    <div className="main-content">
      <div style={{ maxWidth: 620 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: 18, flexShrink: 0
          }}>
            {avatarInitials}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {displayName || 'My profile'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>{user?.email}</div>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={signOut}>Sign out</button>
        </div>

        {/* Sub-tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          {PROFILE_TABS.map(t => (
            <button key={t.key} className={'tab-btn' + (activeTab === t.key ? ' active' : '')} onClick={() => setActiveTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <>
            <div style={{ background: 'var(--color-primary-light)', border: '0.5px solid var(--color-primary-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--color-primary)' }}>
              <strong>🤖 AI Coach uses this profile</strong> — your role, what you sell, territory and deal size are injected into every AI Coach session to personalise responses.
            </div>

            <div className="card">
              <div className="card-title">Personal info</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">First name</label>
                  <input className="form-input" value={profile.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Your first name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Last name</label>
                  <input className="form-input" value={profile.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Your last name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile</label>
                  <input className="form-input" value={profile.mobile} onChange={e => set('mobile', e.target.value)} placeholder="+61 4XX XXX XXX" />
                </div>
                <div className="form-group">
                  <label className="form-label">Office phone</label>
                  <input className="form-input" value={profile.officePhone} onChange={e => set('officePhone', e.target.value)} placeholder="+61 8 XXXX XXXX" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Work info</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Job title</label>
                  <input className="form-input" value={profile.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder="e.g. Sales Manager" />
                </div>
                <div className="form-group">
                  <label className="form-label">Department</label>
                  <input className="form-input" value={profile.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Sales" />
                </div>
                <div className="form-group">
                  <label className="form-label">Company</label>
                  <input className="form-input" value={profile.company} onChange={e => set('company', e.target.value)} placeholder="Your company name" />
                </div>
                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <input className="form-input" value={profile.industry} onChange={e => set('industry', e.target.value)} placeholder="e.g. Manufacturing, SaaS, Logistics" />
                </div>
                <div className="form-group">
                  <label className="form-label">Territory / Region</label>
                  <input className="form-input" value={profile.territory} onChange={e => set('territory', e.target.value)} placeholder="e.g. NSW, ANZ, Southeast Asia" />
                </div>
                <div className="form-group">
                  <label className="form-label">Target market</label>
                  <input className="form-input" value={profile.targetMarket} onChange={e => set('targetMarket', e.target.value)} placeholder="e.g. Mid-market manufacturers, enterprise retail" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-title">Sales context <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>— used by AI Coach</span></div>
              <div className="form-grid">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">What you sell</label>
                  <textarea className="form-input" value={profile.whatYouSell}
                    onChange={e => set('whatYouSell', e.target.value)}
                    placeholder="Describe what you sell, key products or solutions, and who your customers are"
                    rows={3} />
                </div>
                <div className="form-group">
                  <label className="form-label">Typical deal size</label>
                  <select className="form-input" value={profile.typicalDealSize} onChange={e => set('typicalDealSize', e.target.value)}>
                    <option value="">Select...</option>
                    {DEAL_SIZES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Average sales cycle</label>
                  <select className="form-input" value={profile.averageSalesCycle} onChange={e => set('averageSalesCycle', e.target.value)}>
                    <option value="">Select...</option>
                    {SALES_CYCLES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 0' }} onClick={saveProfile} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save profile'}
            </button>
          </>
        )}

        {/* ── ICP TAB — Stage 3 ── */}
        {activeTab === 'icp' && (
          <>
            <div style={{ background: 'var(--color-primary-light)', border: '0.5px solid var(--color-primary-border)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: 'var(--color-primary)' }}>
              <strong>🎯 Your Ideal Customer Profile</strong> — define exactly who you target. The app then scores every prospect, generates targeted messaging, and focuses all AI responses on the right buyers. Up to 3 personas.
            </div>

            {/* Global target settings */}
            <div className="card">
              <div className="card-title">Target market</div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Target geography</label>
                  <input className="form-input" value={icp.targetGeography}
                    onChange={e => setICP(p => ({ ...p, targetGeography: e.target.value }))}
                    placeholder="e.g. Australia, NSW, ANZ" />
                </div>
                <div className="form-group">
                  <label className="form-label">Target company revenue</label>
                  <input className="form-input" value={icp.targetRevenue}
                    onChange={e => setICP(p => ({ ...p, targetRevenue: e.target.value }))}
                    placeholder="e.g. $5M–$50M annual revenue" />
                </div>
              </div>
            </div>

            {/* Personas */}
            {icp.personas.map((persona, i) => (
              <PersonaCard
                key={persona.id}
                persona={persona}
                index={i}
                onChange={(updated) => updatePersona(i, updated)}
                onRemove={icp.personas.length > 1 ? () => removePersona(i) : null}
              />
            ))}

            {icp.personas.length < 3 && (
              <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }} onClick={addPersona}>
                + Add persona ({icp.personas.length}/3)
              </button>
            )}

            {/* Messaging framework */}
            <div className="card">
              <div className="card-title">Messaging framework <span style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 400 }}>— used by AI Coach for email variants</span></div>
              <textarea className="form-input" value={icp.messagingFramework}
                onChange={e => setICP(p => ({ ...p, messagingFramework: e.target.value }))}
                placeholder="Describe your core message, unique angle, and what makes you different from competitors. e.g. 'We help food manufacturers reduce supplier complexity by 40% using AI-powered procurement intelligence. Unlike traditional CRMs, we focus on market timing rather than activity tracking.'"
                rows={4} />
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '11px 0' }} onClick={saveIcpData} disabled={saving}>
              {saving ? 'Saving...' : '💾 Save ICP'}
            </button>
          </>
        )}

        {/* ── SECURITY TAB ── */}
        {activeTab === 'security' && (
          <>
            <div className="card">
              <div className="card-title">Account</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                Signed in as <strong style={{ color: 'var(--color-text-primary)' }}>{user?.email}</strong>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={signOut}>Sign out</button>
            </div>

            <div className="card">
              <div className="card-title">Change password</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">New password</label>
                  <input className="form-input" type="password" value={pwForm.newPw}
                    onChange={e => setPwForm(p => ({ ...p, newPw: e.target.value }))}
                    placeholder="Min 6 characters" />
                </div>
                <div className="form-group">
                  <label className="form-label">Confirm new password</label>
                  <input className="form-input" type="password" value={pwForm.confirmPw}
                    onChange={e => setPwForm(p => ({ ...p, confirmPw: e.target.value }))}
                    placeholder="Repeat new password" />
                </div>
                <button className="btn btn-primary btn-sm" onClick={changePassword} disabled={pwSaving} style={{ alignSelf: 'flex-start' }}>
                  {pwSaving ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--color-primary-light)', border: '0.5px solid var(--color-primary-border)', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>My AI usage today</div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                {[
                  ['AI calls', tokens?.calls ?? 0],
                  ['Input tokens', (tokens?.input ?? 0).toLocaleString()],
                  ['Output tokens', (tokens?.output ?? 0).toLocaleString()],
                  ['Est. cost', '$' + cost],
                ].map(([label, val]) => (
                  <div key={label}>
                    <div style={{ fontSize: 10, color: 'var(--color-primary-dark)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-primary)', marginTop: 2 }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: 'var(--color-primary)', marginTop: 10, opacity: 0.7 }}>Resets daily at midnight</div>
            </div>
          </>
        )}

        {/* ── DIAGNOSTICS TAB ── */}
        {activeTab === 'diagnostics' && (
          <div className="card">
            <div className="card-title">Connection test</div>
            <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
              Having issues? Run this and send results to your admin.
            </div>
            <button className="btn btn-primary btn-sm" onClick={testConnection} disabled={connTesting}>
              {connTesting ? 'Testing...' : '▶ Run connection test'}
            </button>
            {connResult && (
              <div style={{ marginTop: 16 }}>
                {connResult.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', fontSize: 13, borderTop: i > 0 ? '0.5px solid var(--color-border)' : 'none' }}>
                    <span style={{ fontSize: 16 }}>{r.ok ? '✅' : '❌'}</span>
                    <span style={{ color: 'var(--color-text-primary)', fontWeight: 500, flex: 1 }}>{r.name}</span>
                    <span style={{ color: r.ok ? 'var(--color-success)' : 'var(--color-danger)', fontSize: 12 }}>{r.ok ? 'OK' : r.status}</span>
                  </div>
                ))}
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 10 }}>
                  {connResult.every(r => r.ok) ? '✅ All systems operational' : '⚠️ One or more APIs are failing — check Vercel env vars.'}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
