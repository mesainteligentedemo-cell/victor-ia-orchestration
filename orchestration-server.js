/**
 * =============================================================================
 * ORCHESTRATION SERVER — Victor IA (Railway production)
 * =============================================================================
 * Express server that proxies chat messages to Claude via OpenRouter.
 *
 * Endpoints:
 *   GET  /health        — liveness + config status
 *   GET  /api/agents    — static agent list
 *   POST /api/prompt    — { message, conversationHistory? } → { response }
 *   WS   /ws/chat       — { message, conversationHistory? } → { type, response }
 *
 * Env (Railway → Variables):
 *   OPENROUTER_API_KEY  (required) — sk-or-v1-...
 *   OPENROUTER_MODEL    (optional) — default: anthropic/claude-opus-4.5
 *   PORT                (injected by Railway automatically)
 * =============================================================================
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer } from 'ws';

dotenv.config();

// ============ CONFIG ============
const PORT = process.env.PORT || 3000;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';

// OpenRouter REQUIRES vendor-prefixed model slugs (anthropic/...).
// Primary model is configurable; fallbacks guarantee a response even if the
// primary slug is renamed/unavailable on OpenRouter.
// All slugs verified live against https://openrouter.ai/api/v1/models (2026-06-10)
const MODEL_CHAIN = [
  process.env.OPENROUTER_MODEL || 'anthropic/claude-opus-4.8',
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-haiku-4.5'
].filter((m, i, arr) => arr.indexOf(m) === i); // dedupe

// CORRECT domain: openrouter.ai (the previous deploy used openrouter.io — dead)
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

console.log('🚀 Orchestration server starting...');
console.log(`[BOOT] Node ${process.version}`);
console.log(`[BOOT] OPENROUTER_API_KEY: ${OPENROUTER_API_KEY ? `set (${OPENROUTER_API_KEY.slice(0, 12)}...)` : 'MISSING'}`);
console.log(`[BOOT] Model chain: ${MODEL_CHAIN.join(' → ')}`);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/chat' });

// ============ MIDDLEWARE ============
app.use(cors()); // open CORS — frontend lives on a different origin (Vercel)
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`[HTTP] ${req.method} ${req.originalUrl} → ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
});

// ============ OPENROUTER CALL (with model fallback + full error surfacing) ============

/**
 * Normalize a conversation history array into OpenAI-style messages.
 * Drops malformed entries instead of crashing.
 */
function buildMessages(conversationHistory, userMessage) {
  const messages = [];
  if (Array.isArray(conversationHistory)) {
    for (const m of conversationHistory.slice(-20)) { // cap history at 20 turns
      if (
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim() !== ''
      ) {
        messages.push({ role: m.role, content: m.content });
      }
    }
  }
  messages.push({ role: 'user', content: userMessage });
  return messages;
}

/**
 * Call OpenRouter's /chat/completions. Tries each model in MODEL_CHAIN —
 * if a model slug is invalid/unavailable (400/404), moves to the next one.
 * Throws an Error with .status and .detail for anything unrecoverable.
 */
async function callClaude(messages) {
  let lastError = null;

  for (const model of MODEL_CHAIN) {
    console.log(`[OPENROUTER] Calling model "${model}" (${messages.length} messages)...`);

    let res;
    try {
      res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://victor-ia-saas.vercel.app',
          'X-Title': 'Victor IA Chat'
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          messages
        }),
        signal: AbortSignal.timeout(60_000)
      });
    } catch (netErr) {
      // Network/DNS/timeout — not model-specific, abort the chain
      console.error('[OPENROUTER] Network error:', netErr.message);
      const err = new Error(`Network error reaching OpenRouter: ${netErr.message}`);
      err.status = 502;
      throw err;
    }

    const raw = await res.text();
    let data = null;
    try { data = JSON.parse(raw); } catch { /* non-JSON body — keep raw */ }

    if (res.ok) {
      const text = data?.choices?.[0]?.message?.content;
      if (typeof text === 'string' && text.length > 0) {
        console.log(`[OPENROUTER] ✅ "${model}" responded (${text.length} chars)`);
        return { text, model: data.model || model };
      }
      console.error('[OPENROUTER] 200 OK but empty content:', raw.slice(0, 500));
      lastError = Object.assign(new Error('OpenRouter returned an empty response'), { status: 502 });
      continue;
    }

    const upstreamMsg = data?.error?.message || raw.slice(0, 300);
    console.error(`[OPENROUTER] ❌ "${model}" → HTTP ${res.status}: ${upstreamMsg}`);

    // Model-specific failures → try the next model in the chain
    if (res.status === 404 || res.status === 400) {
      lastError = Object.assign(
        new Error(`Model "${model}" rejected by OpenRouter (${res.status}): ${upstreamMsg}`),
        { status: 502 }
      );
      continue;
    }

    // Unrecoverable upstream errors — surface them clearly
    const friendly = {
      401: 'OpenRouter API key is invalid (check OPENROUTER_API_KEY in Railway, must start with sk-or-)',
      402: 'OpenRouter account has no credits — add credits at openrouter.ai',
      403: 'OpenRouter request forbidden (moderation or key permissions)',
      429: 'OpenRouter rate limit hit — retry in a few seconds'
    }[res.status] || `OpenRouter error ${res.status}: ${upstreamMsg}`;

    const err = new Error(friendly);
    err.status = res.status === 429 ? 429 : 502;
    err.detail = upstreamMsg;
    throw err;
  }

  throw lastError || Object.assign(new Error('All models in the chain failed'), { status: 502 });
}

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    openrouterKeyConfigured: !!OPENROUTER_API_KEY,
    models: MODEL_CHAIN
  });
});

// ============ AGENTS LIST ============
app.get('/api/agents', (req, res) => {
  res.json({
    agents: [
      { id: 'leader', name: 'Líder', role: 'Planificación' },
      { id: 'implementer', name: 'Implementador', role: 'Ejecución' },
      { id: 'reviewer', name: 'Revisor', role: 'Validación' }
    ]
  });
});

// ============ MAIN PROMPT ENDPOINT ============
app.post('/api/prompt', async (req, res) => {
  try {
    console.log('[API] POST /api/prompt — body keys:', Object.keys(req.body || {}));

    const { message, conversationHistory } = req.body || {};

    if (!message || typeof message !== 'string' || message.trim() === '') {
      console.error('[API] Validation failed: message is empty');
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!OPENROUTER_API_KEY) {
      console.error('[API] OPENROUTER_API_KEY not configured');
      return res.status(500).json({
        error: 'Server misconfigured: OPENROUTER_API_KEY is not set. Add it in Railway → Variables.'
      });
    }

    const messages = buildMessages(conversationHistory, message.trim());
    const { text, model } = await callClaude(messages);

    res.json({ response: text, model });
  } catch (error) {
    console.error('[API] /api/prompt error:', error.message);
    if (error.detail) console.error('[API] Upstream detail:', error.detail);
    res.status(error.status || 500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// ============ WEBSOCKET SUPPORT ============
wss.on('connection', (ws) => {
  console.log('[WS] Client connected');

  ws.on('message', async (data) => {
    try {
      const { message, conversationHistory = [] } = JSON.parse(data.toString());

      if (!message || typeof message !== 'string') {
        return ws.send(JSON.stringify({ type: 'error', error: 'message is required' }));
      }
      if (!OPENROUTER_API_KEY) {
        return ws.send(JSON.stringify({ type: 'error', error: 'OPENROUTER_API_KEY is not set on the server' }));
      }

      const messages = buildMessages(conversationHistory, message.trim());
      const { text, model } = await callClaude(messages);

      ws.send(JSON.stringify({ type: 'response', response: text, model }));
    } catch (error) {
      console.error('[WS] Error:', error.message);
      ws.send(JSON.stringify({ type: 'error', error: error.message || 'Internal error' }));
    }
  });

  ws.on('close', () => console.log('[WS] Client disconnected'));
  ws.on('error', (error) => console.error('[WS] Socket error:', error.message));
});

// ============ 404 + ERROR HANDLING ============
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.originalUrl });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[SERVER] Unhandled error:', err.stack || err.message);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Never let an unhandled rejection kill the process silently
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err.stack);
});

// ============ START SERVER ============
// Railway injects PORT and routes traffic to it; binding 0.0.0.0 is required.
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Health: http://localhost:${PORT}/health`);
  console.log(`💬 API endpoint: http://localhost:${PORT}/api/prompt`);
  console.log(`🔗 Backend ready: ${new Date().toISOString()}`);
});

// ============ GRACEFUL SHUTDOWN ============
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});