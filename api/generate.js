const https = require('https');

// Allowed models — whitelist to prevent abuse
const ALLOWED_MODELS = {
  'claude-sonnet-4-5': true,
  'claude-haiku-4-5':  true,
};
const DEFAULT_MODEL = 'claude-sonnet-4-5';

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

  const { system, messages, max_tokens, use_search, tools, model, stream } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'messages required' });

  // #9 tiered model — validate, default to sonnet
  const selectedModel = (model && ALLOWED_MODELS[model]) ? model : DEFAULT_MODEL;

  const body = {
    model: selectedModel,
    max_tokens: max_tokens || 800,
    system: system || '',
    messages
  };

  if (tools) body.tools = tools;
  else if (use_search) body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];

  const headers = {
    'Content-Type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01'
  };

  // Detect if any message contains a document block (PDF) — needs beta header
  const hasPdf = messages.some(m =>
    Array.isArray(m.content) && m.content.some(b => b.type === 'document')
  );

  if (use_search || tools) headers['anthropic-beta'] = 'web-search-2025-03-05';
  else if (hasPdf) headers['anthropic-beta'] = 'pdfs-2024-09-25';

  // ── #11 Streaming path ──────────────────────────────────────────
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    body.stream = true;
    const data = JSON.stringify(body);
    const urlObj = new URL('https://api.anthropic.com/v1/messages');
    const streamOpts = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(data) }
    };

    const anthropicReq = https.request(streamOpts, (anthropicRes) => {
      // Pipe SSE events directly to client
      anthropicRes.on('data', chunk => {
        try { res.write(chunk); } catch (e) {}
      });
      anthropicRes.on('end', () => {
        try { res.end(); } catch (e) {}
      });
      anthropicRes.on('error', (err) => {
        try { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end(); } catch (e) {}
      });
    });
    anthropicReq.on('error', (err) => {
      try { res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`); res.end(); } catch (e) {}
    });
    anthropicReq.write(data);
    anthropicReq.end();
    return;
  }

  // ── Standard non-streaming path ─────────────────────────────────
  try {
    const result = await httpsPost('https://api.anthropic.com/v1/messages', headers, body);

    if (!result.ok) {
      if (result.status === 429) return res.status(429).json({ error: 'Rate limit — wait 30 seconds and try again' });
      return res.status(result.status).json({ error: result.data });
    }

    if (result.data.content) {
      const textBlocks = result.data.content.filter(b => b.type === 'text');
      let fullText = textBlocks.map(b => b.text).join('');
      fullText = fullText.replace(/]*>([\s\S]*?)<\/antml:cite>/gi, '$1').replace(/<\/?antml:cite[^>]*>/gi, '');
      result.data._cleanText = fullText;
    }

    return res.status(200).json(result.data);
  } catch(err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err.message });
  }
};
