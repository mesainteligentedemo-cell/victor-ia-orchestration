import fs from 'fs';

export function loadPatterns(goodExamplesPath, badExamplesPath) {
  const patterns = {
    good: [],
    bad: []
  };

  try {
    if (goodExamplesPath && fs.existsSync(goodExamplesPath)) {
      const content = fs.readFileSync(goodExamplesPath, 'utf8');
      // Parse markdown to extract patterns
      patterns.good = extractPatterns(content);
    }

    if (badExamplesPath && fs.existsSync(badExamplesPath)) {
      const content = fs.readFileSync(badExamplesPath, 'utf8');
      patterns.bad = extractPatterns(content);
    }
  } catch (error) {
    console.error('Pattern load error:', error);
  }

  return patterns;
}

function extractPatterns(content) {
  const patterns = [];
  const sections = content.split('##');

  for (const section of sections) {
    const lines = section.trim().split('\n');
    if (lines.length > 0) {
      patterns.push({
        title: lines[0],
        content: lines.slice(1).join('\n').substring(0, 200),
        fullContent: section
      });
    }
  }

  return patterns;
}

export function validateAgainstGoodExamples(output, taskType, patterns) {
  if (!patterns || !patterns.good || patterns.good.length === 0) {
    return { valid: true, score: 0.5, reason: 'No good examples to compare' };
  }

  let score = 0;

  // Check for common good patterns
  for (const pattern of patterns.good) {
    const keywords = pattern.title.toLowerCase().split(' ');
    const outputLower = output.toLowerCase();

    for (const keyword of keywords) {
      if (outputLower.includes(keyword)) {
        score += 0.1;
      }
    }
  }

  score = Math.min(1, score);

  return {
    valid: score > 0.4,
    score: score,
    reason: score > 0.4 ? 'Matches good patterns' : 'Low pattern match'
  };
}

export function checkForBadPatterns(output, taskType, patterns) {
  if (!patterns || !patterns.bad || patterns.bad.length === 0) {
    return { hasBadPatterns: false, patterns: [] };
  }

  const found = [];
  const outputLower = output.toLowerCase();

  for (const badPattern of patterns.bad) {
    const keywords = badPattern.title.toLowerCase().split(' ');

    for (const keyword of keywords) {
      if (outputLower.includes(keyword)) {
        found.push(badPattern.title);
        break;
      }
    }
  }

  return {
    hasBadPatterns: found.length > 0,
    patterns: found,
    recommendations: found.length > 0
      ? `Detected ${found.length} anti-patterns: ${found.join(', ')}`
      : 'No bad patterns detected'
  };
}

export function logSuccess(taskType, output, goodExamplesPath) {
  try {
    if (!goodExamplesPath) return false;

    const timestamp = new Date().toISOString();
    const entry = `\n## [${timestamp}] SUCCESS — ${taskType}\n**Output:** ${output.substring(0, 100)}...\n`;

    if (fs.existsSync(goodExamplesPath)) {
      const current = fs.readFileSync(goodExamplesPath, 'utf8');
      fs.writeFileSync(goodExamplesPath, current + entry, 'utf8');
    }

    return true;
  } catch (error) {
    console.error('Success log error:', error);
    return false;
  }
}

export function logFailure(taskType, output, reason, badExamplesPath) {
  try {
    if (!badExamplesPath) return false;

    const timestamp = new Date().toISOString();
    const entry = `\n## [${timestamp}] FAILURE — ${taskType}\n**Reason:** ${reason}\n**Output:** ${output.substring(0, 100)}...\n`;

    if (fs.existsSync(badExamplesPath)) {
      const current = fs.readFileSync(badExamplesPath, 'utf8');
      fs.writeFileSync(badExamplesPath, current + entry, 'utf8');
    }

    return true;
  } catch (error) {
    console.error('Failure log error:', error);
    return false;
  }
}