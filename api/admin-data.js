// Fetches all accounts using service role key — bypasses RLS for admin view
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
  if (!serviceKey) return res.status(500).json({ error: 'SUPABASE_SERVICE_KEY not configured' })

  const headers = {
    'Authorization': 'Bearer ' + serviceKey,
    'apikey': serviceKey,
    'Content-Type': 'application/json'
  }

  try {
    const result = await httpsGet(
      '/rest/v1/accounts?select=user_id,data,updated_at,created_at&order=updated_at.desc&limit=2000',
      headers
    )
    if (!result.ok) return res.status(result.status).json({ error: result.data })
    return res.status(200).json({ rows: Array.isArray(result.data) ? result.data : [] })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
