import fs from 'fs';
import path from 'path';

export function loadProjectMemory(projectId, memoriaPath) {
  try {
    if (!memoriaPath || !fs.existsSync(memoriaPath)) {
      return { diarios: [], context: [] };
    }

    const files = fs.readdirSync(memoriaPath);
    const projectDiarios = files.filter(f =>
      f.includes(projectId) || f.includes('diary')
    );

    const diarioContents = projectDiarios.map(file => ({
      filename: file,
      content: fs.readFileSync(path.join(memoriaPath, file), 'utf8').substring(0, 500)
    }));

    return {
      diarios: diarioContents,
      context: projectDiarios
    };
  } catch (error) {
    console.error('Memory load error:', error);
    return { diarios: [], context: [] };
  }
}

export function updateProjectMemory(projectId, updates, memoriaPath) {
  try {
    if (!memoriaPath) return false;

    const timestamp = new Date().toISOString();
    const filename = `diary_${projectId}_${timestamp.split('T')[0]}.md`;
    const filepath = path.join(memoriaPath, filename);

    const content = `# Update — ${timestamp}\n\n${updates.content || ''}\n\n---\nAuto-updated at ${timestamp}`;

    fs.writeFileSync(filepath, content, 'utf8');
    return true;
  } catch (error) {
    console.error('Memory update error:', error);
    return false;
  }
}

export function logToProjectDiary(projectId, activity, memoriaPath) {
  try {
    if (!memoriaPath) return false;

    const timestamp = new Date().toISOString();
    const diaryEntry = `\n- [${timestamp}] ${activity}`;

    const filename = `diary_${projectId}.md`;
    const filepath = path.join(memoriaPath, filename);

    if (fs.existsSync(filepath)) {
      const current = fs.readFileSync(filepath, 'utf8');
      fs.writeFileSync(filepath, current + diaryEntry, 'utf8');
    } else {
      fs.writeFileSync(filepath, `# Diario ${projectId}\n${diaryEntry}`, 'utf8');
    }

    return true;
  } catch (error) {
    console.error('Diary log error:', error);
    return false;
  }
}

export function updateStoppingPoint(projectId, sessionData, puntoPaladaPath) {
  try {
    if (!puntoPaladaPath) return false;

    const timestamp = new Date().toISOString();
    const activitiesLog = sessionData.activities
      .map(a => `- ${a.activity} (${a.duration}ms)`)
      .join('\n');

    const content = `# PUNTO DE PARADA — ${timestamp}

## PROYECTO
- **ID:** ${projectId}
- **Nombre:** ${sessionData.projectName || 'Unknown'}
- **Sesión:** ${sessionData.sessionId}

## ACTIVIDADES
${activitiesLog}

## ESTADO
- Tiempo total: ${sessionData.activities.reduce((sum, a) => sum + (a.duration || 0), 0)}ms
- Actividades: ${sessionData.activities.length}

---
Actualizado automáticamente a las ${timestamp}`;

    fs.writeFileSync(puntoPaladaPath, content, 'utf8');
    return true;
  } catch (error) {
    console.error('Punto de parada update error:', error);
    return false;
  }
}

export function getMemoryContext(projectId, memoriaPath) {
  const memory = loadProjectMemory(projectId, memoriaPath);
  return {
    projectId,
    diaryCount: memory.diarios.length,
    lastDiaries: memory.diarios.slice(0, 3),
    context: memory.context
  };
}