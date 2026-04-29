// ── Token tracking ───────────────────────────────────────────────
const loadTokens = () => {
  try {
    const s = localStorage.getItem('edge_tokens')
    if (s) {
      const p = JSON.parse(s)
      if (p.date === new Date().toISOString().split('T')[0]) return p
    }
  } catch (e) {}
  return { input: 0, output: 0, calls: 0, date: new Date().toISOString().split('T')[0] }
}
const saveTokens = (t) => {
  try { localStorage.setItem('edge_tokens', JSON.stringify(t)) } catch (e) {}
  window._edgeTokens = t
}
export const getTokenStats = () => window._edgeTokens || loadTokens()

// ── #8 Research cache (24h TTL) ──────────────────────────────────
const RC_PREFIX = 'te_rc_'
const RC_TTL    = 86400000 // 24h

export const getResearchCache = (key) => {
  try {
    const raw = localStorage.getItem(RC_PREFIX + key.toLowerCase().trim().replace(/\s+/g, '_'))
    if (!raw) return null
    const { data, ts } = JSON.parse(raw)
    if (Date.now() - ts > RC_TTL) return null
    return data
  } catch (e) { return null }
}
export const setResearchCache = (key, data) => {
  try {
    localStorage.setItem(
      RC_PREFIX + key.toLowerCase().trim().replace(/\s+/g, '_'),
      JSON.stringify({ data, ts: Date.now() })
    )
  } catch (e) {}
}

// ── #1 #6 Query pre-processor ────────────────────────────────────
// Enhances a raw query with year, location, and ICP context
export const buildSearchQuery = (rawQuery, profile = null, icp = null) => {
  if (!rawQuery) return rawQuery
  let q = rawQuery.trim()
  const year = new Date().getFullYear()

  // Add year if not already present
  if (!q.includes(String(year)) && !q.includes(String(year - 1))) q += ` ${year}`

  // Add "Australia" if not location-specific and profile is AU-based
  const hasLocation = /\b(australia|victoria|nsw|queensland|sa|wa|tasmania|nt|act|melbourne|sydney|brisbane|adelaide|perth)\b/i.test(q)
  if (!hasLocation) {
    const territory = profile?.territory || ''
    if (!territory || /australia/i.test(territory)) q += ' Australia'
  }

  // #6 Inject ICP industry hint into prospect searches (not company-specific searches)
  if (icp?.personas?.length) {
    const industries = icp.personas
      .flatMap(p => p.industries || [])
      .filter(Boolean)
      .slice(0, 2)
      .join(' ')
    if (industries && !q.toLowerCase().includes(industries.toLowerCase())) {
      // Only add industry if query is generic (not already a company name search)
      const wordCount = q.split(' ').length
      if (wordCount < 5) q += ` ${industries}`
    }
  }

  return q.trim()
}

// ── #2 #7 Context builder — dedup + trim ─────────────────────────
// Takes raw Serper + Tavily results → clean, deduplicated, trimmed context string
export const buildAIContext = (serperResult, tavilyResult, opts = {}) => {
  const {
    maxSnippet   = 160,  // chars per snippet
    maxNews      = 4,
    maxOrganic   = 4,
    maxTavily    = 3,
  } = opts

  const seenUrls    = new Set()
  const seenDomains = new Set()
  let context = ''

  const cleanSnip = (s) => (s || '').slice(0, maxSnippet).replace(/\s+/g, ' ').trim()
  const domainOf  = (url) => { try { return new URL(url).hostname.replace('www.', '') } catch (e) { return url } }

  // Knowledge Graph — highest signal
  const kg = serperResult?.knowledgeGraph
  if (kg?.title) {
    context += `OVERVIEW: ${kg.title}${kg.type ? ` (${kg.type})` : ''} — ${cleanSnip(kg.description)}\n\n`
  }

  // News — most recent, highest priority
  const news = (serperResult?.news || []).filter(n => n.title && n.snippet)
  const newsAdded = []
  for (const n of news) {
    if (newsAdded.length >= maxNews) break
    const domain = domainOf(n.link || '')
    if (seenUrls.has(n.link) || seenDomains.has(domain)) continue
    seenUrls.add(n.link); seenDomains.add(domain)
    newsAdded.push(`[${n.date || 'recent'}] ${n.title}: ${cleanSnip(n.snippet)}`)
  }
  if (newsAdded.length) context += `NEWS:\n${newsAdded.join('\n')}\n\n`

  // Web organic
  const organic = (serperResult?.organic || []).filter(r => r.title && r.snippet)
  const webAdded = []
  for (const r of organic) {
    if (webAdded.length >= maxOrganic) break
    const domain = domainOf(r.link || '')
    if (seenUrls.has(r.link) || seenDomains.has(domain)) continue
    seenUrls.add(r.link); seenDomains.add(domain)
    webAdded.push(`${r.title}: ${cleanSnip(r.snippet)}`)
  }
  if (webAdded.length) context += `WEB:\n${webAdded.join('\n')}\n\n`

  // Tavily — deduplicate against what Serper already returned
  const tavilyResults = (tavilyResult?.results || []).filter(r => r.title && r.content)
  const tavAdded = []
  for (const r of tavilyResults) {
    if (tavAdded.length >= maxTavily) break
    const domain = domainOf(r.url || '')
    if (seenUrls.has(r.url) || seenDomains.has(domain)) continue
    seenUrls.add(r.url); seenDomains.add(domain)
    tavAdded.push(`${r.title}: ${cleanSnip(r.content)}`)
  }
  if (tavAdded.length) context += `ADDITIONAL:\n${tavAdded.join('\n')}`

  return context.trim()
}

// ── #9 Core AI call (with optional model + haiku support) ─────────
export const callAI = async (system, messages, maxTokens = 800, useWebSearch = false, model = null) => {
  const body = {
    model: model || 'claude-sonnet-4-5',
    max_tokens: maxTokens,
    system,
    messages
  }
  if (useWebSearch) body.tools = [{ type: 'web_search_20250305', name: 'web_search' }]

  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API error ${res.status}`)
  }
  const data = await res.json()
  if (data.usage) {
    const t = loadTokens()
    t.input  += data.usage.input_tokens  || 0
    t.output += data.usage.output_tokens || 0
    t.calls  += 1
    t.date    = new Date().toISOString().split('T')[0]
    saveTokens(t)
  }
  return (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('')
}

// ── #11 Streaming AI call ────────────────────────────────────────
// onChunk(deltaText, fullTextSoFar) called for each streamed token
export const callAIStream = async (system, messages, maxTokens = 800, onChunk, model = null) => {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system, messages, max_tokens: maxTokens, model: model || 'claude-sonnet-4-5', stream: true })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `API error ${res.status}`)
  }

  const reader  = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = '', fullText = ''
  let inputTokens = 0, outputTokens = 0

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (!payload || payload === '[DONE]') continue
      try {
        const evt = JSON.parse(payload)
        // Collect token usage
        if (evt.type === 'message_start' && evt.message?.usage) {
          inputTokens = evt.message.usage.input_tokens || 0
        }
        if (evt.type === 'message_delta' && evt.usage) {
          outputTokens = evt.usage.output_tokens || 0
        }
        // Stream text
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
          const chunk = evt.delta.text || ''
          fullText += chunk
          onChunk(chunk, fullText)
        }
      } catch (e) {}
    }
  }

  // Track tokens
  if (inputTokens || outputTokens) {
    const t = loadTokens()
    t.input  += inputTokens
    t.output += outputTokens
    t.calls  += 1
    t.date    = new Date().toISOString().split('T')[0]
    saveTokens(t)
  }

  return fullText
}

// ── Serper search ────────────────────────────────────────────────
export const serperSearch = async (query, dateRestrict = true) => {
  const res = await fetch('/api/serper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, dateRestrict })
  })
  if (!res.ok) throw new Error('Serper search failed')
  return res.json()
}

// ── Tavily search ────────────────────────────────────────────────
export const tavilySearch = async (query, maxResults = 4) => {
  const res = await fetch('/api/tavily', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, max_results: maxResults })
  })
  if (!res.ok) throw new Error('Tavily search failed')
  return res.json()
}

// ── Hunter.io ────────────────────────────────────────────────────
export const hunterSearch = async (query) => {
  const res = await fetch('/api/hunter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  })
  if (!res.ok) throw new Error('Hunter search failed')
  return res.json()
}
export const hunterPersonEmail = async (firstName, lastName, domain) => {
  const res = await fetch('/api/hunter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'person', firstName, lastName, domain })
  })
  if (!res.ok) throw new Error('Hunter email finder failed')
  return res.json()
}

// ── #9 #12 Lead scoring ──────────────────────────────────────────
// Rule-based local scoring — zero tokens, instant (#12)
export const scoreLeadLocal = (lead) => {
  let score = 30 // base
  const signals = lead.signals || []
  const urgentCount  = signals.filter(s => s.priority === 'urgent').length
  const watchCount   = signals.filter(s => s.priority === 'watch').length
  const grantCount   = signals.filter(s => s.priority === 'grant').length
  score += Math.min(urgentCount * 20, 30)
  score += Math.min(watchCount  * 8,  16)
  score += Math.min(grantCount  * 10, 10)
  const contacts = lead.stakeholders || lead.contacts || []
  const hasEconBuyer = contacts.some(c => c.role_type === 'Economic Buyer')
  const hasChampion  = contacts.some(c => c.role_type === 'Champion')
  if (hasEconBuyer) score += 12
  if (hasChampion)  score += 8
  if (contacts.length > 0) score += 5
  if ((lead.talking_points || []).length >= 3) score += 5
  if (lead.industry) score += 3
  if (lead.size)     score += 2
  return Math.min(100, Math.max(0, Math.round(score)))
}

// AI-based scoring — use haiku (#9) for speed + cost
export const scoreLead = async (lead) => {
  const signals = (lead.signals || []).map(s => `[${s.priority}] ${s.title}`).join(', ')
  const contacts = (lead.stakeholders || lead.contacts || []).map(c => `${c.name} (${c.position || c.title || ''}, ${c.role_type || ''})`).join(', ')
  const prompt = 'B2B sales qualification expert. Score lead 0-100. Return ONLY valid JSON: {"score":<0-100>,"reasoning":"<2 sentences>"}\n\nExample: {"score":72,"reasoning":"Strong urgency signals and identified economic buyer. Company size and industry align well."}'
  const context = `Company: ${lead.name || ''}\nIndustry: ${lead.industry || ''}\nSize: ${lead.size || 'unknown'}\nSignals: ${signals || 'none'}\nContacts: ${contacts || 'none'}\nTalking points: ${(lead.talking_points || []).join('; ')}`
  try {
    // #9 use haiku — 5x cheaper for simple scoring task
    const raw = await callAI(prompt, [{ role: 'user', content: context }], 200, false, 'claude-haiku-4-5')
    const parsed = extractJSON(raw)
    if (parsed && typeof parsed.score === 'number') {
      return { score: Math.min(100, Math.max(0, Math.round(parsed.score))), reasoning: parsed.reasoning || '' }
    }
  } catch (e) {}
  return { score: scoreLeadLocal(lead), reasoning: 'Scored from signals and contacts.' }
}

// ── Search + structure (used by market intel) ────────────────────
export const searchAndStructure = async (query, prompt, maxResults = 4) => {
  const [serper, tavily] = await Promise.allSettled([
    serperSearch(query),
    tavilySearch(query, maxResults)
  ])
  const context = buildAIContext(
    serper.status  === 'fulfilled' ? serper.value  : null,
    tavily.status  === 'fulfilled' ? tavily.value  : null
  )
  if (context.length > 80) {
    return callAI(prompt, [{ role: 'user', content: 'Search data:\n\n' + context }], 900, false)
  }
  return callAI(prompt, [{ role: 'user', content: 'Find information about: ' + query }], 900, true)
}

// ── JSON extractors ──────────────────────────────────────────────
export const extractJSON = (raw) => {
  if (!raw) return null
  const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(clean) } catch (e) {}
  const start = clean.indexOf('{'), end = clean.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(clean.slice(start, end + 1)) } catch (e) {}
  }
  return null
}

export const extractSignals = (raw) => {
  if (!raw) return null
  const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try { const p = JSON.parse(clean); if (Array.isArray(p) && p.length) return p } catch (e) {}
  const as = clean.indexOf('['), ae = clean.lastIndexOf(']')
  if (as !== -1 && ae > as) {
    try { const p = JSON.parse(clean.slice(as, ae + 1)); if (Array.isArray(p)) return p } catch (e) {}
  }
  const objs = []; let depth = 0, os = -1
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === '{') { if (depth === 0) os = i; depth++ }
    else if (clean[i] === '}') { depth--; if (depth === 0 && os !== -1) { try { objs.push(JSON.parse(clean.slice(os, i + 1))) } catch (e) {} os = -1 } }
  }
  return objs.length ? objs : null
}
