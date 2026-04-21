// Token tracking
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

export const getTokenStats = () => {
  if (window._edgeTokens) return window._edgeTokens
  return loadTokens()
}

// Core AI call
export const callAI = async (system, messages, maxTokens = 800, useWebSearch = false) => {
  const body = {
    model: 'claude-sonnet-4-5',
    max_tokens: maxTokens,
    system,
    messages
  }
  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search' }]
  }

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

  // Track tokens
  if (data.usage) {
    const t = loadTokens()
    t.input += data.usage.input_tokens || 0
    t.output += data.usage.output_tokens || 0
    t.calls += 1
    t.date = new Date().toISOString().split('T')[0]
    saveTokens(t)
  }

  // Extract text from content blocks
  return (data.content || [])
    .filter(b => b.type === 'text')
    .map(b => b.text)
    .join('')
}

// Serper (Google results)
export const serperSearch = async (query) => {
  const res = await fetch('/api/serper', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  })
  if (!res.ok) throw new Error('Serper search failed')
  return res.json()
}

// Tavily search
export const tavilySearch = async (query, maxResults = 5) => {
  const res = await fetch('/api/tavily', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, max_results: maxResults })
  })
  if (!res.ok) throw new Error('Tavily search failed')
  return res.json()
}

// Hunter.io emails
export const hunterSearch = async (query) => {
  const res = await fetch('/api/hunter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  })
  if (!res.ok) throw new Error('Hunter search failed')
  return res.json()
}

// Search + structure with AI
export const searchAndStructure = async (query, prompt, maxResults = 5) => {
  const [serper, tavily] = await Promise.allSettled([
    serperSearch(query),
    tavilySearch(query, maxResults)
  ])

  let context = ''
  if (serper.status === 'fulfilled') {
    const news = serper.value.news || []
    const organic = serper.value.organic || []
    if (news.length) context += 'GOOGLE NEWS:\n' + news.slice(0, 5).map((n, i) => `[${i}] ${n.title} — ${n.date || 'recent'}: ${n.snippet} (${n.link})`).join('\n') + '\n\n'
    if (organic.length) context += 'WEB RESULTS:\n' + organic.slice(0, 4).map(r => `${r.title}: ${(r.snippet || '').slice(0, 200)}`).join('\n')
  }
  if (tavily.status === 'fulfilled') {
    context += '\nADDITIONAL:\n' + (tavily.value.results || []).slice(0, 3).map(r => `${r.title}: ${(r.content || '').slice(0, 150)}`).join('\n')
  }

  if (context.length > 100) {
    return callAI(prompt, [{ role: 'user', content: 'Search data:\n\n' + context }], 900, false)
  }
  return callAI(prompt, [{ role: 'user', content: 'Find information about: ' + query }], 900, true)
}

// JSON extractors
export const extractJSON = (raw) => {
  if (!raw) return null
  const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  try { return JSON.parse(clean) } catch (e) {}
  const start = clean.indexOf('{')
  const end = clean.lastIndexOf('}')
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
