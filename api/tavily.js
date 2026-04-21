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

  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY },
      body: JSON.stringify({
        query,
        search_depth: search_depth || 'basic',
        max_results: max_results || 5,
        include_answer: include_answer !== false,
        include_raw_content: false,
        include_images: false
      })
    });

    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch(e) {
      console.error('Tavily non-JSON:', text.slice(0,200));
      return res.status(500).json({ error: 'Tavily returned invalid response' });
    }

    if (!response.ok) {
      console.error('Tavily error:', response.status, data);
      return res.status(response.status).json({ error: data?.detail || data?.message || 'Tavily error' });
    }

    return res.status(200).json(data);
  } catch(err) {
    console.error('Tavily proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
};
