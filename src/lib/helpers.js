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
