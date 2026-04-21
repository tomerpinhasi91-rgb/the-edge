import { useState } from 'react'
import { useApp } from '../lib/context'
import { uid } from '../lib/supabase'
import { callAI, serperSearch, tavilySearch, hunterSearch, extractJSON } from '../lib/ai'
import { isDemoUser, getDemoKey, DEMO_RESEARCH, DEMO_EMAILS, DEMO_PROSPECTS, delay } from '../lib/demo'
import { initials, cleanDomain } from '../lib/helpers'
import Spinner from '../components/ui/Spinner'

export default function LeadRoomView({ setView, setActiveId }) {
  const { user, leads, saveAccount, deleteAccount, showToast } = useApp()
  const [tab, setTab] = useState('prospect')
  const [researchQuery, setResearchQuery] = useState('')

  const TABS = [
    { key: 'prospect', label: '🎯 Prospect finder' },
    { key: 'research', label: '🔍 Company research' },
    { key: 'email', label: '✉ Email finder' },
    { key: 'saved', label: `📋 Saved leads${leads.length > 0 ? ' (' + leads.length + ')' : ''}` },
  ]

  return (
    <>
      <div className="topbar">
        <div style={{ fontSize: 17, fontWeight: 600 }}>Lead Room</div>
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setTab('saved')}>
          Saved leads ({leads.length})
        </button>
      </div>
      <div className="tabs">
        {TABS.map(t => <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>
      <div className="main-content">
        {tab === 'prospect' && <ProspectFinder user={user} showToast={showToast} setTab={setTab} setResearchQuery={setResearchQuery} />}
        {tab === 'research' && <CompanyResearch user={user} saveAccount={saveAccount} showToast={showToast} setActiveId={setActiveId} setView={setView} setTab={setTab} initialQuery={researchQuery} />}
        {tab === 'email' && <EmailFinder user={user} saveAccount={saveAccount} showToast={showToast} leads={leads} />}
        {tab === 'saved' && <SavedLeads leads={leads} deleteAccount={deleteAccount} setActiveId={setActiveId} setView={setView} showToast={showToast} />}
      </div>
    </>
  )
}

function ProspectFinder({ user, showToast, setTab, setResearchQuery }) {
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('Australia')
  const [loading, setLoading] = useState(false)
  const [prospects, setProspects] = useState([])
  const [status, setStatus] = useState('')

  const CHIPS = ['food manufacturers SA', 'cold chain logistics Adelaide', 'organic produce suppliers', 'packaging companies Melbourne', 'meat processors Queensland']

  const run = async () => {
    const cat = category.trim()
    const loc = location.trim() || 'Australia'
    if (!cat) return showToast('Enter what you are looking for', 'error')
    setLoading(true); setProspects([]); setStatus('Searching Google...')

    if (isDemoUser(user)) {
      await delay(1500)
      setProspects(DEMO_PROSPECTS)
      setStatus(`Found ${DEMO_PROSPECTS.length} companies matching "${cat}" in ${loc}`)
      setLoading(false); return
    }

    try {
      const [r1, r2] = await Promise.allSettled([serperSearch(cat + ' companies ' + loc), serperSearch(cat + ' manufacturers suppliers ' + loc)])
      const organic1 = r1.status === 'fulfilled' ? (r1.value.organic || []) : []
      const organic2 = r2.status === 'fulfilled' ? (r2.value.organic || []) : []
      const kg = r1.status === 'fulfilled' ? r1.value.knowledgeGraph : null
      const seen = new Set(); const found = []
      if (kg && kg.title && !seen.has(kg.title.toLowerCase())) { seen.add(kg.title.toLowerCase()); found.push({ name: kg.title, description: kg.description || '', website: kg.website || '', type: kg.type || '' }) }
      const SKIP = ['linkedin.com', 'yellowpages.com.au', 'truelocal.com.au', 'yelp.com', 'facebook.com', 'wikipedia.org', 'seek.com.au']
      ;[...organic1, ...organic2].forEach(r => {
        try {
          const domain = r.link ? new URL(r.link).hostname.replace('www.', '') : ''
          if (!domain || seen.has(domain) || SKIP.some(s => domain.includes(s))) return
          seen.add(domain)
          const name = r.title.replace(/ - .*$/, '').replace(/ \| .*$/, '').replace(/ – .*$/, '').trim()
          if (name.length < 2 || name.length > 60) return
          found.push({ name, description: r.snippet || '', website: 'https://' + domain })
        } catch (e) {}
      })
      setProspects(found.slice(0, 12))
      setStatus(found.length > 0 ? `Found ${Math.min(found.length, 12)} companies matching "${cat}" in ${loc}` : 'No companies found — try different keywords')
    } catch (e) { setStatus('Search failed: ' + e.message); showToast(e.message, 'error') }
    setLoading(false)
  }

  return (
    <div>
      <div className="ai-panel" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>Find companies by industry, product or service — get a list you can research and add to your pipeline</div>
        <div className="lr-search-row" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input className="form-input" style={{ flex: 2 }} placeholder="e.g. potato chip manufacturers, cold storage logistics, organic food distributors..." value={category} onChange={e => setCategory(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} autoFocus />
          <input className="form-input" style={{ width: 160 }} placeholder="Location e.g. Adelaide SA" value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} />
          <button className="btn btn-primary" onClick={run} disabled={loading}>{loading ? <><Spinner /> Searching…</> : 'Find companies'}</button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {CHIPS.map((s, i) => <button key={i} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => setCategory(s)}>{s}</button>)}
        </div>
        {status && <div style={{ fontSize: 12, marginTop: 8, color: prospects.length > 0 ? '#0F6E56' : '#9ca3af' }}>{status}</div>}
      </div>
      {prospects.map((p, i) => (
        <div key={i} style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#0F6E56', flexShrink: 0 }}>{initials(p.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{p.name}</div>
            {p.type && <div style={{ fontSize: 11, color: '#0F6E56', marginBottom: 2 }}>{p.type}</div>}
            {p.description && <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>{p.description.slice(0, 160)}{p.description.length > 160 ? '…' : ''}</div>}
            {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#185FA5' }}>{p.website.replace('https://', '')}</a>}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexDirection: 'column', alignItems: 'flex-end' }}>
            <button className="btn btn-primary btn-sm" onClick={() => { setResearchQuery(p.name); setTab('research'); }} style={{ fontSize: 11 }}>🔍 Research</button>
          </div>
        </div>
      ))}

    </div>
  )
}

function CompanyResearch({ user, saveAccount, showToast, setActiveId, setView, setTab, initialQuery }) {
  const [query, setQuery] = useState(initialQuery || '')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState(null)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)

  // Auto-run when coming from Prospect Finder
  useState(() => {
    if (initialQuery) {
      setTimeout(() => run(initialQuery, ''), 100)
    }
  })

  const run = async (q, loc) => {
    const name = (q || query).trim()
    const place = (loc || location).trim()
    if (!name) return showToast('Enter a company name', 'error')
    setLoading(true); setProfile(null); setStatus('Searching...')

    if (isDemoUser(user)) {
      await delay(1200)
      const key = getDemoKey(name)
      const match = Object.keys(DEMO_RESEARCH).find(k => key.includes(k) || k.includes(key))
      if (match) { setProfile(DEMO_RESEARCH[match]); setStatus('Found: ' + DEMO_RESEARCH[match].name) }
      else setStatus(`No demo profile for "${name}" — try Apex Protein Co, BlueCrest Logistics, Summit Packaging or Harvest Ridge Foods`)
      setLoading(false); return
    }

    try {
      const searchQuery = name + ' ' + place + ' company Australia 2026'
      const [serper, tavily] = await Promise.allSettled([serperSearch(searchQuery), tavilySearch(searchQuery, 5)])
      let context = ''
      if (serper.status === 'fulfilled') {
        const organic = serper.value.organic || [], news = serper.value.news || [], kg = serper.value.knowledgeGraph
        if (kg) context += `KNOWLEDGE GRAPH: ${kg.title} — ${kg.description || ''}\n\n`
        if (organic.length) context += 'WEB:\n' + organic.slice(0, 5).map(r => `${r.title}: ${(r.snippet || '').slice(0, 300)}\nURL: ${r.link}`).join('\n\n') + '\n\n'
        if (news.length) context += 'NEWS:\n' + news.slice(0, 4).map(n => `${n.title} (${n.date || 'recent'}): ${n.snippet}\nURL: ${n.link}`).join('\n\n')
      }
      if (tavily.status === 'fulfilled') context += '\n\nADDITIONAL:\n' + (tavily.value.results || []).slice(0, 3).map(r => r.title + ': ' + (r.content || '').slice(0, 300)).join('\n\n')

      const prompt = `You are a B2B sales intelligence researcher. Based on the search data, build a comprehensive company profile for "${name}". Return ONLY a valid JSON object (no markdown): {"name":string,"industry":string,"location":string,"size":string,"website":string,"description":string,"signals":[{"priority":"urgent"|"watch"|"intel"|"grant","title":string,"body":string,"action":string,"source_url":string}],"contacts":[{"name":string,"title":string,"linkedin":string,"why_relevant":string}],"talking_points":[string,string,string]}.`
      const result = await callAI(prompt, [{ role: 'user', content: 'Search data:\n\n' + context }], 1200, false)
      const parsed = extractJSON(result)
      if (parsed && parsed.name) { setProfile(parsed); setStatus('Found: ' + parsed.name) }
      else { setStatus('Could not build profile — try a more specific search'); }
    } catch (e) { showToast(e.message, 'error'); setStatus('Search failed') }
    setLoading(false)
  }

  const saveLead = async () => {
    if (!profile || !saveAccount) return
    setSaving(true)
    try {
      const lead = { ...profile, id: uid(), _type: 'lead', savedAt: new Date().toISOString().split('T')[0], signals: (profile.signals || []).map(s => ({ ...s, id: uid(), date: new Date().toISOString().split('T')[0] })), contacts: (profile.contacts || []).map(c => ({ ...c, id: uid() })), activities: [], checklist: [], coach_sessions: [] }
      const dbId = await saveAccount(lead)
      showToast(profile.name + ' saved as lead', 'success')
      if (setActiveId) setActiveId(lead.id)
      if (setView) setView('lead')
    } catch (e) { showToast(e.message, 'error') }
    setSaving(false)
  }

  const HISTORY = ['Maggie Beer Holdings', 'Sundrop Farms', 'SA Potato Co', 'Beston Global']

  return (
    <div>
      {(
        <div className="ai-panel" style={{ marginBottom: 16 }}>
          <div className="lr-search-row" style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input className="form-input" style={{ flex: 1 }} placeholder="Company name e.g. Maggie Beer, Sundrop Farms..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} autoFocus />
            <input className="form-input" style={{ width: 140 }} placeholder="Location e.g. SA, WA" value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} />
            <button className="btn btn-primary" onClick={() => run()} disabled={loading}>{loading ? <><Spinner /> Researching…</> : 'Research'}</button>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {HISTORY.map((h, i) => <button key={i} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }} onClick={() => { setQuery(h); run(h) }}>{h}</button>)}
          </div>
          {status && <div style={{ fontSize: 12, marginTop: 8, color: profile ? '#0F6E56' : '#9ca3af' }}>{status}</div>}
        </div>
      )}

      {loading && !profile && (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '40px 20px', color: '#6b7280', fontSize: 13 }}>
          <Spinner dark /> Researching {query || initialQuery}...
        </div>
      )}

      {profile && (
        <div>
          {/* Profile header */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{profile.name}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{[profile.industry, profile.location, profile.size].filter(Boolean).join(' · ')}</div>
                {profile.website && <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#185FA5', display: 'block', marginTop: 4 }}>{profile.website}</a>}
              </div>
              {saveAccount && (
                <button className="btn btn-primary" onClick={saveLead} disabled={saving}>{saving ? 'Saving...' : '+ Save as lead'}</button>
              )}
            </div>
            {profile.description && <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginTop: 12, paddingTop: 12, borderTop: '0.5px solid #f3f3f3' }}>{profile.description}</div>}
          </div>

          {/* Signals */}
          {(profile.signals || []).length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <div className="card-title">Key signals</div>
              {(profile.signals || []).map((s, i) => (
                <div key={i} className={`signal-card ${s.priority}`} style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: s.priority === 'urgent' ? '#A32D2D' : s.priority === 'watch' ? '#BA7517' : s.priority === 'grant' ? '#0F6E56' : '#185FA5' }}>{s.title}</div>
                  <div style={{ fontSize: 12, color: '#374151', margin: '4px 0' }}>{s.body}</div>
                  <div style={{ fontSize: 12, color: '#0F6E56', fontWeight: 500 }}>→ {s.action}</div>
                </div>
              ))}
            </div>
          )}

          {/* Contacts + Talking points */}
          <div className="grid-2">
            {(profile.contacts || []).length > 0 && (
              <div className="card">
                <div className="card-title">Key contacts</div>
                {(profile.contacts || []).map((c, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: i < profile.contacts.length - 1 ? '0.5px solid #f3f3f3' : 'none' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#0F6E56', flexShrink: 0 }}>{initials(c.name)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{c.title}</div>
                      {c.why_relevant && <div style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>{c.why_relevant}</div>}
                      {c.linkedin && <a href={c.linkedin} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: '#185FA5' }}>LinkedIn</a>}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(profile.talking_points || []).length > 0 && (
              <div className="card">
                <div className="card-title">Talking points</div>
                {(profile.talking_points || []).map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: i < profile.talking_points.length - 1 ? '0.5px solid #f3f3f3' : 'none', fontSize: 12, color: '#374151', lineHeight: 1.5 }}>
                    <span style={{ color: '#1D9E75', fontWeight: 700, flexShrink: 0, fontSize: 10 }}>{String(i + 1).padStart(2, '0')}</span>
                    <span>{t}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function EmailFinder({ user, saveAccount, showToast, leads }) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [emails, setEmails] = useState([])
  const [org, setOrg] = useState('')
  const [pattern, setPattern] = useState('')
  const [status, setStatus] = useState('')

  const run = async (q) => {
    const searchQ = (q || query).trim()
    if (!searchQ) return showToast('Enter a company domain or name', 'error')
    setLoading(true); setEmails([]); setOrg(''); setPattern(''); setStatus('Searching Hunter.io...')

    if (isDemoUser(user)) {
      await delay(900)
      const key = getDemoKey(searchQ)
      const match = Object.keys(DEMO_EMAILS).find(k => key.includes(k) || k.includes(key) || searchQ.includes(k.split(' ')[0]))
      if (match) { const d = DEMO_EMAILS[match]; setEmails(d.emails); setPattern(d.pattern); setOrg(d.org); setStatus(d.emails.length + ' verified emails found') }
      else setStatus('No demo emails for this company — try BlueCrest, Apex, Summit or Harvest Ridge')
      setLoading(false); return
    }

    try {
      const data = await hunterSearch(searchQ)
      setEmails(data.emails || []); setOrg(data.organization || ''); setPattern(data.pattern || '')
      setStatus(data.emails?.length > 0 ? `${data.emails.length} emails found for ${data.organization || searchQ}` : 'No emails found — try the company domain instead')
    } catch (e) { showToast(e.message, 'error'); setStatus('Search failed') }
    setLoading(false)
  }

  const addContact = async (email, leadId) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return showToast('Select a lead to add to', 'error')
    const contact = { id: uid(), name: `${email.first_name} ${email.last_name}`, title: email.position || '', role: 'Influencer', email: email.value, emailConfidence: email.confidence, linkedin: email.linkedin_url || '', notes: '' }
    const contacts = [...(lead.contacts || []).filter(c => c.email !== email.value), contact]
    await saveAccount({ ...lead, contacts })
    showToast(`${contact.name} added to ${lead.name}`, 'success')
  }

  const CONF_COLOR = (n) => n >= 90 ? '#0F6E56' : n >= 70 ? '#BA7517' : '#A32D2D'

  return (
    <div>
      <div className="ai-panel" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10 }}>Hunter.io Email Finder — verified business emails with confidence score</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input className="form-input" style={{ flex: 1 }} placeholder="Company domain e.g. maggiebeer.com.au or company name" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && run()} autoFocus />
          <button className="btn btn-primary" onClick={() => run()} disabled={loading}>{loading ? <><Spinner /> Searching…</> : 'Find emails'}</button>
        </div>
        {status && <div style={{ fontSize: 12, marginTop: 8, color: emails.length > 0 ? '#0F6E56' : '#9ca3af' }}>{status}</div>}
        {pattern && <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>Email pattern: {pattern}</div>}
      </div>

      {emails.map((e, i) => (
        <div key={i} style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#e1f5ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#0F6E56', flexShrink: 0 }}>{initials(e.first_name + ' ' + e.last_name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{e.first_name} {e.last_name}</div>
            {e.position && <div style={{ fontSize: 11, color: '#6b7280' }}>{e.position}</div>}
            <div style={{ fontSize: 12, color: '#185FA5', marginTop: 2 }}>{e.value}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: CONF_COLOR(e.confidence) }}>{e.confidence}%</span>
            <a href={`mailto:${e.value}`} className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>Email</a>
            {e.linkedin_url && <a href={e.linkedin_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}>LinkedIn</a>}
          </div>
        </div>
      ))}
    </div>
  )
}

function SavedLeads({ leads, deleteAccount, setActiveId, setView, showToast }) {
  const openLead = (lead) => { setActiveId(lead.id); setView('lead') }
  const removeLead = async (lead) => {
    if (!window.confirm(`Remove ${lead.name}?`)) return
    await deleteAccount(lead._dbId)
    showToast('Lead removed', 'success')
  }

  if (leads.length === 0) return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af', fontSize: 13 }}>
      No saved leads yet — use Company Research to find and save leads
    </div>
  )

  return (
    <div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>{leads.length} saved lead{leads.length !== 1 ? 's' : ''}</div>
      {[...leads].sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || '')).map(l => (
        <div key={l.id} style={{ background: 'white', border: '0.5px solid #e5e5e5', borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 8, cursor: 'pointer' }} onClick={() => openLead(l)}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#BA7517', flexShrink: 0 }}>{initials(l.name)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{l.name}</div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>{l.industry} · {l.location}</div>
            {l.why && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{l.why.slice(0, 100)}{l.why.length > 100 ? '...' : ''}</div>}
            {(l.signals || []).length > 0 && (
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 6 }}>
                {(l.signals || []).slice(0, 3).map((s, i) => <span key={i} className={`badge badge-${s.priority}`}>{s.title?.slice(0, 40)}</span>)}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
            <button className="btn btn-primary btn-sm" onClick={() => openLead(l)} style={{ fontSize: 11 }}>Open</button>
            <button className="btn btn-danger btn-sm" onClick={() => removeLead(l)} style={{ fontSize: 11 }}>×</button>
          </div>
        </div>
      ))}
    </div>
  )
}
