# [18] Init Runtime Wiring Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance founderOS init to wire up 5 Claude Code hooks, activate the dispatcher, and enable lazy initialization of memory and intelligence engines.

**Architecture:** Hook scripts (Node.js) are shipped in the dist template and registered in `.claude/settings.json` during init. SessionStart injects dispatcher rules via stdout. PreToolUse lazy-inits DBs. PostToolUse logs observations. Stop flushes state. All hooks read stdin for event data and check `FOUNDER_OS_HOOKS=0` kill switch.

**Tech Stack:** Node.js (ESM), SQLite3 (via child_process), Claude Code hooks API

**Spec:** `docs/superpowers/specs/[18]-2026-03-17-init-runtime-wiring-design.md`

---

## Chunk 1: Foundation — Shared Libraries and Hook Registry

### Task 1.1: Create db-helper.mjs (shared SQLite helper)

**Files:**
- Create: `founder-os-dist/template/.founderOS/scripts/hooks/lib/db-helper.mjs`
- Test: `founder-os-dist/tests/test-db-helper.sh`

- [ ] **Step 1: Write the test script**

```bash
#!/bin/bash
# tests/test-db-helper.sh — verify db-helper.mjs works
set -e
cd "$(dirname "$0")/.."

echo "=== Test: db-helper.mjs ==="

# Create temp dir
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Copy the helper
mkdir -p "$TMPDIR/hooks/lib"
cp template/.founderOS/scripts/hooks/lib/db-helper.mjs "$TMPDIR/hooks/lib/"

# Test 1: openDb creates a new database
node --input-type=module -e "
import { openDb, runSql, querySql, closeDb } from '$TMPDIR/hooks/lib/db-helper.mjs';
const db = openDb('$TMPDIR/test.db');
runSql(db, 'CREATE TABLE t (id INTEGER PRIMARY KEY, val TEXT)');
runSql(db, 'INSERT INTO t (val) VALUES (?)', ['hello']);
const rows = querySql(db, 'SELECT val FROM t');
console.assert(rows[0].val === 'hello', 'Expected hello');
closeDb(db);
console.log('PASS: basic CRUD');
"

# Test 2: openDb with retry on locked
node --input-type=module -e "
import { openDb, closeDb } from '$TMPDIR/hooks/lib/db-helper.mjs';
const db = openDb('$TMPDIR/test.db');
closeDb(db);
console.log('PASS: open existing db');
"

# Test 3: runSqlFile executes a .sql file
cat > "$TMPDIR/schema.sql" << 'SQL'
CREATE TABLE IF NOT EXISTS demo (id TEXT PRIMARY KEY, name TEXT);
CREATE INDEX IF NOT EXISTS idx_demo_name ON demo(name);
SQL
node --input-type=module -e "
import { openDb, runSqlFile, querySql, closeDb } from '$TMPDIR/hooks/lib/db-helper.mjs';
const db = openDb('$TMPDIR/test2.db');
runSqlFile(db, '$TMPDIR/schema.sql');
const tables = querySql(db, \"SELECT name FROM sqlite_master WHERE type='table'\");
console.assert(tables.some(t => t.name === 'demo'), 'Expected demo table');
closeDb(db);
console.log('PASS: runSqlFile');
"

echo "All db-helper tests passed"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash founder-os-dist/tests/test-db-helper.sh`
Expected: FAIL — db-helper.mjs does not exist yet

- [ ] **Step 3: Write db-helper.mjs**

```javascript
// lib/db-helper.mjs — Shared SQLite helpers for hook scripts
// Uses child_process to call sqlite3 CLI (no npm dependencies)
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

export function openDb(dbPath) {
  // Ensure parent directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // Return path — sqlite3 CLI is stateless per call
  return { path: dbPath };
}

export function runSql(db, sql, params = []) {
  // Substitute ? params with escaped values
  let query = sql;
  for (const p of params) {
    const escaped = String(p).replace(/'/g, "''");
    query = query.replace('?', `'${escaped}'`);
  }
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      execSync(`sqlite3 "${db.path}" "${query.replace(/"/g, '\\"')}"`, {
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 5000,
      });
      return;
    } catch (err) {
      if (err.message?.includes('locked') && attempt < MAX_RETRIES - 1) {
        execSync(`sleep ${RETRY_DELAY_MS / 1000}`);
        continue;
      }
      throw err;
    }
  }
}

export function querySql(db, sql) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = execSync(
        `sqlite3 -json "${db.path}" "${sql.replace(/"/g, '\\"')}"`,
        { stdio: ['pipe', 'pipe', 'pipe'], timeout: 5000 }
      );
      const text = result.toString().trim();
      if (!text) return [];
      return JSON.parse(text);
    } catch (err) {
      if (err.message?.includes('locked') && attempt < MAX_RETRIES - 1) {
        execSync(`sleep ${RETRY_DELAY_MS / 1000}`);
        continue;
      }
      // If sqlite3 -json is not supported, fall back
      if (err.message?.includes('-json')) {
        return querySqlFallback(db, sql);
      }
      throw err;
    }
  }
  return [];
}

function querySqlFallback(db, sql) {
  const result = execSync(
    `sqlite3 -header -separator '|' "${db.path}" "${sql.replace(/"/g, '\\"')}"`,
    { stdio: ['pipe', 'pipe', 'pipe'], timeout: 5000 }
  );
  const lines = result.toString().trim().split('\n').filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split('|');
  return lines.slice(1).map(line => {
    const vals = line.split('|');
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

export function runSqlFile(db, sqlFilePath) {
  const sql = fs.readFileSync(sqlFilePath, 'utf-8');
  execSync(`sqlite3 "${db.path}" < "${sqlFilePath}"`, {
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10000,
  });
}

export function closeDb(db) {
  // No-op for CLI-based approach — included for API consistency
}

export function tableCount(db) {
  const rows = querySql(db, "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table'");
  return parseInt(rows[0]?.cnt || '0', 10);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash founder-os-dist/tests/test-db-helper.sh`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add founder-os-dist/template/.founderOS/scripts/hooks/lib/db-helper.mjs founder-os-dist/tests/test-db-helper.sh
git commit -m "feat(hooks): add shared SQLite helper for hook scripts [18]"
```

---

### Task 1.2: Create memory-init.mjs and intelligence-init.mjs

**Files:**
- Create: `founder-os-dist/template/.founderOS/scripts/hooks/lib/memory-init.mjs`
- Create: `founder-os-dist/template/.founderOS/scripts/hooks/lib/intelligence-init.mjs`
- Test: `founder-os-dist/tests/test-db-init.sh`

- [ ] **Step 1: Write the test script**

```bash
#!/bin/bash
# tests/test-db-init.sh — verify lazy init creates DBs with correct schemas
set -e
cd "$(dirname "$0")/.."

echo "=== Test: DB lazy init ==="

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Set up a mock project structure
mkdir -p "$TMPDIR/.founderOS/infrastructure/memory/schema"
mkdir -p "$TMPDIR/.founderOS/infrastructure/intelligence/hooks/schema"
mkdir -p "$TMPDIR/.founderOS/infrastructure/intelligence/.data"
mkdir -p "$TMPDIR/.founderOS/scripts/hooks/lib"
mkdir -p "$TMPDIR/.memory"

# Copy schema files
cp template/.founderOS/infrastructure/memory/schema/memory-store.sql \
   "$TMPDIR/.founderOS/infrastructure/memory/schema/" 2>/dev/null || \
   echo "SKIP: memory schema not in template yet"

cp template/.founderOS/infrastructure/intelligence/hooks/schema/intelligence.sql \
   "$TMPDIR/.founderOS/infrastructure/intelligence/hooks/schema/" 2>/dev/null || \
   echo "SKIP: intelligence schema not in template yet"

# Copy helper modules
cp template/.founderOS/scripts/hooks/lib/db-helper.mjs "$TMPDIR/.founderOS/scripts/hooks/lib/"
cp template/.founderOS/scripts/hooks/lib/memory-init.mjs "$TMPDIR/.founderOS/scripts/hooks/lib/"
cp template/.founderOS/scripts/hooks/lib/intelligence-init.mjs "$TMPDIR/.founderOS/scripts/hooks/lib/"

# Test 1: Memory init creates DB with correct tables
node --input-type=module -e "
import { initMemoryDb } from '$TMPDIR/.founderOS/scripts/hooks/lib/memory-init.mjs';
const result = initMemoryDb('$TMPDIR');
console.assert(result.ready === true, 'Expected ready=true, got ' + result.ready);
console.assert(result.tables >= 3, 'Expected 3+ tables, got ' + result.tables);
console.log('PASS: memory init (' + result.tables + ' tables)');
"

# Test 2: Intelligence init creates DB with correct tables
node --input-type=module -e "
import { initIntelligenceDb } from '$TMPDIR/.founderOS/scripts/hooks/lib/intelligence-init.mjs';
const result = initIntelligenceDb('$TMPDIR');
console.assert(result.ready === true, 'Expected ready=true, got ' + result.ready);
console.assert(result.tables >= 8, 'Expected 8+ tables, got ' + result.tables);
console.log('PASS: intelligence init (' + result.tables + ' tables)');
"

# Test 3: Re-running init is idempotent (no errors, same table count)
node --input-type=module -e "
import { initMemoryDb } from '$TMPDIR/.founderOS/scripts/hooks/lib/memory-init.mjs';
const r1 = initMemoryDb('$TMPDIR');
const r2 = initMemoryDb('$TMPDIR');
console.assert(r1.tables === r2.tables, 'Tables should match');
console.log('PASS: idempotent re-init');
"

echo "All DB init tests passed"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash founder-os-dist/tests/test-db-init.sh`
Expected: FAIL — init modules don't exist yet

- [ ] **Step 3: Write memory-init.mjs**

```javascript
// lib/memory-init.mjs — Lazy initialization for Memory Engine DB
import path from 'node:path';
import fs from 'node:fs';
import { openDb, runSqlFile, tableCount, closeDb } from './db-helper.mjs';

const MEMORY_DB_REL = '.memory/memory.db';
const MEMORY_SCHEMA_REL = '.founderOS/infrastructure/memory/schema/memory-store.sql';
const REQUIRED_TABLES = 3; // memories, observations, adaptations

export function initMemoryDb(projectRoot) {
  const dbPath = path.join(projectRoot, MEMORY_DB_REL);
  const schemaPath = path.join(projectRoot, MEMORY_SCHEMA_REL);

  if (!fs.existsSync(schemaPath)) {
    return { ready: false, error: 'schema-missing', tables: 0 };
  }

  try {
    // Ensure .memory/ directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const db = openDb(dbPath);
    runSqlFile(db, schemaPath); // All CREATE IF NOT EXISTS — safe to re-run
    const count = tableCount(db);
    closeDb(db);

    return { ready: count >= REQUIRED_TABLES, tables: count };
  } catch (err) {
    return { ready: false, error: err.message, tables: 0 };
  }
}
```

- [ ] **Step 4: Write intelligence-init.mjs**

```javascript
// lib/intelligence-init.mjs — Lazy initialization for Intelligence Engine DB
import path from 'node:path';
import fs from 'node:fs';
import { openDb, runSqlFile, tableCount, closeDb } from './db-helper.mjs';

const INTEL_DB_REL = '.founderOS/infrastructure/intelligence/.data/intelligence.db';
const INTEL_SCHEMA_REL = '.founderOS/infrastructure/intelligence/hooks/schema/intelligence.sql';
const REQUIRED_TABLES = 8;

export function initIntelligenceDb(projectRoot) {
  const dbPath = path.join(projectRoot, INTEL_DB_REL);
  const schemaPath = path.join(projectRoot, INTEL_SCHEMA_REL);

  if (!fs.existsSync(schemaPath)) {
    return { ready: false, error: 'schema-missing', tables: 0 };
  }

  try {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const db = openDb(dbPath);
    runSqlFile(db, schemaPath); // All CREATE IF NOT EXISTS — safe to re-run
    const count = tableCount(db);
    closeDb(db);

    return { ready: count >= REQUIRED_TABLES, tables: count };
  } catch (err) {
    return { ready: false, error: err.message, tables: 0 };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bash founder-os-dist/tests/test-db-init.sh`
Expected: All 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add founder-os-dist/template/.founderOS/scripts/hooks/lib/memory-init.mjs \
       founder-os-dist/template/.founderOS/scripts/hooks/lib/intelligence-init.mjs \
       founder-os-dist/tests/test-db-init.sh
git commit -m "feat(hooks): add lazy init modules for memory and intelligence DBs [18]"
```

---

### Task 1.3: Create hook-registry.json

**Files:**
- Create: `founder-os-dist/template/.founderOS/infrastructure/hooks/hook-registry.json`

- [ ] **Step 1: Create the registry file**

```json
{
  "version": 1,
  "hooks": {
    "SessionStart": [
      {
        "type": "command",
        "command": "node .founderOS/scripts/hooks/session-start.mjs",
        "timeout": 5000
      }
    ],
    "UserPromptSubmit": [
      {
        "type": "command",
        "command": "node .founderOS/scripts/hooks/prompt-submit.mjs",
        "timeout": 3000
      }
    ],
    "PreToolUse": [
      {
        "type": "command",
        "command": "node .founderOS/scripts/hooks/pre-tool.mjs",
        "timeout": 2000
      }
    ],
    "PostToolUse": [
      {
        "type": "command",
        "command": "node .founderOS/scripts/hooks/post-tool.mjs",
        "timeout": 5000
      }
    ],
    "Stop": [
      {
        "type": "command",
        "command": "node .founderOS/scripts/hooks/stop.mjs",
        "timeout": 5000
      }
    ]
  }
}
```

- [ ] **Step 2: Validate JSON is valid**

Run: `node -e "JSON.parse(require('fs').readFileSync('founder-os-dist/template/.founderOS/infrastructure/hooks/hook-registry.json','utf8')); console.log('PASS: valid JSON')"`

- [ ] **Step 3: Commit**

```bash
git add founder-os-dist/template/.founderOS/infrastructure/hooks/hook-registry.json
git commit -m "feat(hooks): add hook registry config [18]"
```

---

## Chunk 2: Hook Scripts

### Task 2.1: Create pre-tool.mjs (PreToolUse — lazy DB init)

**Files:**
- Create: `founder-os-dist/template/.founderOS/scripts/hooks/pre-tool.mjs`
- Test: `founder-os-dist/tests/test-pre-tool-hook.sh`

- [ ] **Step 1: Write the test script**

```bash
#!/bin/bash
# tests/test-pre-tool-hook.sh — verify PreToolUse hook
set -e
cd "$(dirname "$0")/.."

echo "=== Test: pre-tool.mjs ==="

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Set up mock project
mkdir -p "$TMPDIR/.founderOS/scripts/hooks/lib"
mkdir -p "$TMPDIR/.founderOS/infrastructure/memory/schema"
mkdir -p "$TMPDIR/.founderOS/infrastructure/intelligence/hooks/schema"
mkdir -p "$TMPDIR/.founderOS/infrastructure/intelligence/.data"

# Copy files
cp template/.founderOS/scripts/hooks/pre-tool.mjs "$TMPDIR/.founderOS/scripts/hooks/"
cp template/.founderOS/scripts/hooks/lib/*.mjs "$TMPDIR/.founderOS/scripts/hooks/lib/"
cp template/.founderOS/infrastructure/memory/schema/memory-store.sql \
   "$TMPDIR/.founderOS/infrastructure/memory/schema/" 2>/dev/null || true
cp template/.founderOS/infrastructure/intelligence/hooks/schema/intelligence.sql \
   "$TMPDIR/.founderOS/infrastructure/intelligence/hooks/schema/" 2>/dev/null || true

# Test 1: Hook outputs {"decision": "allow"} and creates DBs
OUTPUT=$(echo '{"tool_name":"Bash","tool_input":{}}' | \
  node "$TMPDIR/.founderOS/scripts/hooks/pre-tool.mjs" 2>/dev/null)
echo "$OUTPUT" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.assert(d.decision === 'allow', 'Expected allow');
console.log('PASS: outputs allow');
"

# Test 2: Session file created with project hash
HASH=$(node -e "const c=require('crypto');console.log(c.createHash('md5').update(process.cwd()).digest('hex').slice(0,8))")
test -f "/tmp/fos-session-init-$HASH.json" && echo "PASS: session file created" || echo "FAIL: no session file"

# Test 3: Kill switch
OUTPUT=$(echo '{}' | FOUNDER_OS_HOOKS=0 node "$TMPDIR/.founderOS/scripts/hooks/pre-tool.mjs" 2>/dev/null)
echo "$OUTPUT" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.assert(d.decision === 'allow', 'Kill switch should still allow');
console.log('PASS: kill switch exits cleanly');
"

# Cleanup session file
rm -f /tmp/fos-session-init-*.json

echo "All pre-tool hook tests passed"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash founder-os-dist/tests/test-pre-tool-hook.sh`
Expected: FAIL — pre-tool.mjs doesn't exist

- [ ] **Step 3: Write pre-tool.mjs**

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash founder-os-dist/tests/test-pre-tool-hook.sh`
Expected: All 3 tests PASS

- [ ] **Step 5: Commit**

```bash
git add founder-os-dist/template/.founderOS/scripts/hooks/pre-tool.mjs \
       founder-os-dist/tests/test-pre-tool-hook.sh
git commit -m "feat(hooks): add PreToolUse hook for lazy DB init [18]"
```

---

### Task 2.2: Create session-start.mjs (SessionStart — dispatcher + context)

**Files:**
- Create: `founder-os-dist/template/.founderOS/scripts/hooks/session-start.mjs`
- Test: `founder-os-dist/tests/test-session-start-hook.sh`

- [ ] **Step 1: Write the test script**

Tests should verify:
1. Kill switch exits with no output
2. Output contains "Founder OS Dispatcher Rules" text
3. Output contains "execution-mode" instructions
4. Business context paths listed if context files exist
5. Script completes in under 5 seconds

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write session-start.mjs**

```javascript
// session-start.mjs — SessionStart hook: dispatcher rules + context + patterns
import fs from 'node:fs';
import path from 'node:path';
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
import crypto from 'node:crypto';
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
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add founder-os-dist/template/.founderOS/scripts/hooks/session-start.mjs \
       founder-os-dist/tests/test-session-start-hook.sh
git commit -m "feat(hooks): add SessionStart hook for dispatcher and context [18]"
```

---

### Task 2.3: Create prompt-submit.mjs (UserPromptSubmit — preflight)

**Files:**
- Create: `founder-os-dist/template/.founderOS/scripts/hooks/prompt-submit.mjs`
- Test: `founder-os-dist/tests/test-prompt-submit-hook.sh`

- [ ] **Step 1: Write the test script**

Tests should verify:
1. Kill switch exits with no output
2. Non-command prompt (e.g., "hello") → no output (fast path, <50ms)
3. Command prompt with `/founder-os:inbox:triage` → outputs preflight status
4. Script reads stdin JSON format `{"prompt": "..."}`

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write prompt-submit.mjs**

```javascript
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
      // Simple existence check — MCP configs in .founderOS/infrastructure/mcp-configs/
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

setTimeout(() => process.exit(0), 2500);
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add founder-os-dist/template/.founderOS/scripts/hooks/prompt-submit.mjs \
       founder-os-dist/tests/test-prompt-submit-hook.sh
git commit -m "feat(hooks): add UserPromptSubmit hook for preflight checks [18]"
```

---

### Task 2.4: Create post-tool.mjs (PostToolUse — observation + evals)

**Files:**
- Create: `founder-os-dist/template/.founderOS/scripts/hooks/post-tool.mjs`
- Test: `founder-os-dist/tests/test-post-tool-hook.sh`

- [ ] **Step 1: Write the test script**

Tests should verify:
1. Kill switch exits cleanly
2. Non-Skill tool calls (e.g., Bash) → minimal logging, fast exit
3. Skill tool calls for `/founder-os:*` → event logged to intelligence.db
4. Script reads stdin JSON format `{"tool_name": "...", "tool_input": {...}, "tool_result": "..."}`

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write post-tool.mjs**

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add founder-os-dist/template/.founderOS/scripts/hooks/post-tool.mjs \
       founder-os-dist/tests/test-post-tool-hook.sh
git commit -m "feat(hooks): add PostToolUse hook for intelligence observation [18]"
```

---

### Task 2.5: Create stop.mjs (Stop — flush + cleanup)

**Files:**
- Create: `founder-os-dist/template/.founderOS/scripts/hooks/stop.mjs`
- Test: `founder-os-dist/tests/test-stop-hook.sh`

- [ ] **Step 1: Write the test script**

Tests should verify:
1. Kill switch exits cleanly
2. Cleans up `/tmp/fos-session-init-*.json` for this project
3. Cleans up `/tmp/fos-exec-*.txt` for this project
4. Writes session summary to intelligence.db (if DB exists)

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Write stop.mjs**

```javascript
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
```

- [ ] **Step 4: Run test to verify it passes**

- [ ] **Step 5: Commit**

```bash
git add founder-os-dist/template/.founderOS/scripts/hooks/stop.mjs \
       founder-os-dist/tests/test-stop-hook.sh
git commit -m "feat(hooks): add Stop hook for session cleanup [18]"
```

---

## Chunk 3: Installer Integration

### Task 3.1: Add mergeHooksIntoSettingsJson and removeHooksFromSettingsJson to settings-json.js

**Files:**
- Modify: `founder-os-dist/lib/settings-json.js:1-54`
- Test: `founder-os-dist/tests/test-hooks-merge.sh`

- [ ] **Step 1: Write the test script**

```bash
#!/bin/bash
# tests/test-hooks-merge.sh — verify hook merge/remove in settings.json
set -e
cd "$(dirname "$0")/.."

echo "=== Test: hooks merge ==="

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Test 1: Merge hooks into empty settings.json
cat > "$TMPDIR/settings.json" << 'JSON'
{"permissions":{"allow":["Bash(npx founder-os*)"]}}
JSON
cat > "$TMPDIR/registry.json" << 'JSON'
{"version":1,"hooks":{"PreToolUse":[{"type":"command","command":"node .founderOS/scripts/hooks/pre-tool.mjs","timeout":2000}]}}
JSON

node -e "
const sj = require('./lib/settings-json.js');
sj.mergeHooksIntoSettingsJson('$TMPDIR/settings.json', '$TMPDIR/registry.json');
const result = JSON.parse(require('fs').readFileSync('$TMPDIR/settings.json','utf8'));
console.assert(result.hooks, 'Expected hooks key');
console.assert(result.hooks.PreToolUse.length === 1, 'Expected 1 PreToolUse hook');
console.assert(result.permissions.allow[0] === 'Bash(npx founder-os*)', 'Permissions preserved');
console.log('PASS: merge into empty');
"

# Test 2: Idempotent — running merge twice doesn't duplicate
node -e "
const sj = require('./lib/settings-json.js');
sj.mergeHooksIntoSettingsJson('$TMPDIR/settings.json', '$TMPDIR/registry.json');
const result = JSON.parse(require('fs').readFileSync('$TMPDIR/settings.json','utf8'));
console.assert(result.hooks.PreToolUse.length === 1, 'Expected 1 hook, not 2');
console.log('PASS: idempotent merge');
"

# Test 3: Remove hooks
node -e "
const sj = require('./lib/settings-json.js');
sj.removeHooksFromSettingsJson('$TMPDIR/settings.json');
const result = JSON.parse(require('fs').readFileSync('$TMPDIR/settings.json','utf8'));
const hasHooks = result.hooks && Object.values(result.hooks).some(arr => arr.some(h => h.command.includes('.founderOS')));
console.assert(!hasHooks, 'founderOS hooks should be removed');
console.assert(result.permissions.allow[0] === 'Bash(npx founder-os*)', 'Permissions still preserved');
console.log('PASS: remove hooks');
"

# Test 4: Existing user hooks are preserved during remove
cat > "$TMPDIR/settings2.json" << 'JSON'
{"hooks":{"PreToolUse":[{"type":"command","command":"node my-custom-hook.mjs"},{"type":"command","command":"node .founderOS/scripts/hooks/pre-tool.mjs","timeout":2000}]}}
JSON
node -e "
const sj = require('./lib/settings-json.js');
sj.removeHooksFromSettingsJson('$TMPDIR/settings2.json');
const result = JSON.parse(require('fs').readFileSync('$TMPDIR/settings2.json','utf8'));
console.assert(result.hooks.PreToolUse.length === 1, 'Expected 1 user hook remaining');
console.assert(result.hooks.PreToolUse[0].command === 'node my-custom-hook.mjs', 'User hook preserved');
console.log('PASS: user hooks preserved');
"

echo "All hooks merge tests passed"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bash founder-os-dist/tests/test-hooks-merge.sh`
Expected: FAIL — functions don't exist

- [ ] **Step 3: Add functions to settings-json.js**

Add after line 31 (after `mergeSettingsJson`), before `removeFromSettingsJson`:

```javascript
function mergeHooksIntoSettingsJson(targetPath, registryPath) {
  let existing = {};
  if (fs.existsSync(targetPath)) {
    existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

  existing.hooks = existing.hooks || {};

  let existingHooksDetected = false;
  for (const [event, handlers] of Object.entries(registry.hooks)) {
    existing.hooks[event] = existing.hooks[event] || [];
    if (existing.hooks[event].length > 0) existingHooksDetected = true;
    for (const handler of handlers) {
      const isDuplicate = existing.hooks[event].some(h => h.command === handler.command);
      if (!isDuplicate) {
        existing.hooks[event].push(handler);
      }
    }
  }

  fs.writeFileSync(targetPath, JSON.stringify(existing, null, 2) + '\n');
  return { existingHooksDetected };
}

function removeHooksFromSettingsJson(targetPath) {
  if (!fs.existsSync(targetPath)) return;

  const existing = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  if (!existing.hooks) return;

  for (const event of Object.keys(existing.hooks)) {
    existing.hooks[event] = existing.hooks[event].filter(
      h => !h.command?.includes('.founderOS')
    );
    if (existing.hooks[event].length === 0) delete existing.hooks[event];
  }
  if (Object.keys(existing.hooks).length === 0) delete existing.hooks;

  if (Object.keys(existing).length === 0) {
    fs.unlinkSync(targetPath);
    return;
  }

  fs.writeFileSync(targetPath, JSON.stringify(existing, null, 2) + '\n');
}
```

Update module.exports to include new functions.

- [ ] **Step 4: Run test to verify it passes**

Run: `bash founder-os-dist/tests/test-hooks-merge.sh`
Expected: All 4 tests PASS

- [ ] **Step 5: Commit**

```bash
git add founder-os-dist/lib/settings-json.js founder-os-dist/tests/test-hooks-merge.sh
git commit -m "feat(hooks): add hook merge/remove functions to settings-json.js [18]"
```

---

### Task 3.2: Add Phase 2a and 2b to installer.js

**Files:**
- Modify: `founder-os-dist/lib/installer.js:108-198` (inside `install()` function)
- Test: `founder-os-dist/tests/test-init-hooks.sh`

- [ ] **Step 1: Write the test script**

Tests should verify after a fresh install:
1. `.claude/settings.json` contains a `hooks` key with all 5 events
2. Each hook event has exactly 1 handler with correct command path
3. Memory DB at `.memory/memory.db` has 3+ tables
4. Intelligence DB has 8+ tables
5. Hook scripts exist and are executable
6. Running init twice doesn't duplicate hooks

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Add Phase 2a and 2b to installer.js**

After line 186 (`output.success('Generated .claude/settings.json');`), add:

```javascript
  // Phase 2a: Hook Registration
  const registryPath = path.join(founderOsDir, 'infrastructure', 'hooks', 'hook-registry.json');
  if (fs.existsSync(registryPath)) {
    const { existingHooksDetected } = settingsJson.mergeHooksIntoSettingsJson(settingsPath, registryPath);
    if (existingHooksDetected) {
      output.warn('Existing hooks detected in settings.json. founderOS hooks appended after them.');
    }
    // Set executable permissions on hook scripts
    const hooksDir = path.join(founderOsDir, 'scripts', 'hooks');
    if (fs.existsSync(hooksDir)) {
      setExecutableRecursive(hooksDir);
    }
    output.success('Registered runtime hooks (5 events)');
  }

  // Phase 2b: DB Verification
  const memoryDbPath = path.join(targetDir, '.memory', 'memory.db');
  const memorySchemaPath = path.join(founderOsDir, 'infrastructure', 'memory', 'schema', 'memory-store.sql');
  if (fs.existsSync(memorySchemaPath)) {
    fs.mkdirSync(path.dirname(memoryDbPath), { recursive: true });
    try {
      require('child_process').execSync(`sqlite3 "${memoryDbPath}" < "${memorySchemaPath}"`, { stdio: 'pipe' });
      output.success('Memory engine: ready');
    } catch (err) {
      output.warn('Memory DB init failed: ' + err.message);
    }
  }

  const intelDbPath = path.join(founderOsDir, 'infrastructure', 'intelligence', '.data', 'intelligence.db');
  const intelSchemaPath = path.join(founderOsDir, 'infrastructure', 'intelligence', 'hooks', 'schema', 'intelligence.sql');
  if (fs.existsSync(intelSchemaPath)) {
    fs.mkdirSync(path.dirname(intelDbPath), { recursive: true });
    try {
      require('child_process').execSync(`sqlite3 "${intelDbPath}" < "${intelSchemaPath}"`, { stdio: 'pipe' });
      output.success('Intelligence engine: ready');
    } catch (err) {
      output.warn('Intelligence DB init failed: ' + err.message);
    }
  }
```

Also add helper function before `install()`:

```javascript
function setExecutableRecursive(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      setExecutableRecursive(fullPath);
    } else if (entry.name.endsWith('.mjs')) {
      fs.chmodSync(fullPath, 0o755);
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bash founder-os-dist/tests/test-init-hooks.sh`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add founder-os-dist/lib/installer.js founder-os-dist/tests/test-init-hooks.sh
git commit -m "feat(init): add Phase 2a hook registration and Phase 2b DB verification [18]"
```

---

### Task 3.3: Add hook merge to updater.js

**Files:**
- Modify: `founder-os-dist/lib/updater.js:134-143` (after settings.json merge)

- [ ] **Step 1: Add hook merge call after line 139**

After `settingsJson.mergeSettingsJson(settingsPath);`, add:

```javascript
  // Merge hooks from registry
  const registryPath = path.join(founderOsDir, 'infrastructure', 'hooks', 'hook-registry.json');
  if (fs.existsSync(registryPath)) {
    settingsJson.mergeHooksIntoSettingsJson(settingsPath, registryPath);
  }
```

- [ ] **Step 2: Verify updater still works**

Run existing test: `bash founder-os-dist/tests/test-update.sh` (if exists) or manual test

- [ ] **Step 3: Commit**

```bash
git add founder-os-dist/lib/updater.js
git commit -m "feat(update): add hook registry merge on update [18]"
```

---

### Task 3.4: Add hook removal to uninstaller.js

**Files:**
- Modify: `founder-os-dist/lib/uninstaller.js:63-65` (after settings.json permission removal)

- [ ] **Step 1: Add hook removal call after line 65**

After `settingsJson.removeFromSettingsJson(settingsPath);`, add:

```javascript
  // Remove founderOS hook entries
  settingsJson.removeHooksFromSettingsJson(settingsPath);
```

- [ ] **Step 2: Verify uninstaller still works**

Run existing test or manual test

- [ ] **Step 3: Commit**

```bash
git add founder-os-dist/lib/uninstaller.js
git commit -m "feat(uninstall): remove hook entries from settings.json [18]"
```

---

## Chunk 4: Evals Packaging and Dispatcher SKILL.md Fix

### Task 4.1: Copy evals from dev repo to dist template

**Files:**
- Copy from: `founderOS/_infrastructure/intelligence/evals/` (10 files)
- Copy to: `founder-os-dist/template/.founderOS/infrastructure/intelligence/evals/`

- [ ] **Step 1: Copy eval files to dist template**

```bash
mkdir -p founder-os-dist/template/.founderOS/infrastructure/intelligence/evals/checks
mkdir -p founder-os-dist/template/.founderOS/infrastructure/intelligence/evals/rubrics/overrides

cp founderOS/_infrastructure/intelligence/evals/eval-runner.mjs \
   founder-os-dist/template/.founderOS/infrastructure/intelligence/evals/
cp founderOS/_infrastructure/intelligence/evals/db.mjs \
   founder-os-dist/template/.founderOS/infrastructure/intelligence/evals/
cp founderOS/_infrastructure/intelligence/evals/sampler.mjs \
   founder-os-dist/template/.founderOS/infrastructure/intelligence/evals/
cp founderOS/_infrastructure/intelligence/evals/checks/telemetry.mjs \
   founder-os-dist/template/.founderOS/infrastructure/intelligence/evals/checks/
cp founderOS/_infrastructure/intelligence/evals/checks/format.mjs \
   founder-os-dist/template/.founderOS/infrastructure/intelligence/evals/checks/
cp founderOS/_infrastructure/intelligence/evals/checks/schema.mjs \
   founder-os-dist/template/.founderOS/infrastructure/intelligence/evals/checks/
cp founderOS/_infrastructure/intelligence/evals/rubrics/universal.json \
   founder-os-dist/template/.founderOS/infrastructure/intelligence/evals/rubrics/
cp founderOS/_infrastructure/intelligence/evals/rubrics/overrides/*.json \
   founder-os-dist/template/.founderOS/infrastructure/intelligence/evals/rubrics/overrides/
```

- [ ] **Step 2: Verify all 10 files exist in dist template**

```bash
find founder-os-dist/template/.founderOS/infrastructure/intelligence/evals -type f | wc -l
# Expected: 10
```

- [ ] **Step 3: Commit**

```bash
git add founder-os-dist/template/.founderOS/infrastructure/intelligence/evals/
git commit -m "feat(dist): ship evals pipeline in distribution package [18]"
```

---

### Task 4.2: Update dispatcher SKILL.md (hard prerequisite)

**Files:**
- Modify: `founderOS/_infrastructure/dispatcher/SKILL.md:120-124`
- Modify: `founder-os-dist/template/.founderOS/infrastructure/dispatcher/SKILL.md` (same change)

- [ ] **Step 1: Update preflight section in both repos**

Replace the "Preflight Checks [7]" section:

Old:
```
### Preflight Checks [7]
- Preflight runs INSIDE the subagent, not in the dispatcher
- If preflight returns `blocked`, the subagent returns an error result with fix instructions
- The dispatcher surfaces the error as a structured message in the main session
```

New:
```
### Preflight Checks [7]
- Preflight runs in the UserPromptSubmit hook (main session), NOT in the subagent
- The hook checks command frontmatter for dependency declarations and validates availability
- If preflight returns `blocked`, the hook outputs fix instructions before the command runs
- The subagent receives a clean context with preflight already passed
```

- [ ] **Step 2: Commit**

```bash
git add founderOS/_infrastructure/dispatcher/SKILL.md \
       founder-os-dist/template/.founderOS/infrastructure/dispatcher/SKILL.md
git commit -m "fix(dispatcher): move preflight from subagent to UserPromptSubmit hook [18]"
```

---

## Chunk 5: Integration Testing

### Task 5.1: End-to-end init test with hooks

**Files:**
- Create: `founder-os-dist/tests/test-init-e2e-hooks.sh`

- [ ] **Step 1: Write the comprehensive E2E test**

This test runs the full init flow in a temp directory and verifies:
1. All 5 hooks registered in settings.json
2. All hook scripts exist and are executable
3. Memory DB has 3 tables
4. Intelligence DB has 8 tables
5. Hook registry.json exists and is valid
6. Running init a second time (update path) doesn't duplicate hooks
7. Uninstall removes hooks from settings.json
8. Uninstall preserves user permissions
9. Kill switch env var works for each hook script

- [ ] **Step 2: Run the E2E test**

Run: `bash founder-os-dist/tests/test-init-e2e-hooks.sh`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add founder-os-dist/tests/test-init-e2e-hooks.sh
git commit -m "test(hooks): add end-to-end init + hooks integration test [18]"
```

---

### Task 5.2: Package and push

- [ ] **Step 1: Run all tests**

```bash
bash founder-os-dist/tests/test-db-helper.sh
bash founder-os-dist/tests/test-db-init.sh
bash founder-os-dist/tests/test-hooks-merge.sh
bash founder-os-dist/tests/test-init-hooks.sh
bash founder-os-dist/tests/test-init-e2e-hooks.sh
```

- [ ] **Step 2: Build dist package**

```bash
cd founder-os-dist && npm pack && cd ..
```

- [ ] **Step 3: Test fresh install in temp directory**

```bash
TMPDIR=$(mktemp -d)
cd $TMPDIR
npx /path/to/founder-os-1.0.0.tgz --init
# Verify: settings.json has hooks, DBs created, scripts executable
```

- [ ] **Step 4: Commit and push both repos**

```bash
cd founder-os-dist && git add -A && git commit -m "release: v1.1.0 — runtime hooks wiring [18]" && git push && cd ..
cd founderOS && git add -A && git commit -m "fix: update dispatcher SKILL.md for hook-based preflight [18]" && git push && cd ..
git add founderOS founder-os-dist && git commit -m "feat: update submodules — runtime hooks wiring [18]" && git push
```

---

## Task Dependency Graph

```
Task 1.1 (db-helper.mjs)
  └─> Task 1.2 (memory-init + intelligence-init)
        └─> Task 2.1 (pre-tool.mjs)
Task 1.3 (hook-registry.json)
  └─> Task 3.1 (settings-json.js merge functions)
        ├─> Task 3.2 (installer.js Phase 2a/2b)
        ├─> Task 3.3 (updater.js hook merge)
        └─> Task 3.4 (uninstaller.js hook removal)
Task 2.2 (session-start.mjs) — independent
Task 2.3 (prompt-submit.mjs) — independent
Task 2.4 (post-tool.mjs) — independent
Task 2.5 (stop.mjs) — independent
Task 4.1 (evals packaging) — independent
Task 4.2 (dispatcher SKILL.md fix) — prerequisite to activation
Task 5.1 (E2E test) — depends on ALL above
Task 5.2 (package + push) — depends on 5.1
```

**Parallelizable tasks** (can run simultaneously):
- Tasks 2.2, 2.3, 2.4, 2.5 (all hook scripts are independent)
- Tasks 4.1 and 4.2 (evals packaging and SKILL.md fix are independent)
- Task 3.1 can run in parallel with Task 1.2
