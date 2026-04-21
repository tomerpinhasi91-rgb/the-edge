module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  res.setHeader('Access-Control-Allow-Origin', '*');

  const { system, messages, max_tokens, use_search } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages required' });

  try {
    const body = {
      model: 'claude-sonnet-4-5',
      max_tokens: max_tokens || 800,
      system: system || '',
      messages,
    };

    if (use_search) {
      body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
    }

    const headers = {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    };

    if (use_search) {
      headers['anthropic-beta'] = 'web-search-2025-03-05';
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const errMsg = err?.error?.message || 'API error';
      // Surface rate limit clearly
      if (response.status === 429) {
        return res.status(429).json({ error: { message: 'Rate limit hit — wait 30 seconds and try again. To increase limits visit console.anthropic.com' } });
      }
      console.error('Anthropic API error:', response.status, errMsg);
      return res.status(response.status).json({ error: err });
    }

    const data = await response.json();

    if (data.content) {
      const textBlocks = data.content.filter(b => b.type === 'text');
      let fullText = textBlocks.map(b => b.text).join('');
      // Strip citation tags
      fullText = fullText.replace(/]*>([\s\S]*?)<\/antml:cite>/gi, '$1');
      fullText = fullText.replace(/<\/?antml:cite[^>]*>/gi, '');
      data._cleanText = fullText;
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
};
