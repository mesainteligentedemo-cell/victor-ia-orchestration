import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';
import http from 'http';
import { WebSocketServer } from 'ws';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws/chat' });

// Force rebuild v2
console.log('🚀 Orchestration server starting...');

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json());

// ============ OPENROUTER CLIENT ============
const anthropic = new Anthropic({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.io/api/v1',
  defaultHeaders: {
    'HTTP-Referer': 'https://victor-ia-saas.vercel.app',
    'X-Title': 'Victor IA Chat'
  }
});

// ============ HEALTH CHECK ============
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
    console.log('[API] POST /api/prompt - received request');
    const { message } = req.body;

    if (!message || message.trim() === '') {
      console.error('[API] Message is empty');
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      console.error('[API] OPENROUTER_API_KEY not configured');
      return res.status(500).json({ error: 'OpenRouter API key not configured' });
    }

    console.log(`[API] Calling Claude with message: "${message.substring(0, 50)}..."`);

    // Call Claude via OpenRouter
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: message
        }
      ]
    });

    console.log('[API] Claude response received');
    const assistantMessage = response.content
      .filter(block => block.type === 'text')
      .map(block => block.text)
      .join('\n') || 'No response';

    res.json({
      response: assistantMessage
    });
  } catch (error) {
    console.error('[API] Error:', error.message || error);
    console.error('[API] Error stack:', error.stack);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// ============ WEBSOCKET SUPPORT ============
wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', async (data) => {
    try {
      const { message, conversationHistory = [] } = JSON.parse(data);

      const messages = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        {
          role: 'user',
          content: message
        }
      ];

      const response = await anthropic.messages.create({
        model: 'claude-opus-4-8',
        max_tokens: 4096,
        messages: messages
      });

      const assistantMessage = response.content.find((b) => b.type === 'text')?.text || '';

      ws.send(JSON.stringify({
        type: 'response',
        response: assistantMessage,
        model: response.model
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        error: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// ============ ERROR HANDLING ============
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// ============ START SERVER ============
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
