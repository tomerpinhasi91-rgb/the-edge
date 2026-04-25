const https = require('https');

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ ok: res.statusCode < 400, status: res.statusCode, data: JSON.parse(raw) }); }
        catch(e) { resolve({ ok: false, status: res.statusCode, data: { error: raw } }); }
      });
    }).on('error', reject);
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

  const API_KEY = process.env.HUNTER_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: 'HUNTER_API_KEY not configured' });

  const { query, type, firstName, lastName, domain: bodyDomain } = req.body || {};

  // Person-level email lookup: { type: 'person', firstName, lastName, domain }
  if (type === 'person') {
    if (!firstName || !lastName || !bodyDomain) {
      return res.status(400).json({ error: 'firstName, lastName, and domain required for person lookup' });
    }
    try {
      const url = 'https://api.hunter.io/v2/email-finder?domain=' + encodeURIComponent(bodyDomain) +
        '&first_name=' + encodeURIComponent(firstName) +
        '&last_name=' + encodeURIComponent(lastName) +
        '&api_key=' + API_KEY;
      const result = await httpsGet(url);
      if (!result.ok || !result.data?.data) return res.status(200).json({ email: null, score: 0 });
      const d = result.data.data;
      return res.status(200).json({ email: d.email || null, score: d.score || 0, sources: d.sources || [] });
    } catch(err) {
      console.error('Hunter email-finder error:', err);
      return res.status(500).json({ error: err.message });
    }
  }

  // Domain / company search
  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    const isDomain = query.includes('.') && !query.includes(' ');
    let domain = isDomain ? query.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : null;

    if (!domain) {
      const searchUrl = 'https://api.hunter.io/v2/domain-search?company=' + encodeURIComponent(query) + '&api_key=' + API_KEY + '&limit=10';
      const result = await httpsGet(searchUrl);
      if (!result.ok || !result.data?.data) return res.status(200).json({ emails: [], organization: query });
      const d = result.data.data;
      return res.status(200).json({
        emails: d.emails || [],
        organization: d.organization || query,
        domain: d.domain || '',
        pattern: d.pattern || ''
      });
    }

    const url = 'https://api.hunter.io/v2/domain-search?domain=' + encodeURIComponent(domain) + '&api_key=' + API_KEY + '&limit=10';
    const result = await httpsGet(url);
    if (!result.ok || !result.data?.data) return res.status(200).json({ emails: [], organization: domain });
    const d = result.data.data;
    return res.status(200).json({
      emails: d.emails || [],
      organization: d.organization || domain,
      domain: d.domain || domain,
      pattern: d.pattern || ''
    });
  } catch(err) {
    console.error('Hunter proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
};
