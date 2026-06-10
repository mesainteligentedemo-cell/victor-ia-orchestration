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
const wss = new WebSocketServer({ server });

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json());

// ============ ANTHROPIC CLIENT ============
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
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
    const { message, conversationHistory = [] } = req.body;

    if (!message || message.trim() === '') {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Build conversation messages
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

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1024,
      system: `Eres un asistente inteligente y útil. Responde de forma concisa, clara y profesional.

Cuando el usuario mencione proyectos de Victor IA, websites, diseño, desarrollo, etc.,
brinda recomendaciones específicas y prácticas. Sé directo y evita redundancias.`,
      messages: messages
    });

    const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';

    res.json({
      response: assistantMessage,
      model: response.model,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    });
  } catch (error) {
    console.error('Prompt endpoint error:', error);
    res.status(500).json({
      error: error.message,
      type: error.constructor.name
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
        model: 'claude-opus-4-1-20250805',
        max_tokens: 1024,
        messages: messages
      });

      const assistantMessage = response.content[0].type === 'text' ? response.content[0].text : '';

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
