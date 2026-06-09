# 🎛️ Unified Orchestration Hub

**Estado:** En construcción  
**Objetivo:** Un sistema de chat que replica el flujo COMPLETO de Victor IA (detección de proyecto → routing → tracking → memoria → entrega)

## 📁 Estructura de Archivos

```
~/.agents/.harness/orchestration/
├── orchestration-server.js          ← Backend principal (Express)
├── chat-client.html                 ← Frontend (single-file)
├── package.json                     ← Dependencies
├── .env.example                     ← Environment variables template
│
├── config/
│   ├── AGENTES_CONFIG.json         ← Mapa de agentes
│   ├── SKILLS_CONFIG.json          ← Mapa de skills
│   ├── PROYECTOS_CONFIG.json       ← Detección de proyectos
│   ├── MCP_CONFIG.json             ← MCP servers
│   └── ROUTING_RULES.json          ← Reglas de routing
│
├── lib/
│   ├── mcp-bridge.js               ← Conexión a MCP servers
│   ├── memory-sync.js              ← Sincronización de memoria
│   ├── deep-learning-checker.js    ← Validación buenos/malos ejemplos
│   ├── cli-executor.js             ← Ejecución de CLI
│   ├── tracking-logger.js          ← Logging de tiempo
│   └── project-detector.js         ← Detección automática de proyecto
│
├── docs/
│   ├── SYSTEM-ARCHITECTURE.md      ← Diagrama del sistema
│   ├── SETUP-GUIDE.md              ← Guía de instalación
│   ├── API-REFERENCE.md            ← Documentación de endpoints
│   ├── USER-GUIDE.md               ← Cómo usar el chat
│   └── CONFIG-REFERENCE.md         ← Guía de configuración
│
└── scripts/
    ├── setup.ps1                    ← Setup en PowerShell
    └── setup.sh                     ← Setup en Bash
```

## 🚀 Quick Start

```bash
# 1. Instalar dependencies
npm install

# 2. Copiar config templates
cp config/PROYECTOS_CONFIG.json.example config/PROYECTOS_CONFIG.json

# 3. Iniciar servidor
npm start

# 4. Abrir chat en navegador
# http://localhost:3000
```

## 🔄 Flujo Completo

```
Usuario escribe prompt en chat
    ↓
[DETECCIÓN] Sistema detecta proyecto automáticamente
    ↓
[ROUTING] Router elige agente/skill correcto
    ↓
[MEMORIA] Carga diarios relevantes
    ↓
[ORQUESTACIÓN] Ejecuta Líder → Implementador → Revisor si aplica
    ↓
[TRACKING] Registra tiempo en proyecto-activo.json
    ↓
[VALIDACIÓN] Chequea buenos-ejemplos.md y malos-ejemplos.md
    ↓
[ENTREGA] Actualiza punto-de-parada.md, diarios, MEMORY.md
    ↓
Resultado en chat
```

## 📋 Componentes Principales

| Componente | Responsabilidad |
|---|---|
| **orchestration-server.js** | Orquestación principal, routing, tracking |
| **project-detector.js** | Detecta proyecto por keywords |
| **mcp-bridge.js** | Conecta MCP servers |
| **memory-sync.js** | Lee/escribe memoria (diarios) |
| **cli-executor.js** | Ejecuta comandos CLI |
| **deep-learning-checker.js** | Valida contra ejemplos previos |
| **chat-client.html** | Interfaz web |

## 🎯 Capacidades

- ✅ Chat unificado para todas las herramientas
- ✅ Detección automática de proyecto
- ✅ Routing inteligente a agentes/skills
- ✅ Tracking de tiempo automático
- ✅ Sincronización de memoria
- ✅ Validación de calidad (deep learning)
- ✅ Ejecución de CLI desde chat
- ✅ Invocación de MCP servers
- ✅ Orquestación multiagente

---

**Próximo paso:** Espera a que los agentes terminen de generar todos los archivos.
