export function analyzePromptComplexity(prompt) {
  let complexity = 0;

  // Length analysis
  if (prompt.length > 200) complexity += 30;
  else if (prompt.length > 100) complexity += 20;
  else complexity += 10;

  // Keyword analysis
  const complexityKeywords = ['arquitecto', 'diseña', 'implementa', 'refactor', 'crea', 'desarrolla'];
  const simpleKeywords = ['ayuda', 'explica', 'qué', 'cómo'];

  for (const keyword of complexityKeywords) {
    if (prompt.toLowerCase().includes(keyword)) complexity += 20;
  }

  for (const keyword of simpleKeywords) {
    if (prompt.toLowerCase().includes(keyword)) complexity -= 10;
  }

  return Math.min(100, Math.max(0, complexity));
}

export function selectWorkflow(prompt, projectType, routingRules) {
  const complexity = analyzePromptComplexity(prompt);
  const lowerPrompt = prompt.toLowerCase();

  // Video workflow
  if (lowerPrompt.includes('video') || lowerPrompt.includes('kling') || lowerPrompt.includes('runway')) {
    return 'produccion-video';
  }

  // Design workflow
  if (lowerPrompt.includes('diseña') || lowerPrompt.includes('ui') || lowerPrompt.includes('figma')) {
    return 'desarrollo-website';
  }

  // Code review workflow
  if (lowerPrompt.includes('revisa') || lowerPrompt.includes('review')) {
    return 'tarea-simple';
  }

  // Default by complexity
  return complexity > 40 ? 'desarrollo-website' : 'tarea-simple';
}

export function routePrompt(prompt, project, routingRules, agentsConfig) {
  const workflow = selectWorkflow(prompt, project?.tipo, routingRules);
  const workflowConfig = agentsConfig.multi_agent_workflows.find(w => w.id === workflow);

  const complexity = analyzePromptComplexity(prompt);
  const priority = complexity > 50 ? '2_alto' : complexity > 25 ? '3_normal' : '4_bajo';

  return {
    workflow: workflow,
    agentFlow: workflowConfig?.agentes_requeridos || ['frontend-dev'],
    priority: priority,
    complexity: complexity
  };
}

export function getPriorityLevel(promptLength) {
  if (promptLength > 500) return '1_critico';
  if (promptLength > 200) return '2_alto';
  if (promptLength > 50) return '3_normal';
  return '4_bajo';
}