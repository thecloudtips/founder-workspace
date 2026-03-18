// session-start.mjs — SessionStart hook: dispatcher rules + context + patterns
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { openDb, querySql, runSql, closeDb } from './lib/db-helper.mjs';

// Kill switch — exit with no output
if (process.env.FOUNDER_OS_HOOKS === '0' || process.env.FOUNDER_OS_HOOKS === 'false') process.exit(0);

const projectRoot = process.cwd();
const lines = [];

// 1. Dispatcher rules
lines.push(`## Founder OS Dispatcher Rules

When executing any /founder-os:* command:
1. Read the command file's YAML frontmatter
2. Check for \`execution-mode\` field (default: background)
3. Check for user override flags: --foreground, --background
4. If execution-mode is "background" (and no --foreground flag):
   - Spawn an Agent with run_in_background: true
   - Pass the full command content, user arguments, business context paths,
     top 5 memories, and active intelligence patterns
   - Print "Running [namespace]:[action] in background..." to the user
   - The main session stays free for new input
5. If execution-mode is "foreground" (or --foreground flag):
   - Execute inline in the main session
`);

// 2. Business context
const contextDir = path.join(projectRoot, '.founderOS', 'infrastructure', 'context', 'active');
if (fs.existsSync(contextDir)) {
  const files = fs.readdirSync(contextDir).filter(f => f.endsWith('.md'));
  if (files.length > 0) {
    lines.push('## Business Context Files');
    files.forEach(f => lines.push(`- ${path.join(contextDir, f)}`));
    lines.push('');
  }
}

// 3. Active intelligence patterns
const intelDb = path.join(projectRoot, '.founderOS', 'infrastructure', 'intelligence', '.data', 'intelligence.db');
if (fs.existsSync(intelDb)) {
  try {
    const db = openDb(intelDb);
    const patterns = querySql(db, "SELECT description, instruction FROM patterns WHERE status IN ('active','approved') ORDER BY confidence DESC LIMIT 5");
    closeDb(db);
    if (patterns.length > 0) {
      lines.push('## Active Intelligence Patterns');
      patterns.forEach(p => lines.push(`- ${p.description}: ${p.instruction}`));
      lines.push('');
    }
  } catch {}
}

// 4. Memory decay (once per day)
const hash = crypto.createHash('md5').update(projectRoot).digest('hex').slice(0, 8);
const decayMarker = `/tmp/fos-decay-${hash}.txt`;
const memDb = path.join(projectRoot, '.memory', 'memory.db');
if (fs.existsSync(memDb)) {
  let shouldDecay = true;
  try {
    const lastDecay = fs.readFileSync(decayMarker, 'utf-8').trim();
    const elapsed = Date.now() - parseInt(lastDecay, 10);
    if (elapsed < 86400000) shouldDecay = false; // 24h
  } catch {}
  if (shouldDecay) {
    try {
      const db = openDb(memDb);
      runSql(db, "UPDATE memories SET confidence = MAX(0, confidence - 5), updated_at = unixepoch() WHERE status NOT IN ('dismissed') AND (last_used_at IS NULL OR last_used_at < unixepoch() - 2592000) AND confidence > 0");
      runSql(db, "DELETE FROM memories WHERE confidence < 10 AND status != 'dismissed'");
      closeDb(db);
      fs.writeFileSync(decayMarker, String(Date.now()));
    } catch {}
  }
}

// Output everything to stdout
console.log(lines.join('\n'));
