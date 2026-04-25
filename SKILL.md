# the edge — V3 Project Skill
## B2B Sales Intelligence Platform — Complete Context for New Chat

---

## What This App Is

**"the edge"** is a B2B sales intelligence web app for individual sales reps. Tagline: "Intelligence that closes deals". It is a personal tool used alongside a CRM, not a replacement.

**Live URL:** https://the-edge-b2b.vercel.app  
**GitHub:** https://github.com/tomerpinhasi91-rgb/the-edge (main branch)  
**Old V2 URL (redirects to V3):** https://deal-room-b2b.vercel.app  
**Supabase project:** gevhkkgywtdqppsqnhqq.supabase.co  
**Admin email:** tomerpinhasi91@gmail.com  
**Demo account:** demo@theedge.app / Demo2025!  
**Beta users:** Graeme Robertson (graeme.blackbeard@opalanz.com), Shane

---

## Tech Stack

- **Frontend:** Vite + React 18, single-page app, deployed on Vercel
- **Backend:** Vercel serverless functions in `/api/` folder (Node.js CommonJS — NO `"type":"module"` in package.json)
- **Database:** Supabase PostgreSQL, `accounts` table with `{ user_id, data: {...}, updated_at }`
- **APIs:** Anthropic (claude-sonnet-4-5-20251022), Serper (Google search), Tavily, Hunter.io
- **Auth:** Supabase email/password auth

**CRITICAL — package.json must NOT have `"type": "module"`** — the api/ files use `require()` CommonJS syntax and break if ES module mode is on.

**CRITICAL — api/ files must use Node `https` module NOT `fetch`** — Vercel serverless may run older Node without global fetch.

**CRITICAL — coding rules:**
- No literal newlines in single-quoted JS strings
- String concatenation over template literals in JSX where possible
- Syntax scan after every edit
- Always read the file before editing it

---

## Project Structure

```
the-edge/
  api/
    generate.js       — Anthropic Claude proxy (uses https module)
    serper.js         — Google search proxy (uses https module)
    tavily.js         — Tavily search proxy (uses https module)
    hunter.js         — Hunter.io email finder proxy (uses https module)
  public/
    manifest.json     — PWA manifest
  src/
    App.jsx           — Main router, view persistence, empty state for new users
    main.jsx          — React entry point
    index.css         — Complete design system (green theme)
    lib/
      supabase.js     — Supabase client + db layer (loadAccounts, saveAccount, deleteAccount)
      ai.js           — callAI, serperSearch, tavilySearch, hunterSearch, extractJSON, extractSignals, getTokenStats
      context.jsx     — AppContext: user, accounts, leads, dealAccounts, isAdmin, saveAccount, showToast
      demo.js         — All demo data (DEMO_RESEARCH, DEMO_SWEEPS, DEMO_EMAILS, DEMO_PROSPECTS, DEMO_COACH)
      helpers.js      — initials(), cleanDomain(), formatDate(), relativeDate(), STAGE_LABELS, RISK_COLORS, PRIORITY_COLORS, PRIORITY_BG
    components/
      ui/             — Toast, Modal, Spinner
      layout/         — Sidebar, MobileNav (receives props from App — NOT from context)
      account/        — DashboardTab, ContactsTab, ActivitiesTab, IntelligenceTab, CoachTab
    views/
      AuthScreen.jsx
      AccountView.jsx — Deal account with Dashboard/Intelligence/Activities/Contacts/Notes/AI Coach tabs
      LeadView.jsx    — Lead detail with Overview/Intelligence/Contacts/Notes/AI Coach tabs
      LeadRoomView.jsx — Prospect Finder + Company Research + Email Finder + Saved Leads
      NewAccountView.jsx
      ProfileView.jsx — 3 tabs: Profile (personal/work/sales context), Security (password change), Diagnostics
      AdminView.jsx   — 4 tabs: Users (with drill-down), Activity Feed, Signal Library, Diagnostics
  package.json        — NO "type":"module"
  vercel.json         — buildCommand, outputDirectory, rewrites
  vite.config.js
```

---

## Data Model

All accounts stored in Supabase `accounts` table:
```json
{
  "user_id": "uuid",
  "data": {
    "id": "uid string",
    "_type": "lead" | "account",
    "_dbId": "supabase row id",
    "userEmail": "user@email.com",
    "name": "Company Name",
    "industry": "...",
    "location": "...",
    "stage": "qualify|proposal|negotiate|closing|won|lost",
    "risk": "low|medium|high",
    "opportunity": "...",
    "dealValue": "85000",
    "contact": "primary contact name",
    "signals": [{ "id", "priority": "urgent|watch|intel|grant", "title", "body", "action", "source", "source_url", "date" }],
    "contacts": [{ "id", "name", "title", "role", "email", "phone", "linkedin", "notes" }],
    "activities": [{ "id", "type": "call|meeting|email|note|demo|proposal", "title", "date", "notes", "next" }],
    "checklist": [{ "id", "text", "done": true|false }],
    "coach_sessions": [{ "id", "date", "prompt", "response" }],
    "talking_points": ["string"],
    "notes": "string",
    "description": "string",
    "website": "string",
    "revenue": "string",
    "size": "string",
    "savedAt": "date string (leads only)",
    "why": "why this lead (leads only)"
  },
  "updated_at": "iso timestamp"
}
```

**V2 compatibility:** Old accounts may not have `_type` set — supabase.js defaults to `'account'` if missing.

---

## Key Architecture Decisions

### View Routing (App.jsx)
- No React Router — simple `view` state: `'leadroom' | 'account' | 'lead' | 'admin' | 'profile' | 'new-account'`
- View + activeId persisted to localStorage so page survives refresh
- `setView` + `persistView` pattern — NEVER create a setViewPersist that calls itself (infinite loop bug from V2)
- Empty state component shown to brand-new users (no accounts) with two CTAs: Lead Room and Add Account

### MobileNav
- Receives props from App directly (`view, setView, setActiveId`)
- Does NOT use `useApp()` context for navigation — `setView` is not in context
- Deals tab routes to `new-account` if no deal accounts exist
- Active indicator is a green bar above the icon

### Context (AppContext)
- Exports: `user, accounts, leads, dealAccounts, isAdmin, loading, toast, showToast, saveAccount, deleteAccount, loadAccounts`
- `saveAccount` automatically adds `userEmail` to account data
- `leads` = accounts where `_type === 'lead'`
- `dealAccounts` = accounts where `_type === 'account'`

### AI Calls
- `callAI(system, messages, maxTokens, useWebSearch)` — calls /api/generate
- Token tracking stored in localStorage as `edge_tokens` with daily reset
- Demo mode intercepts all AI calls when `user.email === 'demo@theedge.app'`
- `getDemoKey(name)` — lowercases name for demo data lookup

### localStorage Keys
- `te_view` — persisted current view
- `te_active` — persisted active account/lead id
- `edge_tokens` — daily AI token usage stats
- `te_last_research` — last Company Research result (survives tab switches)
- `te_last_prospects` — last Prospect Finder results (survives tab switches)
- `te_research_history` — last 6 searched company names (shown as history chips)
- `te_profile_{userId}` — user profile data (personal info, work info, sales context)

### Profile (ProfileView)
- Saved to localStorage keyed by user ID: `te_profile_{userId}`
- Exported `loadProfile(userId)` function used by AI Coach to inject sales context
- Fields: firstName, lastName, mobile, officePhone, jobTitle, department, company, industry, territory, targetMarket, whatYouSell, typicalDealSize, averageSalesCycle
- 3 sub-tabs: Profile, Security (change password via Supabase auth.updateUser), Diagnostics

### Demo Mode
- All demo data in `src/lib/demo.js` as plain JS objects
- `isDemoUser(user)` check at top of every AI function
- Returns pre-baked data with simulated delay
- Demo accounts: Apex Protein Co, BlueCrest Logistics, Summit Packaging Solutions, Harvest Ridge Foods

---

## Environment Variables (Vercel)

```
ANTHROPIC_API_KEY   — Anthropic API key
SERPER_API_KEY      — Serper Google search key
TAVILY_API_KEY      — Tavily key
HUNTER_API_KEY      — Hunter.io key
```

---

## API Files Pattern (all 4 use this pattern)

```javascript
const https = require('https');  // NOT fetch — Node compatibility

function httpsPost(hostname, path, headers, bodyStr) {
  return new Promise((resolve, reject) => {
    const options = { hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyStr) } };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ ok: res.statusCode < 400, status: res.statusCode, body: JSON.parse(raw) }); }
        catch(e) { resolve({ ok: false, status: res.statusCode, body: { error: raw } }); }
      });
    });
    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

module.exports = async function handler(req, res) { ... }
```

---

## Design System (index.css)

**Colors:**
- Primary green: `#0F6E56`
- Mid green: `#1D9E75`
- Light green: `#e1f5ee`
- Green border: `#9FE1CB`
- Sidebar bg: `#0d2b1e`
- Leads accent: amber `#BA7517` / `#FAEEDA`
- Blue: `#185FA5` / `#E6F1FB`
- Urgent red: `#A32D2D` / `#FCEBEB`

**Key CSS classes:** `.card`, `.card-title`, `.ai-panel`, `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-sm`, `.form-input`, `.form-label`, `.form-grid`, `.form-group`, `.badge`, `.badge-urgent/watch/intel/grant`, `.signal-card`, `.contact-card`, `.tabs`, `.tab-btn`, `.tab-btn.active`, `.topbar`, `.main-content`, `.metrics-grid`, `.grid-2`, `.spinner`, `.ai-output`

**Layout:** `.app` = grid 220px sidebar + 1fr main. Mobile: sidebar hidden, `.mobile-nav` fixed bottom bar.

---

## What's Fully Working in V3

- ✅ Auth (sign in / sign up)
- ✅ Empty state for new users with guided CTAs
- ✅ Sidebar with leads and deal accounts + empty state placeholders
- ✅ Mobile bottom nav with active indicator bar, routes to new-account when no deals
- ✅ PWA install banner (Android Chrome + iOS Safari instructions)
- ✅ View + activeId persistence across refresh
- ✅ Deal accounts: Dashboard (overview card, progress bar, urgent signals metric), Intelligence, Activities (AI Assistant panel), Contacts, Notes, AI Coach
- ✅ Lead detail: Overview (score circle, company info, signal badges, CTA banner), Intelligence, Contacts, Notes, AI Coach
- ✅ AI Coach auto-saves sessions to Supabase
- ✅ Lead Room: Prospect Finder (Serper, results persist), Company Research (results + history persist), Email Finder (Hunter.io, auto-runs from Research), Saved Leads
- ✅ Company Research — AI prompt extracts stakeholders[] (name, position, role_type, why_relevant, linkedin_url) from web data. Each stakeholder card has "📧 Find email" (Hunter people-search) and role badge. Stakeholders saved as contacts when lead is saved.
- ✅ Lead Score — auto-calculated by AI (0–100) when lead is saved from research. Score shown in ScoreCircle (green/orange/red). "Re-score" + "Score lead" buttons in Lead Overview.
- ✅ Intelligence sweep quick buttons — click auto-runs the sweep immediately (not just fill input)
- ✅ Email Finder — "Add to lead" button on each result, lead selector dropdown shown when leads exist
- ✅ ContactFinder (secondary) — searches Google for `site:linkedin.com/in` profiles below the AI stakeholders section
- ✅ Demo mode: all features return pre-baked results for demo@theedge.app
- ✅ Admin view: 4 tabs — Users (drill-down), Activity Feed, Signal Library, Diagnostics (connection test + token usage)
- ✅ Profile view: 3 tabs — Profile (personal/work/sales context saved to localStorage), Security (change password), Diagnostics
- ✅ Profile injected into AI Coach system prompt for personalised responses (CoachTab, ActivitiesTab, LeadView coach — all use loadProfile + buildRepContext)
- ✅ All 4 API serverless functions using Node https (no fetch dependency)
- ✅ NewAccountView navigation bug fixed (was onSave(form.id), now onSave(accountId))

---

## Known Issues / Remaining Work

### Small bugs
1. **Admin token stats** — `getTokenStats()` reads the current browser's localStorage only. Admin sees their own usage, not other users'. Add a UI note clarifying this.

### Features to build next
1. **Stripe billing** — add `stripe` package + `/api/create-checkout.js` + pricing page
2. **User onboarding flow** — step-by-step guided setup for new users beyond the empty state
3. **Email sending** — integrate SendGrid or Resend to send emails directly from contact cards
4. **Search past chats** — search across all accounts and activities

---

## Deployment Notes

- GitHub repo: `tomerpinhasi91-rgb/the-edge` (main branch)
- Vercel project: `the-edge-h8iy`
- Auto-deploys on every GitHub commit (~15 seconds)
- Build: `npm install && npm run build`, Output: `dist`
- After adding new env vars → must redeploy manually
- Supabase redirect URL: `https://the-edge-b2b.vercel.app` in Supabase Auth → URL Configuration

---

## How to Make Changes (Claude Code workflow)

1. `claude` in the project terminal to start a session
2. Paste this SKILL.md content as your first message to load context
3. Describe the change — Claude reads the file, edits it, runs build to check
4. `git add . && git commit -m "change description" && git push` — Vercel auto-deploys

**When reporting a bug always include:**
- Exact file path
- Error message or screenshot
- What you expected vs what happened

---

## Previous Build History

- V1: Single HTML file prototype
- V2: Single HTML file (~3,500 lines) React CDN + Babel — persistent bugs from single-file architecture
- V3: Proper Vite/React app with separate component files — current version
- V3 was built and iterated across multiple Claude chat sessions. This SKILL.md is the single source of truth — always update it at the end of a session.
