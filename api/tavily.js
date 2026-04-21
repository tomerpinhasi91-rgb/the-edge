const https = require('https');

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(data) }
    };
    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ ok: res.statusCode < 400, status: res.statusCode, data: JSON.parse(raw) }); }
        catch(e) { resolve({ ok: false, status: res.statusCode, data: { error: raw } }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');

  const API_KEY = process.env.TAVILY_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'TAVILY_API_KEY not configured' });

  const { query, search_depth, max_results, include_answer } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query required' });

  const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY };
  const body = { query, search_depth: search_depth || 'basic', max_results: max_results || 5, include_answer: include_answer !== false, include_raw_content: false, include_images: false };

  try {
    const result = await httpsPost('https://api.tavily.com/search', headers, body);
    if (!result.ok) return res.status(result.status).json({ error: result.data?.detail || result.data?.message || 'Tavily error' });
    return res.status(200).json(result.data);
  } catch(err) {
    console.error('Tavily proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
};
