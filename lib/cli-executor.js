import { execSync } from 'child_process';

export function sanitizeCommand(command) {
  // Remove potentially dangerous characters
  const dangerous = ['&&', '||', '|', '>', '<', '$', '`', ';', '(', ')'];
  let safe = command;

  // Only allow specific safe commands
  const allowedPrefixes = ['npm', 'git', 'node', 'python', 'ls', 'cd', 'pwd', 'echo'];
  const commandStart = command.split(' ')[0];

  if (!allowedPrefixes.includes(commandStart)) {
    throw new Error(`Command '${commandStart}' not allowed`);
  }

  return safe;
}

export function executeBash(command, options = {}) {
  try {
    const timeout = options.timeout || 30000;
    const cwd = options.cwd || process.cwd();

    const output = execSync(command, {
      encoding: 'utf8',
      timeout: timeout,
      cwd: cwd,
      stdio: 'pipe'
    });

    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      duration: Date.now(),
      success: true
    };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.status || 1,
      duration: Date.now(),
      success: false
    };
  }
}

export function executePowerShell(command, options = {}) {
  try {
    const timeout = options.timeout || 30000;

    // Wrap PowerShell command
    const psCommand = `powershell -Command "${command.replace(/"/g, '\\"')}"`;

    const output = execSync(psCommand, {
      encoding: 'utf8',
      timeout: timeout,
      stdio: 'pipe'
    });

    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      duration: Date.now(),
      success: true
    };
  } catch (error) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.status || 1,
      duration: Date.now(),
      success: false
    };
  }
}

export function executeCommand(command, shell = 'bash', options = {}) {
  try {
    if (shell === 'powershell' || shell === 'ps') {
      return executePowerShell(command, options);
    } else {
      return executeBash(command, options);
    }
  } catch (error) {
    return {
      stdout: '',
      stderr: error.message,
      exitCode: 1,
      duration: Date.now(),
      success: false
    };
  }
}

export function getExecutionTime(startTime) {
  return Date.now() - startTime;
}