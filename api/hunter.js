module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { action, domain, company, first_name, last_name, full_name, email } = req.body || {};

  if (!action) return res.status(400).json({ error: 'action required' });

  const API_KEY = process.env.HUNTER_API_KEY;
  if (!API_KEY) {
    console.error('HUNTER_API_KEY not set');
    return res.status(500).json({ error: 'Hunter API key not configured — add HUNTER_API_KEY to Vercel environment variables' });
  }

  try {
    let url;
    const params = new URLSearchParams({ api_key: API_KEY });

    if (action === 'domain-search') {
      if (!domain && !company) return res.status(400).json({ error: 'domain or company required' });
      if (domain) params.set('domain', domain);
      else params.set('company', company);
      params.set('limit', '10');
      url = `https://api.hunter.io/v2/domain-search?${params}`;

    } else if (action === 'email-finder') {
      if (!domain && !company) return res.status(400).json({ error: 'domain or company required' });
      if (domain) params.set('domain', domain);
      else params.set('company', company);
      if (full_name) params.set('full_name', full_name);
      else {
        if (first_name) params.set('first_name', first_name);
        if (last_name) params.set('last_name', last_name);
      }
      url = `https://api.hunter.io/v2/email-finder?${params}`;

    } else if (action === 'email-verifier') {
      if (!email) return res.status(400).json({ error: 'email required' });
      params.set('email', email);
      url = `https://api.hunter.io/v2/email-verifier?${params}`;

    } else if (action === 'account') {
      url = `https://api.hunter.io/v2/account?${params}`;

    } else {
      return res.status(400).json({ error: 'Invalid action: ' + action });
    }

    const response = await fetch(url);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch(e) {
      console.error('Hunter returned non-JSON:', text.slice(0, 200));
      return res.status(500).json({ error: 'Hunter returned invalid response — check API key is valid' });
    }

    if (!response.ok) {
      const errMsg = data?.errors?.[0]?.details || data?.errors?.[0]?.id || 'Hunter API error ' + response.status;
      console.error('Hunter error:', response.status, errMsg);
      return res.status(response.status).json({ error: errMsg });
    }

    return res.status(200).json(data);

  } catch(err) {
    console.error('Hunter proxy error:', err);
    return res.status(500).json({ error: 'Internal server error: ' + err.message });
  }
};
