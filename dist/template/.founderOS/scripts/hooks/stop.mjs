// stop.mjs — Stop hook: flush + cleanup
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { openDb, runSql, closeDb } from './lib/db-helper.mjs';

// Kill switch
if (process.env.FOUNDER_OS_HOOKS === '0' || process.env.FOUNDER_OS_HOOKS === 'false') process.exit(0);

const projectRoot = process.cwd();
const hash = crypto.createHash('md5').update(projectRoot).digest('hex').slice(0, 8);

// 1. Clean up session temp files (use hashed path — canonical per spec section 6+9)
const sessionFile = `/tmp/fos-session-init-${hash}.json`;
try { if (fs.existsSync(sessionFile)) fs.unlinkSync(sessionFile); } catch {}

// Clean up eval temp files
try {
  const tmpFiles = fs.readdirSync('/tmp').filter(f => f.startsWith(`fos-exec-${hash}-`));
  tmpFiles.forEach(f => { try { fs.unlinkSync(`/tmp/${f}`); } catch {} });
} catch {}

// Clean up decay marker
try { const dm = `/tmp/fos-decay-${hash}.txt`; if (fs.existsSync(dm)) fs.unlinkSync(dm); } catch {}

// 2. Write session summary to intelligence.db
const intelDb = path.join(projectRoot, '.founderOS', 'infrastructure', 'intelligence', '.data', 'intelligence.db');
if (fs.existsSync(intelDb)) {
  try {
    const db = openDb(intelDb);
    const id = crypto.randomUUID();
    const payload = JSON.stringify({ type: 'session_end', timestamp: new Date().toISOString() });
    runSql(db, `INSERT INTO events (id, timestamp, session_id, plugin, command, event_type, payload, outcome) VALUES ('${id}', datetime('now'), '${hash}', 'system', 'session', 'post_command', '${payload.replace(/'/g, "''")}', 'success')`);
    closeDb(db);
  } catch {}
}

process.exit(0);
