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

  const { query, type, num, gl, hl } = req.body || {};
  if (!query) return res.status(400).json({ error: 'query required' });

  try {
    // Run organic search + news search in parallel for richer context
    const [searchRes, newsRes] = await Promise.all([
      fetch('https://google.serper.dev/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': API_KEY },
        body: JSON.stringify({ q: query, gl: gl || 'au', hl: hl || 'en', num: num || 8 })
      }),
      fetch('https://google.serper.dev/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-KEY': API_KEY },
        body: JSON.stringify({ q: query, gl: 'au', hl: 'en', num: 5 })
      })
    ]);

    const [searchData, newsData] = await Promise.all([
      searchRes.json(),
      newsRes.json()
    ]);

    if (!searchRes.ok) {
      return res.status(searchRes.status).json({ error: searchData?.message || 'Serper error' });
    }

    // Combine and return structured data
    return res.status(200).json({
      organic: searchData.organic || [],
      knowledgeGraph: searchData.knowledgeGraph || null,
      answerBox: searchData.answerBox || null,
      news: newsData.news || [],
      peopleAlsoAsk: searchData.peopleAlsoAsk || []
    });
  } catch(err) {
    console.error('Serper proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
};
