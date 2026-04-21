import { useState } from 'react'
import { useApp } from '../../lib/context'
import { uid } from '../../lib/supabase'
import { STAGE_LABELS, RISK_COLORS, PRIORITY_COLORS, PRIORITY_BG } from '../../lib/helpers'

export default function DashboardTab({ account, onEdit }) {
  const { saveAccount, showToast } = useApp()
  const [checkItem, setCheckItem] = useState('')

  const save = (updates) => saveAccount({ ...account, ...updates })

  const toggleCheck = async (id) => {
    const checklist = (account.checklist || []).map(c => c.id === id ? { ...c, done: !c.done } : c)
    await save({ checklist })
  }

  const addCheck = async () => {
    if (!checkItem.trim()) return
    await save({ checklist: [...(account.checklist || []), { id: uid(), text: checkItem, done: false }] })
    setCheckItem('')
  }

  const deleteCheck = async (id) => {
    await save({ checklist: (account.checklist || []).filter(c => c.id !== id) })
  }

  const signals = account.signals || []
  const topSignals = signals.slice(0, 3)
  const urgentCount = signals.filter(s => s.priority === 'urgent').length
  const checklist = account.checklist || []
  const done = checklist.filter(c => c.done).length
  const pct = checklist.length > 0 ? Math.round((done / checklist.length) * 100) : 0

  // Deal overview rows — only render rows that have data
  const overviewRows = [
    ['Opportunity', account.opportunity],
    ['Primary contact', account.contact],
    ['Industry', account.industry],
    ['Location', account.location],
    ['Deal value', account.dealValue ? '$' + Number(account.dealValue).toLocaleString() : null],
    ['Timeline', account.timeline],
    ['Next meeting', account.nextMeeting],
    ['Competitors', account.competitors],
    ['Website', account.website],
  ].filter(([, v]) => v)

  return (
    <div className="main-content">

      {/* ── Metric cards row ── */}
      <div className="metrics-grid" style={{ marginBottom: 16 }}>
        {[
          { label: 'Stage', value: STAGE_LABELS[account.stage] || account.stage || '—' },
          { label: 'Deal value', value: account.dealValue ? '$' + Number(account.dealValue).toLocaleString() : '—' },
          { label: 'Risk', value: account.risk ? account.risk.charAt(0).toUpperCase() + account.risk.slice(1) : '—', color: RISK_COLORS[account.risk] },
          {
            label: 'Urgent signals',
            value: urgentCount,
            color: urgentCount > 0 ? '#A32D2D' : '#1f2937',
            bg: urgentCount > 0 ? '#FCEBEB' : undefined
          },
        ].map(({ label, value, color, bg }) => (
          <div key={label} style={{ background: bg || 'white', border: '0.5px solid ' + (bg ? '#F5C6C6' : '#e5e5e5'), borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: bg ? '#A32D2D' : '#6b7280', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: color || '#1f2937' }}>{value}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        {/* ── Left column ── */}
        <div>

          {/* Deal overview card */}
          {overviewRows.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div className="card-title" style={{ margin: 0 }}>Deal overview</div>
                <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={onEdit}>Edit</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '7px 16px', fontSize: 13 }}>
                {overviewRows.map(([label, value]) => (
                  <>
                    <span key={label + '_l'} style={{ color: '#9ca3af', fontWeight: 500, whiteSpace: 'nowrap' }}>{label}</span>
                    <span key={label + '_v'} style={{ color: '#374151' }}>
                      {label === 'Website'
                        ? <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: '#185FA5' }}>{value.replace(/^https?:\/\/(www\.)?/, '')}</a>
                        : value}
                    </span>
                  </>
                ))}
              </div>
            </div>
          )}

          {/* Win strategy */}
          {account.strategy && (
            <div className="card">
              <div className="card-title">Win strategy</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{account.strategy}</div>
            </div>
          )}

          {/* Talking points */}
          {(account.talking_points || []).length > 0 && (
            <div className="card">
              <div className="card-title">Talking points</div>
              {(account.talking_points || []).map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: 13, color: '#374151', lineHeight: 1.5, paddingBottom: 10, borderBottom: i < account.talking_points.length - 1 ? '0.5px solid #f3f3f3' : 'none' }}>
                  <span style={{ color: '#1D9E75', fontWeight: 700, flexShrink: 0, fontSize: 11 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          )}

          {/* Key signals */}
          {topSignals.length > 0 && (
            <div className="card">
              <div className="card-title">Key signals</div>
              {topSignals.map(s => (
                <div key={s.id || s.title} className={'signal-card ' + s.priority} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_COLORS[s.priority], marginBottom: 3 }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>{s.action}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right column ── */}
        <div>

          {/* Next meeting */}
          {account.nextMeeting && (
            <div className="card" style={{ background: '#E6F1FB', borderColor: '#B5D4F4' }}>
              <div className="card-title" style={{ color: '#185FA5' }}>Next meeting</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#0C447C' }}>{account.nextMeeting}</div>
            </div>
          )}

          {/* Checklist with progress bar */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: checklist.length > 0 ? 8 : 12 }}>
              <div className="card-title" style={{ margin: 0 }}>Checklist</div>
              <div style={{ fontSize: 11, color: '#6b7280' }}>{done}/{checklist.length}</div>
            </div>

            {/* Progress bar */}
            {checklist.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ height: 5, borderRadius: 3, background: '#e5e5e5', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: pct + '%',
                    background: pct === 100 ? '#1D9E75' : '#0F6E56',
                    borderRadius: 3,
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                <div style={{ fontSize: 10, color: pct === 100 ? '#1D9E75' : '#9ca3af', marginTop: 4, textAlign: 'right' }}>
                  {pct === 100 ? '✅ All done!' : pct + '% complete'}
                </div>
              </div>
            )}

            {checklist.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '0.5px solid #f9f9f9' }}>
                <input type="checkbox" checked={c.done} onChange={() => toggleCheck(c.id)} style={{ accentColor: '#0F6E56', width: 14, height: 14, cursor: 'pointer', flexShrink: 0 }} />
                <span style={{ fontSize: 13, color: c.done ? '#9ca3af' : '#374151', textDecoration: c.done ? 'line-through' : 'none', flex: 1 }}>{c.text}</span>
                <button onClick={() => deleteCheck(c.id)} style={{ background: 'none', border: 'none', color: '#d4d4d4', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <input className="form-input" style={{ fontSize: 12 }} placeholder="Add item..." value={checkItem}
                onChange={e => setCheckItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCheck()} />
              <button className="btn btn-secondary btn-sm" onClick={addCheck}>+</button>
            </div>
          </div>

          {/* About */}
          {account.description && (
            <div className="card">
              <div className="card-title">About</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{account.description}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
