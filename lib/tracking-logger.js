import fs from 'fs';
import path from 'path';

export function startProjectSession(projectId, clientName, proyectoActivoPath) {
  const sessionData = {
    sessionId: generateSessionId(),
    projectId: projectId,
    projectName: clientName,
    startTime: new Date().toISOString(),
    activities: [],
    status: 'active'
  };

  // Save to proyecto-activo.json
  if (proyectoActivoPath) {
    try {
      fs.writeFileSync(
        proyectoActivoPath,
        JSON.stringify(sessionData, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Session save error:', error);
    }
  }

  return sessionData;
}

export function logActivity(session, activity, duration = 0) {
  session.activities.push({
    activity: activity,
    duration: duration || Date.now(),
    timestamp: new Date().toISOString()
  });

  return session;
}

export function endProjectSession(session, proyectoActivoPath) {
  session.status = 'closed';
  session.endTime = new Date().toISOString();

  const totalDuration = calculateTotalDuration(session.activities);
  session.totalDuration = totalDuration;

  if (proyectoActivoPath) {
    try {
      fs.writeFileSync(
        proyectoActivoPath,
        JSON.stringify(session, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Session end error:', error);
    }
  }

  return session;
}

export function getSessionStats(projectId, proyectoActivoPath) {
  try {
    if (!proyectoActivoPath || !fs.existsSync(proyectoActivoPath)) {
      return null;
    }

    const data = JSON.parse(fs.readFileSync(proyectoActivoPath, 'utf8'));

    if (data.projectId !== projectId) {
      return null;
    }

    return {
      sessionId: data.sessionId,
      projectId: data.projectId,
      projectName: data.projectName,
      startTime: data.startTime,
      endTime: data.endTime,
      totalDuration: data.totalDuration || 0,
      activitiesCount: data.activities?.length || 0,
      activities: data.activities || []
    };
  } catch (error) {
    console.error('Stats read error:', error);
    return null;
  }
}

export function resumeSession(projectId, proyectoActivoPath) {
  try {
    if (!proyectoActivoPath || !fs.existsSync(proyectoActivoPath)) {
      return null;
    }

    const data = JSON.parse(fs.readFileSync(proyectoActivoPath, 'utf8'));

    if (data.projectId === projectId && data.status === 'active') {
      return data;
    }

    return null;
  } catch (error) {
    console.error('Resume session error:', error);
    return null;
  }
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function calculateTotalDuration(activities) {
  return activities.reduce((total, activity) => {
    return total + (activity.duration || 0);
  }, 0);
}

export function formatDuration(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }

  return `${seconds}s`;
}