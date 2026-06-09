# 🚀 Quick Start — Unified Orchestration Hub

**5 minutos para tener todo funcionando.**

## 1️⃣ Install Dependencies

```bash
npm install
```

## 2️⃣ Setup Environment

```bash
# Copy template
cp .env.example .env

# Edit .env with your API keys
# ANTHROPIC_API_KEY=sk_...
```

## 3️⃣ Verify Configuration

All config files are ready:
- ✅ `config/PROYECTOS_CONFIG.json` — Projects mapped
- ✅ `config/AGENTES_CONFIG.json` — Agents configured
- ✅ `config/SKILLS_CONFIG.json` — Skills mapped
- ✅ `config/MCP_CONFIG.json` — MCP servers ready
- ✅ `config/ROUTING_RULES.json` — Routing rules set

## 4️⃣ Start Server

```bash
npm start
```

You should see:
```
✅ Server running on http://localhost:3000
✅ Configs loaded successfully
✅ Memory systems initialized
```

## 5️⃣ Open Chat

Open in browser:
```
http://localhost:3000
```

---

## 🎯 First Steps in Chat

Try these commands to test:

```
# 1. Detect a project
"Necesito trabajar en la homepage de Victor IA"

# 2. Request a task
"@arquitecto: diseña un nuevo header para el website"

# 3. Run a skill
"/pixel-perfecto"

# 4. Execute CLI
"$ git status"
```

---

## ✅ Validation Checklist

- [ ] npm install completed without errors
- [ ] .env file has ANTHROPIC_API_KEY
- [ ] Server starts and shows "ready" message
- [ ] Browser shows chat interface
- [ ] Can send a message and receive response
- [ ] Project detection works (check browser console)
- [ ] Agent status panel shows agents available

---

## 🆘 Troubleshooting

| Issue | Solution |
|---|---|
| `Module not found` | Run `npm install` again |
| `ANTHROPIC_API_KEY not set` | Add key to `.env` |
| `Port 3000 already in use` | Change PORT in `.env` |
| `Config files not found` | Verify `config/` directory exists |
| `Memory sync error` | Check paths in `.env` match your system |

---

## 📚 Full Documentation

- **Architecture:** [SYSTEM-ARCHITECTURE.md](docs/SYSTEM-ARCHITECTURE.md)
- **Setup:** [SETUP-GUIDE.md](docs/SETUP-GUIDE.md)
- **API:** [API-REFERENCE.md](docs/API-REFERENCE.md)
- **Usage:** [USER-GUIDE.md](docs/USER-GUIDE.md)

---

## 🎛️ What's Running

```
Chat Interface (html)
    ↓
REST API (Express)
    ↓
Orchestration Engine
    ├── Project Detection
    ├── Agent Routing
    ├── Memory Sync
    ├── MCP Bridge
    ├── CLI Executor
    └── Deep Learning Checker
    ↓
Anthropic API (Claude models)
```

---

**Ready to go. Start chatting!** 🚀
