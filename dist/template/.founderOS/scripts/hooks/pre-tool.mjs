// pre-tool.mjs — PreToolUse hook: lazy init memory + intelligence DBs
import fs from 'node:fs';
import crypto from 'node:crypto';
import { initMemoryDb } from './lib/memory-init.mjs';
import { initIntelligenceDb } from './lib/intelligence-init.mjs';

const allow = () => { console.log(JSON.stringify({ decision: 'allow' })); process.exit(0); };

// Kill switch
if (process.env.FOUNDER_OS_HOOKS === '0' || process.env.FOUNDER_OS_HOOKS === 'false') allow();

// Project-specific session file
const projectHash = crypto.createHash('md5').update(process.cwd()).digest('hex').slice(0, 8);
const SESSION_FILE = `/tmp/fos-session-init-${projectHash}.json`;

function getSessionState() {
  try { return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8')); }
  catch { return { memoryReady: false, intelligenceReady: false }; }
}

// Read stdin
let stdinData = '';
process.stdin.on('data', d => stdinData += d);
process.stdin.on('end', () => {
  const state = getSessionState();
  const projectRoot = process.cwd();

  if (!state.memoryReady) {
    const result = initMemoryDb(projectRoot);
    state.memoryReady = result.ready;
  }

  if (!state.intelligenceReady) {
    const result = initIntelligenceDb(projectRoot);
    state.intelligenceReady = result.ready;
  }

  try { fs.writeFileSync(SESSION_FILE, JSON.stringify(state)); } catch {}
  allow();
});

// If stdin closes immediately (no data piped), still allow
setTimeout(() => allow(), 1500);
