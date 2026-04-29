const https = require('https')

const SUPABASE_HOST = 'gevhkkgywtdqppsqnhqq.supabase.co'

function httpsGet(path, headers) {
  return new Promise((resolve, reject) => {
    const options = { hostname: SUPABASE_HOST, path, method: 'GET', headers }
    const req = https.request(options, res => {
      let raw = ''
      res.on('data', c => raw += c)
      res.on('end', () => {
        try { resolve({ ok: res.statusCode < 400, status: res.statusCode, data: JSON.parse(raw) }) }
        catch (e) { resolve({ ok: false, status: res.statusCode, data: { error: raw } }) }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY not set in Vercel env vars' })

  const headers = {
    'Authorization': 'Bearer ' + serviceKey,
    'apikey': serviceKey,
    'Content-Type': 'application/json'
  }

  try {
    // Fetch up to 1000 users (paginate if needed)
    const [p1, p2] = await Promise.all([
      httpsGet('/auth/v1/admin/users?per_page=500&page=1', headers),
      httpsGet('/auth/v1/admin/users?per_page=500&page=2', headers),
    ])

    const users1 = (p1.ok && p1.data.users) ? p1.data.users : []
    const users2 = (p2.ok && p2.data.users) ? p2.data.users : []
    const allUsers = [...users1, ...users2]

    if (!p1.ok) return res.status(p1.status).json({ error: p1.data })

    // Normalize to safe shape
    const users = allUsers.map(u => ({
      id: u.id,
      email: u.email || u.phone || '(no email)',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      confirmed_at: u.confirmed_at || u.email_confirmed_at,
      provider: (u.app_metadata?.providers || [u.app_metadata?.provider] || ['email']).join(', '),
      user_agent: u.user_metadata?.ua || null,
      // Supabase doesn't store UA by default — populated if client sends it
    }))

    return res.status(200).json({ users })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
