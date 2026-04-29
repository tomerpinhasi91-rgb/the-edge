import { useState } from 'react'
import { useApp } from '../../lib/context'
import { loadProfile } from '../../lib/helpers'

const saveProfileToStorage = (userId, profile) => {
  try { localStorage.setItem('te_profile_' + userId, JSON.stringify(profile)) } catch (e) {}
}

const DEAL_SIZES = ['Under $10K', '$10K–$50K', '$50K–$150K', '$150K–$500K', '$500K+']

export default function OnboardingModal({ onDone }) {
  const { user } = useApp()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    firstName: '', lastName: '', company: '', jobTitle: '',
    whatYouSell: '', targetMarket: '', territory: '', typicalDealSize: '',
  })

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const save = () => {
    if (user?.id) {
      saveProfileToStorage(user.id, form)
    }
    // Mark onboarding as done — won't show again
    try { localStorage.setItem('te_onboarded_' + user?.id, '1') } catch (e) {}
    onDone()
  }

  const skip = () => {
    try { localStorage.setItem('te_onboarded_' + user?.id, '1') } catch (e) {}
    onDone()
  }

  const canNext1 = form.firstName.trim() && form.whatYouSell.trim()
  const canNext2 = form.targetMarket.trim()

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: 20
    }}>
      <div style={{
        background: 'white', borderRadius: 20, padding: '32px 28px',
        width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        position: 'relative'
      }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28, justifyContent: 'center' }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{
              width: n === step ? 24 : 8, height: 8, borderRadius: 4,
              background: n <= step ? '#0F6E56' : '#e5e5e5',
              transition: 'all 0.25s'
            }} />
          ))}
        </div>

        {/* ── Step 1 — Who are you ── */}
        {step === 1 && (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', marginBottom: 6 }}>Welcome to The Edge 👋</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 1.5 }}>
              Tell us about yourself so the AI can give you hyper-relevant research, coaching and outreach.
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>First name *</label>
                <input className="form-input" value={form.firstName} onChange={e => set('firstName', e.target.value)} placeholder="Tomer" autoFocus />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Last name</label>
                <input className="form-input" value={form.lastName} onChange={e => set('lastName', e.target.value)} placeholder="Smith" />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Your company</label>
              <input className="form-input" value={form.company} onChange={e => set('company', e.target.value)} placeholder="e.g. Select Equip" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Job title</label>
              <input className="form-input" value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder="e.g. Sales Manager" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>What do you sell? *</label>
              <input className="form-input" value={form.whatYouSell} onChange={e => set('whatYouSell', e.target.value)} placeholder="e.g. Industrial equipment hire to food manufacturers" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={skip} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>Skip for now</button>
              <button className="btn btn-primary" onClick={() => setStep(2)} disabled={!canNext1}>Next →</button>
            </div>
          </>
        )}

        {/* ── Step 2 — Who do you target ── */}
        {step === 2 && (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', marginBottom: 6 }}>Who do you sell to?</div>
            <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 24, lineHeight: 1.5 }}>
              This becomes your ICP — used to score prospects and sharpen every AI output.
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Target market / industries *</label>
              <input className="form-input" value={form.targetMarket} onChange={e => set('targetMarket', e.target.value)} placeholder="e.g. Food & Beverage, Agriculture, Logistics in SA/VIC" autoFocus />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Territory / region</label>
              <input className="form-input" value={form.territory} onChange={e => set('territory', e.target.value)} placeholder="e.g. South Australia, Victoria" />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Typical deal size</label>
              <select className="form-input" value={form.typicalDealSize} onChange={e => set('typicalDealSize', e.target.value)}>
                <option value="">Select…</option>
                {DEAL_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer' }}>← Back</button>
              <button className="btn btn-primary" onClick={() => setStep(3)} disabled={!canNext2}>Next →</button>
            </div>
          </>
        )}

        {/* ── Step 3 — Done ── */}
        {step === 3 && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>You're set up!</div>
              <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
                Your profile is saved. Every AI feature — research, coaching, outreach — will now be personalised to you and your market.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {[
                { emoji: '🎯', title: 'Find prospects', body: 'Lead Room → Prospect Finder — search your industry and get ICP-scored companies' },
                { emoji: '🔍', title: 'Research a company', body: 'Lead Room → Research — get signals, talking points and stakeholders in 30 seconds' },
                { emoji: '🤖', title: 'Get AI coaching', body: 'Open any lead or deal → AI Coach tab — full brief, call prep, outreach emails' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: '#f9fffe', border: '0.5px solid #9FE1CB', borderRadius: 10 }}>
                  <span style={{ fontSize: 20, flexShrink: 0 }}>{item.emoji}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F6E56', marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{item.body}</div>
                  </div>
                </div>
              ))}
            </div>

            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 14 }} onClick={save}>
              Let's go →
            </button>
          </>
        )}
      </div>
    </div>
  )
}
