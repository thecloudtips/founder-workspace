// post-tool.mjs — PostToolUse hook: intelligence observation
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { openDb, runSql, closeDb } from './lib/db-helper.mjs';

// Kill switch
if (process.env.FOUNDER_OS_HOOKS === '0' || process.env.FOUNDER_OS_HOOKS === 'false') process.exit(0);

let stdinData = '';
process.stdin.on('data', d => stdinData += d);
process.stdin.on('end', () => {
  let event;
  try { event = JSON.parse(stdinData); } catch { process.exit(0); }

  const toolName = event.tool_name || '';
  const toolInput = event.tool_input || {};

  // Only log Skill calls for founder-os commands
  if (toolName !== 'Skill') process.exit(0);
  const skillName = toolInput.skill || toolInput.name || '';
  if (!skillName.includes('founder-os')) process.exit(0);

  // Extract namespace:action from skill name
  const match = skillName.match(/founder-os:(\w+):?(\w*)/);
  if (!match) process.exit(0);

  const [, namespace, action] = match;
  const projectRoot = process.cwd();
  const intelDb = path.join(projectRoot, '.founderOS', 'infrastructure', 'intelligence', '.data', 'intelligence.db');

  if (!fs.existsSync(intelDb)) process.exit(0);

  try {
    const db = openDb(intelDb);
    const id = crypto.randomUUID();
    const sessionHash = crypto.createHash('md5').update(projectRoot).digest('hex').slice(0, 8);
    const payload = JSON.stringify({ tool_name: toolName, namespace, action });

    runSql(db, `INSERT INTO events (id, timestamp, session_id, plugin, command, event_type, payload, outcome) VALUES ('${id}', datetime('now'), '${sessionHash}', '${namespace}', '${action || 'unknown'}', 'post_command', '${payload.replace(/'/g, "''")}', 'success')`);
    closeDb(db);
  } catch {}
});

setTimeout(() => process.exit(0), 4500);
