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

  const API_KEY = process.env.SERPER_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'SERPER_API_KEY not configured' });

  const { query, num, gl, hl } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query required' });

  const headers = { 'Content-Type': 'application/json', 'X-API-KEY': API_KEY };

  try {
    const [searchRes, newsRes] = await Promise.all([
      httpsPost('https://google.serper.dev/search', headers, { q: query, gl: gl || 'au', hl: hl || 'en', num: num || 8 }),
      httpsPost('https://google.serper.dev/news', headers, { q: query, gl: 'au', hl: 'en', num: 5 })
    ]);

    if (!searchRes.ok) return res.status(searchRes.status).json({ error: searchRes.data?.message || 'Serper error' });

    return res.status(200).json({
      organic: searchRes.data.organic || [],
      knowledgeGraph: searchRes.data.knowledgeGraph || null,
      answerBox: searchRes.data.answerBox || null,
      news: newsRes.data.news || [],
      peopleAlsoAsk: searchRes.data.peopleAlsoAsk || []
    });
  } catch(err) {
    console.error('Serper proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
};
