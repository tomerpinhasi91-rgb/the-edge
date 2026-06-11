// autosweep.js — Overnight signal monitoring
// Once per day, quietly re-sweeps the top saved leads for new signals
// and surfaces "X new signals overnight" in the Morning Briefing.

import { serperSearch, callAI, extractSignals } from './ai'
import { uid } from './supabase'

const RUN_KEY = (userId) => `te_autosweep_${userId}`
const RESULT_KEY = (userId, date) => `te_autosweep_result_${userId}_${date}`
const MAX_LEADS_PER_DAY = 4 // cost control — one serper + one AI call per lead

const today = () => new Date().toISOString().split('T')[0]

export const getAutoSweepResult = (userId) => {
  try {
    const raw = localStorage.getItem(RESULT_KEY(userId, today()))
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}

const saveResult = (userId, result) => {
  try { localStorage.setItem(RESULT_KEY(userId, today()), JSON.stringify(result)) } catch (e) {}
}

// Normalised word-overlap check so we don't re-save the same news
const isDuplicate = (title, existingTitles) => {
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3)
  const words = new Set(norm(title))
  if (!words.size) return true
  return existingTitles.some(t => {
    const tw = norm(t)
    if (!tw.length) return false
    const overlap = tw.filter(w => words.has(w)).length
    return overlap / Math.min(words.size, tw.length) >= 0.5
  })
}

// Main entry — call on app load. No-ops if already ran today.
// Returns the day's result (fresh or cached) or null.
export const runAutoSweep = async (user, leads, saveAccount) => {
  if (!user?.id || !leads?.length || !saveAccount) return null

  const lastRun = (() => { try { return localStorage.getItem(RUN_KEY(user.id)) } catch (e) { return null } })()
  if (lastRun === today()) return getAutoSweepResult(user.id)
  try { localStorage.setItem(RUN_KEY(user.id), today()) } catch (e) {}

  // Highest-scored leads first — they're the ones worth watching
  const targets = [...leads]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, MAX_LEADS_PER_DAY)

  const items = []

  for (const lead of targets) {
    try {
      const data = await serperSearch(`${lead.name} ${lead.industry || ''} news`)
      const news = (data.news || []).slice(0, 4)
      const organic = (data.organic || []).slice(0, 3)
      if (!news.length && !organic.length) continue

      const context = [
        ...news.map(n => `[${n.date || 'recent'}] ${n.title}: ${(n.snippet || '').slice(0, 200)} (url:${n.link})`),
        ...organic.map(r => `${r.title}: ${(r.snippet || '').slice(0, 150)} (url:${r.link})`),
      ].join('\n')

      const existingTitles = (lead.signals || []).map(s => s.title)
      const prompt = `B2B sales analyst doing a daily signal check on a saved lead. Return ONLY a JSON array — no markdown.
Schema: [{"priority":"urgent"|"watch"|"intel"|"grant","title":"one line","body":"2 sentences","action":"one next step","source_url":"url from the data or empty string"}]
Rules: max 2 signals. ONLY genuinely NEW developments from the search data — skip anything matching these known signals: ${existingTitles.slice(0, 8).join(' | ') || 'none'}. If nothing new, return [].
Lead: ${lead.name} | Industry: ${lead.industry || ''} | Location: ${lead.location || ''}`

      const result = await callAI(prompt, [{ role: 'user', content: 'Search data:\n' + context }], 400, false)
      const parsed = extractSignals(result) || []

      const fresh = parsed.filter(s => s.title && !isDuplicate(s.title, existingTitles)).slice(0, 2)
      if (!fresh.length) continue

      const stamped = fresh.map(s => ({ ...s, id: uid(), date: today(), source: s.source || 'Overnight sweep', _overnight: today() }))
      await saveAccount({ ...lead, signals: [...(lead.signals || []), ...stamped] })
      items.push({ leadId: lead.id, name: lead.name, titles: stamped.map(s => s.title), count: stamped.length })
    } catch (e) { /* per-lead failures are silent — best effort */ }
  }

  const result = { date: today(), count: items.reduce((s, i) => s + i.count, 0), items }
  saveResult(user.id, result)
  return result
}
