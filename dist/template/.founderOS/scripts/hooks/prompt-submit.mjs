// prompt-submit.mjs — UserPromptSubmit hook: preflight checks
import fs from 'node:fs';
import path from 'node:path';

// Kill switch
if (process.env.FOUNDER_OS_HOOKS === '0' || process.env.FOUNDER_OS_HOOKS === 'false') process.exit(0);

let stdinData = '';
process.stdin.on('data', d => stdinData += d);
process.stdin.on('end', () => {
  let prompt = '';
  try { prompt = JSON.parse(stdinData).prompt || stdinData; } catch { prompt = stdinData; }

  // Fast path: no founder-os command → exit silently
  const cmdMatch = prompt.match(/\/founder-os:(\w+):(\w+)/);
  if (!cmdMatch) process.exit(0);

  const [, namespace, action] = cmdMatch;
  const projectRoot = process.cwd();
  const cmdFile = path.join(projectRoot, '.claude', 'commands', namespace, `${action}.md`);

  if (!fs.existsSync(cmdFile)) {
    console.log(`[Preflight] Command file not found: ${cmdFile}`);
    process.exit(0);
  }

  // Parse YAML frontmatter
  const content = fs.readFileSync(cmdFile, 'utf-8');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!fmMatch) process.exit(0);

  const frontmatter = fmMatch[1];
  const warnings = [];
  const blocks = [];

  // Check requires-mcp
  const mcpMatch = frontmatter.match(/requires-mcp:\s*(.+)/);
  if (mcpMatch) {
    const required = mcpMatch[1].split(',').map(s => s.trim());
    for (const mcp of required) {
      const configPath = path.join(projectRoot, '.founderOS', 'infrastructure', 'mcp-configs', `${mcp}.json`);
      if (!fs.existsSync(configPath)) {
        warnings.push(`MCP server "${mcp}" config not found`);
      }
    }
  }

  // Check requires-files
  const filesMatch = frontmatter.match(/requires-files:\s*(.+)/);
  if (filesMatch) {
    const required = filesMatch[1].split(',').map(s => s.trim());
    for (const f of required) {
      if (!fs.existsSync(path.join(projectRoot, f))) {
        blocks.push(`Required file missing: ${f}`);
      }
    }
  }

  // Output preflight status
  if (blocks.length > 0) {
    console.log(`[Preflight: BLOCKED] ${namespace}:${action}`);
    blocks.forEach(b => console.log(`  - ${b}`));
  } else if (warnings.length > 0) {
    console.log(`[Preflight: DEGRADED] ${namespace}:${action}`);
    warnings.forEach(w => console.log(`  - ${w}`));
  }
  // If ready, output nothing (clean context)
});

// Fallback if stdin never closes (e.g., no data piped)
process.stdin.on('error', () => process.exit(0));
setTimeout(() => process.exit(0), 2500);
