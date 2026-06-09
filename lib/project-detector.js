export function detectProjectFromPrompt(prompt, projectsConfig) {
  if (!prompt || !projectsConfig) {
    return { projectId: null, confidence: 0, project: null };
  }

  const lowerPrompt = prompt.toLowerCase();
  let bestMatch = null;
  let bestConfidence = 0;

  // Exact keyword matching
  for (const proyecto of projectsConfig.proyectos) {
    for (const keyword of proyecto.keywords) {
      const lowerKeyword = keyword.toLowerCase();

      if (lowerPrompt.includes(lowerKeyword)) {
        const confidence = lowerKeyword.length / prompt.length;

        if (confidence > bestConfidence) {
          bestConfidence = Math.min(confidence, 0.95);
          bestMatch = { projectId: proyecto.id, project: proyecto };
        }
      }
    }
  }

  if (bestMatch) {
    return {
      projectId: bestMatch.projectId,
      projectName: bestMatch.project.nombre,
      confidence: bestConfidence,
      project: bestMatch.project
    };
  }

  return {
    projectId: null,
    projectName: 'General',
    confidence: 0,
    project: null
  };
}

export function fuzzyMatch(prompt, keyword) {
  const p = prompt.toLowerCase();
  const k = keyword.toLowerCase();

  let pIdx = 0;
  let kIdx = 0;

  while (pIdx < p.length && kIdx < k.length) {
    if (p[pIdx] === k[kIdx]) {
      kIdx++;
    }
    pIdx++;
  }

  return kIdx === k.length;
}

export function calculateConfidence(prompt, keyword) {
  const lowerPrompt = prompt.toLowerCase();
  const lowerKeyword = keyword.toLowerCase();

  if (lowerPrompt.includes(lowerKeyword)) {
    return Math.min(0.95, lowerKeyword.length / lowerPrompt.length);
  }

  if (fuzzyMatch(prompt, keyword)) {
    return 0.5;
  }

  return 0;
}