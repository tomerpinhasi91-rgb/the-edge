import posthog from 'posthog-js'

const KEY  = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let ready = false

// ── Init — call once at app startup ──────────────────────────────
export const initAnalytics = () => {
  if (!KEY) return
  posthog.init(KEY, {
    api_host: HOST,
    capture_pageview: false,      // we track views manually per meaningful screen
    autocapture: false,           // we track intentional events only — clean data
    capture_dead_clicks: false,
    disable_session_recording: false,
    person_profiles: 'identified_only',
  })
  ready = true
}

// ── Identify user on login ────────────────────────────────────────
export const identifyUser = (user) => {
  if (!ready || !user) return
  posthog.identify(user.id, {
    email: user.email,
    signed_up_at: user.created_at,
  })
}

// ── Reset on logout ───────────────────────────────────────────────
export const resetAnalytics = () => {
  if (!ready) return
  posthog.reset()
}

// ── Track an event ────────────────────────────────────────────────
// Safe to call even if PostHog isn't initialised (e.g. no API key in dev)
export const track = (event, props = {}) => {
  if (!ready) return
  try {
    posthog.capture(event, {
      ...props,
      $timestamp: new Date().toISOString(),
    })
  } catch (e) {}
}

// ── Named events ─────────────────────────────────────────────────
// Centralised so event names stay consistent across the codebase

// Auth
export const ev = {
  // ── Auth
  signIn:             (method = 'email')         => track('user_signed_in',          { method }),
  signUp:             ()                         => track('user_signed_up'),

  // ── Lead Room
  prospectSearch:     (query, resultCount)       => track('prospect_search',          { query, result_count: resultCount }),
  companyResearched:  (name, cached = false)     => track('company_researched',       { company: name, from_cache: cached }),
  leadSaved:          (name, industry)           => track('lead_saved',               { company: name, industry }),
  emailFinderRun:     (domain)                   => track('email_finder_run',         { domain }),

  // ── Leads & Deals
  dealCreated:        (name, industry)           => track('deal_created',             { company: name, industry }),
  leadConverted:      (name)                     => track('lead_converted_to_deal',   { company: name }),
  accountDeleted:     (type)                     => track('account_deleted',          { type }),

  // ── Intelligence
  intelSweep:         (query, cached = false)    => track('intel_sweep_run',          { query, from_cache: cached }),
  signalSaved:        (count, priority)          => track('signal_saved',             { count, priority }),
  marketIntelViewed:  (industry, region)         => track('market_intel_viewed',      { industry, region }),

  // ── AI Coach & Activities
  coachUsed:          (preset, account)          => track('coach_used',               { preset, account }),
  activityAI:         (label, type)              => track('activity_ai_used',         { label, account_type: type }),
  activityLogged:     (actType, accountName)     => track('activity_logged',          { activity_type: actType, company: accountName }),

  // ── Chatbot
  chatOpened:         ()                         => track('chatbot_opened'),
  chatMessage:        (isPhoto = false)          => track('chatbot_message_sent',     { photo_scan: isPhoto }),
  chatNudgeSeen:      (nudgeType)                => track('chatbot_nudge_seen',       { nudge_type: nudgeType }),

  // ── Profile & ICP
  profileSaved:       ()                         => track('profile_saved'),
  icpSaved:           ()                         => track('icp_saved'),

  // ── Contacts
  contactAdded:       (roleType)                 => track('contact_added',            { role_type: roleType }),
}
