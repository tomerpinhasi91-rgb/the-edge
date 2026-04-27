// tenant.js — White-label configuration
// When a company licenses The Edge, they only change this file.
// All colors, names, and logos reference these values.

const tenant = {

  // ── App identity ──
  appName:    'The Edge',
  tagline:    'Intelligence that closes deals',
  logoMark:   'DG',              // Two-letter initials shown in logo mark
  faviconUrl: '/favicon.svg',

  // ── Color palette ──
  colors: {
    primary:        '#0078D4',   // Main brand color — buttons, links, active
    primaryDark:    '#005A9E',   // Hover/pressed
    primaryLight:   '#E6F1FB',   // Tinted panel backgrounds
    primaryBorder:  '#B5D4F4',   // Borders on tinted panels

    sidebar:        '#1B2A4A',   // Sidebar background
    sidebarDark:    '#0F1A2E',   // Sidebar section hover

    accent:         '#F97316',   // Leads accent, logo divider, CTA highlights
    accentDark:     '#C05000',   // Accent hover
    accentLight:    '#FEF0E7',   // Accent tinted bg
  },

  // ── Feature flags (for white-label customisation) ──
  features: {
    showAdminTab:    true,
    showLeadRoom:    true,
    showAICoach:     true,
    showEmailFinder: true,
    showLinkedIn:    true,
  },

  // ── Contact / support ──
  supportEmail: 'support@theedge.app',
  docsUrl:      'https://theedge.app/docs',
}

export default tenant
