// icp.js — Ideal Customer Profile utilities (GTM Stages 3-7)

export const ICP_SIZES = ['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,000+']

export const EMPTY_PERSONA = () => ({
  id: Math.random().toString(36).slice(2),
  name: '',           // e.g. "Sales Manager at Mid-Market Manufacturer"
  titles: '',         // comma-separated target titles
  size: '',           // company size range
  industries: '',     // comma-separated target industries
  // 4 pain layers
  painOperational: '', // day-to-day problems and friction
  painStrategic: '',   // business goals that are blocked
  painPersonal: '',    // what keeps them up at night
  painFinancial: '',   // cost / revenue impact of the problem
  // Messaging
  hook: '',            // one-line opener that grabs attention
  valueProposition: '', // core value prop for this persona
})

export const EMPTY_ICP = () => ({
  targetGeography: '',
  targetRevenue: '',
  personas: [EMPTY_PERSONA()],
  messagingFramework: '',
})

export const loadICP = (userId) => {
  if (!userId) return null
  try {
    const raw = localStorage.getItem('te_icp_' + userId)
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}

export const saveICP = (userId, icp) => {
  try { localStorage.setItem('te_icp_' + userId, JSON.stringify(icp)) } catch (e) {}
}

// Stage 4 — Client-side ICP fit scoring for a prospect (no API call needed)
// Returns { score: 0–100, fit: 'strong'|'possible'|'low'|'none', reasons: string[] }
export const scoreProspectICP = (prospect, icp) => {
  if (!icp || !icp.personas || icp.personas.length === 0) {
    return { score: 0, fit: 'none', reasons: [] }
  }

  const text = [prospect.name, prospect.description, prospect.type]
    .filter(Boolean).join(' ').toLowerCase()

  let score = 0
  const reasons = []

  // 1. Industry keyword match (35 pts)
  const allIndustries = icp.personas
    .flatMap(p => (p.industries || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean))
  if (allIndustries.length > 0) {
    const matched = allIndustries.filter(ind =>
      ind.split(' ').filter(w => w.length > 3).some(w => text.includes(w))
    )
    if (matched.length > 0) { score += 35; reasons.push('Industry match') }
  }

  // 2. Geography (20 pts)
  if (icp.targetGeography) {
    const geoTerms = icp.targetGeography.split(',').map(g => g.trim().toLowerCase())
    const website = (prospect.website || '').toLowerCase()
    const hit = geoTerms.some(g => text.includes(g) || website.includes(g)) || website.endsWith('.au')
    if (hit) { score += 20; reasons.push('Geography match') }
  } else {
    score += 10 // no geo filter = partial credit
  }

  // 3. Pain-point keyword overlap (20 pts)
  const painText = icp.personas
    .flatMap(p => [p.painOperational, p.painStrategic, p.painFinancial, p.painPersonal])
    .join(' ').toLowerCase()
  const painWords = [...new Set(painText.split(/\W+/).filter(w => w.length > 5))].slice(0, 30)
  const painHits = painWords.filter(w => text.includes(w)).length
  if (painHits > 0) { score += Math.min(20, painHits * 5); reasons.push('Pain alignment') }

  // 4. Has a website — signals legitimate company (10 pts)
  if (prospect.website) score += 10

  // 5. Rich description (15 pts)
  if ((prospect.description || '').length > 80) { score += 15; reasons.push('Profile depth') }

  score = Math.min(100, score)
  const fit = score >= 65 ? 'strong' : score >= 35 ? 'possible' : 'low'
  return { score, fit, reasons }
}

// Build ICP context string for injection into AI prompts
export const buildICPContext = (icp) => {
  if (!icp) return ''
  const lines = []
  if (icp.targetGeography) lines.push('Target geography: ' + icp.targetGeography)
  if (icp.targetRevenue) lines.push('Target company revenue: ' + icp.targetRevenue)
  ;(icp.personas || []).forEach((p, i) => {
    if (!p.name && !p.industries && !p.titles) return
    lines.push('\nPersona ' + (i + 1) + ': ' + (p.name || 'Unnamed'))
    if (p.titles) lines.push('  Target titles: ' + p.titles)
    if (p.industries) lines.push('  Industries: ' + p.industries)
    if (p.size) lines.push('  Company size: ' + p.size + ' employees')
    if (p.painOperational) lines.push('  Operational pain: ' + p.painOperational)
    if (p.painStrategic) lines.push('  Strategic pain: ' + p.painStrategic)
    if (p.painPersonal) lines.push('  Personal pain: ' + p.painPersonal)
    if (p.painFinancial) lines.push('  Financial pain: ' + p.painFinancial)
    if (p.hook) lines.push('  Opening hook: ' + p.hook)
    if (p.valueProposition) lines.push('  Value prop: ' + p.valueProposition)
  })
  if (icp.messagingFramework) lines.push('\nMessaging framework: ' + icp.messagingFramework)
  return lines.join('\n')
}

// Stage 5 — Generate LinkedIn search strings for contact sourcing
export const linkedInSearchStrings = (companyName, icp) => {
  if (!icp || !icp.personas) return []
  return icp.personas
    .filter(p => p.titles || p.name)
    .slice(0, 3)
    .map(p => {
      const titles = (p.titles || p.name || '')
        .split(',').map(t => t.trim()).filter(Boolean).slice(0, 2)
      const titleQ = titles.map(t => '"' + t + '"').join(' OR ')
      return {
        label: p.name || titles[0],
        query: '(' + titleQ + ') "' + companyName + '" site:linkedin.com/in',
        googleUrl: 'https://www.google.com/search?q=' + encodeURIComponent('(' + titleQ + ') "' + companyName + '" site:linkedin.com/in'),
      }
    })
}
