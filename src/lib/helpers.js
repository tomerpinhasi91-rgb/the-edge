export const initials = (name) => {
  if (!name) return '?'
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

export const cleanDomain = (url) => {
  if (!url) return ''
  try { return new URL(url.startsWith('http') ? url : 'https://' + url).hostname.replace('www.', '') }
  catch (e) { return url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] }
}

export const formatDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' })
}

export const relativeDate = (iso) => {
  if (!iso) return ''
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return formatDate(iso)
}

export const STAGE_LABELS = {
  qualify: 'Qualification', proposal: 'Proposal',
  negotiate: 'Negotiation', closing: 'Closing', won: 'Won', lost: 'Lost'
}

export const RISK_COLORS = {
  low: '#1D9E75', medium: '#BA7517', high: '#A32D2D'
}

export const PRIORITY_COLORS = {
  urgent: '#A32D2D', watch: '#BA7517', intel: '#185FA5', grant: '#0F6E56'
}

export const PRIORITY_BG = {
  urgent: '#FCEBEB', watch: '#FAEEDA', intel: '#E6F1FB', grant: '#E1F5EE'
}

export const loadProfile = (userId) => {
  if (!userId) return null
  try {
    const raw = localStorage.getItem('te_profile_' + userId)
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}

// ── CSV Export ───────────────────────────────────────────────────
const csvCell = (val) => {
  if (val === null || val === undefined) return ''
  const s = String(val).replace(/\r?\n/g, ' ')
  return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s.replace(/"/g, '""') + '"' : s
}

const csvRow = (cells) => cells.map(csvCell).join(',')

export const exportAccountsCSV = (accounts, filename = 'export.csv') => {
  const headers = [
    'Type', 'Name', 'Industry', 'Location', 'Website', 'Size', 'Revenue', 'Description',
    'Score', 'Stage', 'Deal Value ($)', 'Opportunity', 'Competitors', 'Timeline',
    'Notes',
    'Signal 1', 'Signal 2', 'Signal 3',
    'Contact 1 Name', 'Contact 1 Role', 'Contact 1 Email', 'Contact 1 LinkedIn',
    'Contact 2 Name', 'Contact 2 Role', 'Contact 2 Email', 'Contact 2 LinkedIn',
    'Contact 3 Name', 'Contact 3 Role', 'Contact 3 Email', 'Contact 3 LinkedIn',
    'Last Activity Type', 'Last Activity Date', 'Last Activity Notes',
    'Saved / Created Date',
  ]

  const rows = accounts.map(a => {
    const signals = [...(a.signals || [])].sort((x, y) => (y.date || '').localeCompare(x.date || '')).slice(0, 3)
    const contacts = (a.contacts || []).slice(0, 3)
    const activities = [...(a.activities || [])].sort((x, y) => (y.date || '').localeCompare(x.date || ''))
    const lastAct = activities[0] || {}

    const contactCells = (idx) => {
      const c = contacts[idx]
      if (!c) return ['', '', '', '']
      return [c.name || '', c.role || '', c.email || '', c.linkedin || '']
    }

    return csvRow([
      a._type === 'lead' ? 'Lead' : 'Deal',
      a.name, a.industry, a.location, a.website, a.size, a.revenue, a.description,
      a.score || '',
      a.stage || '',
      a.dealValue || '',
      a.opportunity || '',
      a.competitors || '',
      a.timeline || '',
      a.notes || '',
      signals[0]?.title || '', signals[1]?.title || '', signals[2]?.title || '',
      ...contactCells(0), ...contactCells(1), ...contactCells(2),
      lastAct.type || '', lastAct.date || '', lastAct.notes || '',
      a.savedAt || a.createdAt || '',
    ])
  })

  const csv = [csvRow(headers), ...rows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export const buildRepContext = (profile) => {
  if (!profile) return { repName: '', repCtx: '' }
  const repName = [profile.firstName, profile.lastName].filter(Boolean).join(' ')
  const parts = [
    repName ? 'Rep: ' + repName : '',
    profile.jobTitle ? 'Role: ' + profile.jobTitle : '',
    profile.company ? 'Company: ' + profile.company : '',
    profile.whatYouSell ? 'Sells: ' + profile.whatYouSell : '',
    profile.typicalDealSize ? 'Typical deal: ' + profile.typicalDealSize : '',
    profile.averageSalesCycle ? 'Sales cycle: ' + profile.averageSalesCycle : '',
    profile.territory ? 'Territory: ' + profile.territory : '',
    profile.competitors ? 'Competitors to watch: ' + profile.competitors : '',
    profile.referenceCustomers ? 'Reference customers: ' + profile.referenceCustomers : '',
  ].filter(Boolean)
  return { repName, repCtx: parts.join(' | ') }
}
