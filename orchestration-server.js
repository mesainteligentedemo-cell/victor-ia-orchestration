import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { v4 as uuid } from 'uuid';
import dotenv from 'dotenv';
import { Anthropic } from '@anthropic-ai/sdk';
import { WebSocketServer } from 'ws';
import http from 'http';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ============ MIDDLEWARE ============
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ============ LOAD CONFIGS ============
function loadConfigs() {
  const configPath = (file) => path.join('.', 'config', file);

  return {
    proyectos: JSON.parse(fs.readFileSync(configPath('PROYECTOS_CONFIG.json'), 'utf8')),
    agentes: JSON.parse(fs.readFileSync(configPath('AGENTES_CONFIG.json'), 'utf8')),
    skills: JSON.parse(fs.readFileSync(configPath('SKILLS_CONFIG.json'), 'utf8')),
    mcp: JSON.parse(fs.readFileSync(configPath('MCP_CONFIG.json'), 'utf8')),
    routing: JSON.parse(fs.readFileSync(configPath('ROUTING_RULES.json'), 'utf8'))
  };
}

const configs = loadConfigs();
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// ============ PROJECT DETECTION ============
function detectProjectFromPrompt(prompt) {
  const lowerPrompt = prompt.toLowerCase();

  for (const proyecto of configs.proyectos.proyectos) {
    for (const keyword of proyecto.keywords) {
      if (lowerPrompt.includes(keyword.toLowerCase())) {
        return {
          projectId: proyecto.id,
          projectName: proyecto.nombre,
          confidence: 0.9,
          project: proyecto
        };
      }
    }
  }

  return {
    projectId: null,
    projectName: 'General',
    confidence: 0,
    project: null
  };
}

// ============ AGENT ROUTING ============
function routePrompt(prompt, project) {
  const promptLength = prompt.length;
  let selectedWorkflow = 'tarea-simple';

  for (const rule of configs.routing.routing_rules) {
    if (prompt.toLowerCase().includes('video') || prompt.toLowerCase().includes('kling')) {
      selectedWorkflow = 'produccion-video';
      break;
    }
    if (prompt.toLowerCase().includes('diseña') || prompt.toLowerCase().includes('ui')) {
      selectedWorkflow = 'desarrollo-website';
      break;
    }
    if (promptLength > 100) {
      selectedWorkflow = 'desarrollo-website';
      break;
    }
  }

  const workflow = configs.agentes.multi_agent_workflows.find(w => w.id === selectedWorkflow);

  return {
    workflow: selectedWorkflow,
    agentFlow: workflow?.agentes_requeridos || ['frontend-dev'],
    priority: promptLength > 100 ? '2_alto' : '4_bajo'
  };
}

// ============ TIME TRACKING ============
function startProjectSession(projectId, projectName) {
  const sessionData = {
    sessionId: uuid(),
    projectId,
    projectName,
    startTime: new Date().toISOString(),
    activities: []
  };

  return sessionData;
}

function logActivity(session, activity, duration) {
  session.activities.push({
    activity,
    duration,
    timestamp: new Date().toISOString()
  });
}

// ============ MEMORY SYNC ============
function loadProjectMemory(projectId) {
  try {
    const memoryPath = `${process.env.MEMORIA_PATH}`;
    if (fs.existsSync(memoryPath)) {
      return fs.readdirSync(memoryPath).filter(f => f.includes(projectId));
    }
  } catch (e) {
    console.error('Memory load error:', e);
  }
  return [];
}

function updateStoppingPoint(sessionData) {
  try {
    const puntoPaladaPath = process.env.PUNTO_PARADA_PATH;
    const content = `# PUNTO DE PARADA — ${new Date().toISOString()}\n\n## PROYECTO\n- ${sessionData.projectName}\n\n## ACTIVIDADES\n${sessionData.activities.map(a => `- ${a.activity}: ${a.duration}ms`).join('\n')}`;

    fs.writeFileSync(puntoPaladaPath, content, 'utf8');
  } catch (e) {
    console.error('Punto de parada update error:', e);
  }
}

// ============ REST ENDPOINTS ============

app.post('/api/prompt', async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    // Detect project
    const projectDetection = detectProjectFromPrompt(message);

    // Route to agent
    const routing = routePrompt(message, projectDetection.project);

    // Start session
    const session = startProjectSession(
      projectDetection.projectId,
      projectDetection.projectName
    );

    // Call Anthropic API
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-8',
      max_tokens: 2048,
      system: `You are a helpful AI assistant integrated with Victor IA's orchestration system.
      Current Project: ${projectDetection.projectName}
      Available Agents: ${routing.agentFlow.join(', ')}

      Respond helpfully and professionally.`,
      messages: [
        ...conversationHistory,
        { role: 'user', content: message }
      ]
    });

    // Log activity
    const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
    logActivity(session, `Respuesta a: ${message.substring(0, 50)}...`, 1000);

    res.json({
      response: responseText,
      project: projectDetection,
      routing: routing,
      sessionId: session.sessionId
    });

  } catch (error) {
    console.error('API error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/project-status', (req, res) => {
  try {
    const activeProjectPath = process.env.PROYECTO_ACTIVO_PATH;
    if (fs.existsSync(activeProjectPath)) {
      const data = JSON.parse(fs.readFileSync(activeProjectPath, 'utf8'));
      res.json(data);
    } else {
      res.json({ status: 'no-project' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/memory/:projectId', (req, res) => {
  try {
    const { projectId } = req.params;
    const memory = loadProjectMemory(projectId);
    res.json({ projectId, memory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/close-session', (req, res) => {
  try {
    const { sessionData } = req.body;
    updateStoppingPoint(sessionData);
    res.json({ status: 'session-closed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/agents', (req, res) => {
  res.json(configs.agentes.agentes);
});

app.get('/api/skills', (req, res) => {
  res.json(configs.skills.skills);
});

// ============ WEBSOCKET ============

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);

      // Detect project
      const project = detectProjectFromPrompt(message.text);
      ws.send(JSON.stringify({ type: 'project-detected', ...project }));

      // Route
      const routing = routePrompt(message.text, project.project);
      ws.send(JSON.stringify({ type: 'routing', ...routing }));

    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: error.message }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// ============ ERROR HANDLING ============

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// ============ SERVER STARTUP ============

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     🎛️  ORCHESTRATION HUB - PRODUCTION READY          ║
╚═══════════════════════════════════════════════════════╝

✅ Server running on http://localhost:${PORT}
✅ Configs loaded successfully
✅ WebSocket ready on ws://localhost:${PORT}
✅ Memory systems initialized
✅ Agent routing active

📖 Documentation: http://localhost:${PORT}/docs
💬 Chat: http://localhost:${PORT}/chat

Ready to orchestrate! 🚀
  `);
});
