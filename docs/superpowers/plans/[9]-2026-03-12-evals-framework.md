# Evals & Quality Framework Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a three-layer eval pipeline (telemetry, format checks, LLM judge) embedded in the Intelligence Engine that measures command output quality, detects regressions, and surfaces a quality dashboard — all with zero founder configuration.

**Architecture:** Node.js eval runner called by hooks, SQLite tables extending `intelligence.db`, background Haiku judge agent for sampled LLM scoring, EWMA regression detection via pre-task hook. Rubrics are JSON files with universal + namespace overrides. Everything is Phase 1 scope only.

**Tech Stack:** Node.js (ESM), `better-sqlite3` (native SQLite), JSON rubrics, markdown agent/command definitions

**Spec:** `docs/superpowers/specs/[9]-2026-03-12-evals-framework-design.md`

**Dependency:** Intelligence Engine [3] fully complete — hooks, learning tiers 1-3, self-healing, routing, observation blocks in all 82 command files. This plan extends that infrastructure.

---

## File Structure

### New Files (12)

| File | Responsibility |
|------|---------------|
| `_infrastructure/intelligence/evals/db.mjs` | SQLite migration, read/write helpers, EWMA computation |
| `_infrastructure/intelligence/evals/eval-runner.mjs` | Main entry point — orchestrates Tier 0 → Tier 1 → sampling → judge spawn |
| `_infrastructure/intelligence/evals/checks/telemetry.mjs` | Tier 0: token counts, duration, SHA-256 hashes |
| `_infrastructure/intelligence/evals/checks/format.mjs` | Tier 1: required sections, word count bounds, forbidden patterns |
| `_infrastructure/intelligence/evals/checks/schema.mjs` | Tier 1: JSON/structure validation |
| `_infrastructure/intelligence/evals/sampler.mjs` | Sampling decision: T1 fail → always Tier 2, otherwise 20% random |
| `_infrastructure/intelligence/evals/rubrics/universal.json` | Default 6-dimension rubric with Tier 1 + Tier 2 config |
| `_infrastructure/intelligence/evals/rubrics/overrides/inbox.json` | Inbox namespace override (elevated tone, email-specific checks) |
| `_infrastructure/intelligence/evals/rubrics/overrides/invoice.json` | Invoice namespace override (deterministic-only, elevated accuracy) |
| `_infrastructure/intelligence/evals/rubrics/overrides/prep.json` | Prep namespace override (elevated completeness, context quality) |
| `agents/intel/eval-judge.md` | Haiku background agent for Tier 2 Boolean rubric scoring |
| `commands/intel/health.md` | `/founder-os:intel:health` quality dashboard command |

### Modified Files (4)

| File | Change |
|------|--------|
| `scripts/package.json` | Add `better-sqlite3` dependency |
| `_infrastructure/intelligence/hooks/schema/intelligence.sql` | Add 4 eval tables + indexes |
| `_infrastructure/intelligence/SKILL.md` | Add evals module reference |
| `_infrastructure/intelligence/hooks/SKILL.md` | Add post-task eval trigger + pre-task regression check |

---

## Chunk 1: Database Schema + db.mjs Module

Foundation layer — everything else depends on this.

### Task 1: Add eval tables to intelligence.sql

**Files:**
- Modify: `_infrastructure/intelligence/hooks/schema/intelligence.sql`

- [ ] **Step 1: Read the current schema file**

Read `_infrastructure/intelligence/hooks/schema/intelligence.sql` to understand existing tables.

- [ ] **Step 2: Append eval tables to the schema file**

Add the following after the existing `config` table INSERT statements:

```sql
-- ============================================================
-- EVAL TABLES (added by Evals Framework, Phase 1)
-- ============================================================

-- Reference data: quality dimensions
CREATE TABLE IF NOT EXISTS eval_dimensions (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    description TEXT,
    data_type   TEXT NOT NULL DEFAULT 'BOOLEAN',
    weight      REAL DEFAULT 1.0,
    created_at  TEXT DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO eval_dimensions (id, name, description, weight) VALUES
('dim_completeness',  'completeness',  'All required elements present',      0.20),
('dim_accuracy',      'accuracy',      'Facts, numbers, references correct', 0.25),
('dim_tone',          'tone',          'Appropriate voice and register',     0.10),
('dim_actionability', 'actionability', 'User can act immediately',           0.20),
('dim_format',        'format',        'Follows expected output structure',  0.10),
('dim_hallucination', 'hallucination', 'No fabricated information',          0.15);

-- Versioned rubric definitions (immutable — archive, never edit)
CREATE TABLE IF NOT EXISTS eval_rubrics (
    id              TEXT PRIMARY KEY,
    dimension_id    TEXT NOT NULL,
    namespace       TEXT,
    command         TEXT,
    version         INTEGER NOT NULL DEFAULT 1,
    checklist_items TEXT NOT NULL,
    eval_type       TEXT DEFAULT 'llm_judge',
    is_active       INTEGER DEFAULT 1,
    created_at      TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (dimension_id) REFERENCES eval_dimensions(id)
);

-- One row per command execution (Tier 0 + Tier 1)
CREATE TABLE IF NOT EXISTS exec_log (
    id              TEXT PRIMARY KEY,
    namespace       TEXT NOT NULL,
    command         TEXT NOT NULL,
    input_hash      TEXT,
    output_hash     TEXT,
    output_preview  TEXT,
    token_input     INTEGER,
    token_output    INTEGER,
    duration_ms     INTEGER,
    t1_pass         INTEGER,
    t1_details      TEXT,
    executed_at     INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_exec_log_cmd
    ON exec_log(namespace, command, executed_at);

-- One row per dimension per Tier 2 evaluation
CREATE TABLE IF NOT EXISTS eval_results (
    id              TEXT PRIMARY KEY,
    execution_id    TEXT NOT NULL,
    namespace       TEXT NOT NULL,
    command         TEXT NOT NULL,
    dimension_id    TEXT NOT NULL,
    rubric_id       TEXT,
    score           REAL NOT NULL,
    pass            INTEGER NOT NULL,
    score_label     TEXT,
    eval_tier       INTEGER NOT NULL DEFAULT 2,
    reasoning       TEXT,
    ewma_score      REAL,
    evaluated_at    INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (execution_id) REFERENCES exec_log(id),
    FOREIGN KEY (dimension_id) REFERENCES eval_dimensions(id)
);
CREATE INDEX IF NOT EXISTS idx_eval_results_exec
    ON eval_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_eval_results_ns_time
    ON eval_results(namespace, command, evaluated_at);
CREATE INDEX IF NOT EXISTS idx_eval_results_ewma
    ON eval_results(namespace, evaluated_at DESC, ewma_score);
```

- [ ] **Step 3: Verify the schema file is valid SQL**

Read the complete file and check for syntax errors (unclosed parens, mismatched quotes, duplicate table names).

- [ ] **Step 4: Commit**

```bash
git add _infrastructure/intelligence/hooks/schema/intelligence.sql
git commit -m "feat(evals): add 4 eval tables to intelligence schema

Tables: eval_dimensions, eval_rubrics, exec_log, eval_results
Includes 6 default dimensions and 4 indexes."
```

### Task 2: Create db.mjs — SQLite helpers

**Files:**
- Create: `_infrastructure/intelligence/evals/db.mjs`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p _infrastructure/intelligence/evals/checks
mkdir -p _infrastructure/intelligence/evals/rubrics/overrides
```

- [ ] **Step 2: Write db.mjs**

The module must:
- Accept a `dbPath` argument (or default to `_infrastructure/intelligence/.data/intelligence.db`)
- Run migrations on first connect (CREATE TABLE IF NOT EXISTS from the schema)
- Set PRAGMAs: `journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000`
- Export functions:
  - `openDb(dbPath)` → returns db instance
  - `ensureSchema(db)` → runs migration DDL
  - `insertExecLog(db, { id, namespace, command, inputHash, outputHash, outputPreview, tokenInput, tokenOutput, durationMs })` → INSERT into exec_log
  - `updateExecLogT1(db, execId, { pass, details })` → UPDATE exec_log SET t1_pass, t1_details
  - `insertEvalResult(db, { id, executionId, namespace, command, dimensionId, score, pass, scoreLabel, evalTier, reasoning })` → INSERT into eval_results + compute EWMA
  - `getLatestEwma(db, namespace)` → returns the most recent ewma_score for the namespace (for regression check)
  - `getHealthData(db, days)` → returns aggregated data for the health dashboard
  - `cleanupOldData(db, retentionDays)` → DELETE old exec_log and eval_results rows

```javascript
// _infrastructure/intelligence/evals/db.mjs
import Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_DB_DIR = resolve(__dirname, '../.data');
const DEFAULT_DB_PATH = resolve(DEFAULT_DB_DIR, 'intelligence.db');
const EWMA_ALPHA = 0.15;
const RETENTION_DAYS = 90;
const CLEANUP_MODULO = 100;

export function openDb(dbPath = DEFAULT_DB_PATH) {
  const dir = dirname(dbPath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  ensureSchema(db);
  return db;
}

export function ensureSchema(db) {
  // Run only the eval-specific DDL (CREATE TABLE IF NOT EXISTS is safe to re-run)
  const evalDDL = `
    CREATE TABLE IF NOT EXISTS eval_dimensions (
      id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE,
      description TEXT, data_type TEXT NOT NULL DEFAULT 'BOOLEAN',
      weight REAL DEFAULT 1.0, created_at TEXT DEFAULT (datetime('now'))
    );
    INSERT OR IGNORE INTO eval_dimensions (id, name, description, weight) VALUES
      ('dim_completeness','completeness','All required elements present',0.20),
      ('dim_accuracy','accuracy','Facts, numbers, references correct',0.25),
      ('dim_tone','tone','Appropriate voice and register',0.10),
      ('dim_actionability','actionability','User can act immediately',0.20),
      ('dim_format','format','Follows expected output structure',0.10),
      ('dim_hallucination','hallucination','No fabricated information',0.15);
    CREATE TABLE IF NOT EXISTS eval_rubrics (
      id TEXT PRIMARY KEY, dimension_id TEXT NOT NULL,
      namespace TEXT, command TEXT, version INTEGER NOT NULL DEFAULT 1,
      checklist_items TEXT NOT NULL, eval_type TEXT DEFAULT 'llm_judge',
      is_active INTEGER DEFAULT 1, created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (dimension_id) REFERENCES eval_dimensions(id)
    );
    CREATE TABLE IF NOT EXISTS exec_log (
      id TEXT PRIMARY KEY, namespace TEXT NOT NULL, command TEXT NOT NULL,
      input_hash TEXT, output_hash TEXT, output_preview TEXT,
      token_input INTEGER, token_output INTEGER, duration_ms INTEGER,
      t1_pass INTEGER, t1_details TEXT,
      executed_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE INDEX IF NOT EXISTS idx_exec_log_cmd ON exec_log(namespace, command, executed_at);
    CREATE TABLE IF NOT EXISTS eval_results (
      id TEXT PRIMARY KEY, execution_id TEXT NOT NULL,
      namespace TEXT NOT NULL, command TEXT NOT NULL,
      dimension_id TEXT NOT NULL, rubric_id TEXT,
      score REAL NOT NULL, pass INTEGER NOT NULL,
      score_label TEXT, eval_tier INTEGER NOT NULL DEFAULT 2,
      reasoning TEXT, ewma_score REAL,
      evaluated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      FOREIGN KEY (execution_id) REFERENCES exec_log(id),
      FOREIGN KEY (dimension_id) REFERENCES eval_dimensions(id)
    );
    CREATE INDEX IF NOT EXISTS idx_eval_results_exec ON eval_results(execution_id);
    CREATE INDEX IF NOT EXISTS idx_eval_results_ns_time ON eval_results(namespace, command, evaluated_at);
    CREATE INDEX IF NOT EXISTS idx_eval_results_ewma ON eval_results(namespace, evaluated_at DESC, ewma_score);
  `;
  db.exec(evalDDL);
}

export function insertExecLog(db, { id, namespace, command, inputHash, outputHash, outputPreview, tokenInput, tokenOutput, durationMs }) {
  const execId = id || randomUUID();
  db.prepare(`
    INSERT INTO exec_log (id, namespace, command, input_hash, output_hash, output_preview, token_input, token_output, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(execId, namespace, command, inputHash, outputHash, outputPreview?.slice(0, 500), tokenInput, tokenOutput, durationMs);

  // Trigger cleanup every 100 inserts
  const count = db.prepare('SELECT COUNT(*) as c FROM exec_log').get();
  if (count.c % CLEANUP_MODULO === 0) {
    cleanupOldData(db, RETENTION_DAYS);
  }

  return execId;
}

export function updateExecLogT1(db, execId, { pass, details }) {
  db.prepare('UPDATE exec_log SET t1_pass = ?, t1_details = ? WHERE id = ?')
    .run(pass ? 1 : 0, JSON.stringify(details), execId);
}

export function insertEvalResult(db, { id, executionId, namespace, command, dimensionId, score, pass, scoreLabel, evalTier = 2, reasoning }) {
  const resultId = id || randomUUID();

  // Get previous EWMA for this namespace
  const prev = db.prepare(`
    SELECT ewma_score FROM eval_results
    WHERE namespace = ? AND ewma_score IS NOT NULL
    ORDER BY evaluated_at DESC LIMIT 1
  `).get(namespace);

  const prevEwma = prev?.ewma_score;
  const ewma = prevEwma != null
    ? EWMA_ALPHA * score + (1 - EWMA_ALPHA) * prevEwma
    : score; // First eval seeds at raw score

  db.prepare(`
    INSERT INTO eval_results (id, execution_id, namespace, command, dimension_id, score, pass, score_label, eval_tier, reasoning, ewma_score)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(resultId, executionId, namespace, command, dimensionId, score, pass ? 1 : 0, scoreLabel, evalTier, reasoning, ewma);

  return { resultId, ewma };
}

export function getLatestEwma(db, namespace) {
  const row = db.prepare(`
    SELECT ewma_score, evaluated_at FROM eval_results
    WHERE namespace = ? AND ewma_score IS NOT NULL
    ORDER BY evaluated_at DESC LIMIT 1
  `).get(namespace);
  return row || null;
}

export function getHealthData(db, days = 30) {
  const since = Math.floor(Date.now() / 1000) - (days * 86400);

  const totalExecs = db.prepare('SELECT COUNT(*) as c FROM exec_log WHERE executed_at > ?').get(since);
  const totalEvals = db.prepare('SELECT COUNT(DISTINCT execution_id) as c FROM eval_results WHERE evaluated_at > ?').get(since);

  const byNamespace = db.prepare(`
    SELECT namespace,
      COUNT(DISTINCT execution_id) as eval_count,
      AVG(score) as avg_score,
      (SELECT ewma_score FROM eval_results er2
       WHERE er2.namespace = er.namespace AND er2.ewma_score IS NOT NULL
       ORDER BY er2.evaluated_at DESC LIMIT 1) as latest_ewma
    FROM eval_results er
    WHERE evaluated_at > ?
    GROUP BY namespace
    ORDER BY eval_count DESC
  `).all(since);

  const lowestDimensions = db.prepare(`
    SELECT dimension_id, namespace, AVG(score) as avg_score
    FROM eval_results
    WHERE evaluated_at > ?
    GROUP BY dimension_id, namespace
    HAVING avg_score < 0.75
    ORDER BY avg_score ASC
    LIMIT 5
  `).all(since);

  const regressions = db.prepare(`
    SELECT namespace,
      (SELECT ewma_score FROM eval_results er2
       WHERE er2.namespace = er.namespace AND er2.ewma_score IS NOT NULL
       ORDER BY er2.evaluated_at DESC LIMIT 1) as latest_ewma
    FROM eval_results er
    WHERE evaluated_at > ?
    GROUP BY namespace
    HAVING latest_ewma < 0.65
  `).all(since);

  return {
    totalExecutions: totalExecs.c,
    totalEvaluations: totalEvals.c,
    byNamespace,
    lowestDimensions,
    regressions
  };
}

export function cleanupOldData(db, retentionDays = RETENTION_DAYS) {
  const cutoff = Math.floor(Date.now() / 1000) - (retentionDays * 86400);
  db.prepare('DELETE FROM eval_results WHERE evaluated_at < ?').run(cutoff);
  db.prepare('DELETE FROM exec_log WHERE executed_at < ?').run(cutoff);
}

export function wasRegressionWarned(db, namespace, withinMinutes = 30) {
  const since = Math.floor(Date.now() / 1000) - (withinMinutes * 60);
  const row = db.prepare(`
    SELECT 1 FROM exec_log
    WHERE namespace = ? AND executed_at > ? AND t1_details LIKE '%regression_warned%'
    LIMIT 1
  `).get(namespace, since);
  return !!row;
}

// --- CLI Entry Point ---
// Called by the eval-judge agent:
//   node db.mjs --write-eval --db-path /path/to/intelligence.db \
//     --execution-id abc --namespace inbox --command triage \
//     --results '[{"dimensionId":"dim_tone","score":1.0,"pass":true,...}]'
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  if (args.includes('--write-eval')) {
    const getArg = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
    const dbPath = getArg('--db-path') || undefined;
    const db = openDb(dbPath);
    try {
      const results = JSON.parse(getArg('--results'));
      const executionId = getArg('--execution-id');
      const namespace = getArg('--namespace');
      const command = getArg('--command');
      for (const r of results) {
        insertEvalResult(db, {
          executionId, namespace, command,
          dimensionId: r.dimensionId,
          score: r.score,
          pass: r.pass,
          scoreLabel: r.scoreLabel,
          evalTier: r.evalTier || 2,
          reasoning: r.reasoning
        });
      }
      console.log(JSON.stringify({ ok: true, count: results.length }));
    } finally {
      db.close();
    }
  }
}
```

**Note on EWMA scope:** The EWMA is computed per-namespace across all dimension rows. This provides a single namespace-level quality signal for regression detection. The `getLatestEwma` function returns the most recent EWMA from any dimension row for the namespace, which gives a rolling aggregate view. For the regression check threshold (0.65), this is appropriate since we want to detect broad quality drops, not per-dimension regressions. Per-dimension analysis is available in the health dashboard via `getHealthData`.

- [ ] **Step 3: Verify db.mjs has no syntax errors**

Read the file back and check for: unclosed template literals, missing imports, mismatched braces.

- [ ] **Step 4: Commit**

```bash
git add _infrastructure/intelligence/evals/db.mjs
git commit -m "feat(evals): add db.mjs SQLite helpers

Functions: openDb, ensureSchema, insertExecLog, updateExecLogT1,
insertEvalResult, getLatestEwma, getHealthData, cleanupOldData,
wasRegressionWarned. EWMA alpha=0.15, 90-day retention."
```

### Task 3: Add better-sqlite3 to package.json

**Files:**
- Modify: `scripts/package.json`

- [ ] **Step 1: Read current package.json**

Read `scripts/package.json`.

- [ ] **Step 2: Add better-sqlite3 dependency**

Add `"better-sqlite3": "^11.0.0"` to the `dependencies` object.

- [ ] **Step 3: Commit**

```bash
git add scripts/package.json
git commit -m "feat(evals): add better-sqlite3 dependency

Native SQLite binding for eval runner. Required by evals/db.mjs."
```

---

## Chunk 2: Tier 0 + Tier 1 Checks + Sampler

Deterministic check modules. Can be tested independently of the eval runner.

### Task 4: Create telemetry.mjs (Tier 0)

**Files:**
- Create: `_infrastructure/intelligence/evals/checks/telemetry.mjs`

- [ ] **Step 1: Write telemetry.mjs**

Tier 0 collects execution metadata — no scoring, just structured logging.

```javascript
// _infrastructure/intelligence/evals/checks/telemetry.mjs
import { createHash } from 'node:crypto';

/**
 * Tier 0: Telemetry collection.
 * Runs on 100% of executions, $0 cost, <1ms.
 *
 * @param {object} params
 * @param {string} params.namespace - Command namespace (e.g., "inbox")
 * @param {string} params.command - Command name (e.g., "triage")
 * @param {string} [params.input] - Raw input text (for hashing)
 * @param {string} params.output - Raw output text
 * @param {number} [params.tokensIn] - Input token count
 * @param {number} [params.tokensOut] - Output token count
 * @param {number} [params.durationMs] - Execution duration in ms
 * @returns {object} Telemetry data ready for exec_log insertion
 */
export function collectTelemetry({ namespace, command, input, output, tokensIn, tokensOut, durationMs }) {
  return {
    namespace,
    command,
    inputHash: input ? sha256(input) : null,
    outputHash: output ? sha256(output) : null,
    outputPreview: output ? output.slice(0, 500) : null,
    tokenInput: tokensIn ?? null,
    tokenOutput: tokensOut ?? null,
    durationMs: durationMs ?? null
  };
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}
```

- [ ] **Step 2: Commit**

```bash
git add _infrastructure/intelligence/evals/checks/telemetry.mjs
git commit -m "feat(evals): add Tier 0 telemetry check

Collects token counts, duration, SHA-256 hashes. $0 cost, <1ms."
```

### Task 5: Create format.mjs (Tier 1)

**Files:**
- Create: `_infrastructure/intelligence/evals/checks/format.mjs`

- [ ] **Step 1: Write format.mjs**

Tier 1 format checks: required sections, word count bounds, forbidden patterns.

```javascript
// _infrastructure/intelligence/evals/checks/format.mjs

/**
 * Tier 1: Format checks (deterministic).
 * Runs on 100% of executions, $0 cost, <5ms.
 *
 * @param {string} output - Command output text
 * @param {object} rubric - Tier 1 rubric config from rubric JSON
 * @returns {{ pass: boolean, details: object }}
 */
export function checkFormat(output, rubric) {
  const tier1 = rubric?.tier1 ?? {};
  const results = {};
  let allPass = true;

  // Check: non-empty output
  if (!output || output.trim().length === 0) {
    results.non_empty = { pass: false, reason: 'Output is empty' };
    return { pass: false, details: results };
  }
  results.non_empty = { pass: true };

  // Check: required sections
  if (tier1.required_sections?.length > 0) {
    const missing = tier1.required_sections.filter(s => !output.includes(s));
    const pass = missing.length === 0;
    results.required_sections = { pass, missing: missing.length > 0 ? missing : undefined };
    if (!pass) allPass = false;
  }

  // Check: word count bounds
  const wordCount = output.split(/\s+/).filter(w => w.length > 0).length;
  const minWords = tier1.min_words ?? 10;
  const maxWords = tier1.max_words ?? 5000;

  if (wordCount < minWords) {
    results.min_words = { pass: false, actual: wordCount, min: minWords };
    allPass = false;
  } else {
    results.min_words = { pass: true, actual: wordCount };
  }

  if (wordCount > maxWords) {
    results.max_words = { pass: false, actual: wordCount, max: maxWords };
    allPass = false;
  } else {
    results.max_words = { pass: true, actual: wordCount };
  }

  // Check: forbidden patterns
  if (tier1.forbidden_patterns?.length > 0) {
    const found = tier1.forbidden_patterns.filter(p => output.includes(p));
    const pass = found.length === 0;
    results.forbidden_patterns = { pass, found: found.length > 0 ? found : undefined };
    if (!pass) allPass = false;
  }

  return { pass: allPass, details: results };
}
```

- [ ] **Step 2: Commit**

```bash
git add _infrastructure/intelligence/evals/checks/format.mjs
git commit -m "feat(evals): add Tier 1 format checks

Checks: non-empty, required sections, word count bounds,
forbidden patterns. Deterministic, $0 cost."
```

### Task 6: Create schema.mjs (Tier 1)

**Files:**
- Create: `_infrastructure/intelligence/evals/checks/schema.mjs`

- [ ] **Step 1: Write schema.mjs**

Tier 1 JSON/structure validation for commands that produce structured output.

```javascript
// _infrastructure/intelligence/evals/checks/schema.mjs

/**
 * Tier 1: Schema/structure validation (deterministic).
 * Validates JSON output structure when rubric specifies required fields.
 *
 * @param {string} output - Command output text
 * @param {object} rubric - Tier 1 rubric config
 * @returns {{ pass: boolean, details: object }}
 */
export function checkSchema(output, rubric) {
  const tier1 = rubric?.tier1 ?? {};
  const requiredFields = tier1.required_json_fields;

  // Skip if no JSON fields required
  if (!requiredFields || requiredFields.length === 0) {
    return { pass: true, details: { skipped: true, reason: 'No JSON fields required' } };
  }

  // Try to extract JSON from the output
  const jsonBlock = extractJson(output);
  if (!jsonBlock) {
    return {
      pass: false,
      details: { json_parse: { pass: false, reason: 'No valid JSON found in output' } }
    };
  }

  // Check required fields
  const missing = requiredFields.filter(field => !(field in jsonBlock));
  const pass = missing.length === 0;

  return {
    pass,
    details: {
      json_parse: { pass: true },
      required_fields: { pass, missing: missing.length > 0 ? missing : undefined }
    }
  };
}

/**
 * Extract first JSON object or array from text.
 * Handles JSON embedded in markdown code blocks.
 */
function extractJson(text) {
  // Try markdown code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch {}
  }

  // Try raw JSON (first { or [)
  const start = text.search(/[{[]/);
  if (start === -1) return null;

  // Find the matching close bracket
  const openChar = text[start];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === openChar) depth++;
    if (text[i] === closeChar) depth--;
    if (depth === 0) {
      try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add _infrastructure/intelligence/evals/checks/schema.mjs
git commit -m "feat(evals): add Tier 1 schema validation

Validates JSON structure when rubric specifies required_json_fields.
Extracts JSON from code blocks or raw text."
```

### Task 7: Create sampler.mjs

**Files:**
- Create: `_infrastructure/intelligence/evals/sampler.mjs`

- [ ] **Step 1: Write sampler.mjs**

Determines whether an execution should proceed to Tier 2 LLM scoring.

```javascript
// _infrastructure/intelligence/evals/sampler.mjs

/**
 * Decides whether this execution should be sampled for Tier 2 eval.
 *
 * Rules:
 * - T1 failure → always sample (100%)
 * - Otherwise → random at rubric sample_rate (default 20%)
 *
 * @param {boolean} t1Pass - Whether Tier 1 checks passed
 * @param {object} rubric - Rubric config (may contain tier2.sample_rate)
 * @returns {boolean} true if this execution should be sent to Tier 2
 */
export function shouldSample(t1Pass, rubric) {
  const sampleRate = rubric?.tier2?.sample_rate ?? 0.20;

  // If sample_rate is 0, never sample (e.g., invoice = deterministic-only)
  if (sampleRate === 0) return false;

  // T1 failures always get Tier 2 evaluation
  if (!t1Pass) return true;

  return Math.random() < sampleRate;
}
```

- [ ] **Step 2: Commit**

```bash
git add _infrastructure/intelligence/evals/sampler.mjs
git commit -m "feat(evals): add sampling decision module

T1 fail → always Tier 2. Otherwise 20% random (configurable)."
```

---

## Chunk 3: Eval Runner + Rubrics

Main orchestrator and rubric JSON files. Depends on Chunks 1 + 2.

### Task 8: Create universal.json rubric

**Files:**
- Create: `_infrastructure/intelligence/evals/rubrics/universal.json`

- [ ] **Step 1: Write universal.json**

```json
{
  "namespace": null,
  "tier1": {
    "required_sections": [],
    "min_words": 10,
    "max_words": 5000,
    "forbidden_patterns": ["[PLACEHOLDER]", "INSERT_NAME", "{name}", "TODO:", "FIXME:"],
    "required_json_fields": null
  },
  "tier2": {
    "sample_rate": 0.20,
    "dimensions": ["completeness", "accuracy", "tone", "actionability", "format", "hallucination"],
    "weights": {
      "completeness": 0.20,
      "accuracy": 0.25,
      "tone": 0.10,
      "actionability": 0.20,
      "format": 0.10,
      "hallucination": 0.15
    },
    "criteria": {
      "completeness": "All requested sections and elements are present with no placeholder text remaining",
      "accuracy": "All stated facts, numbers, and references are correct and verifiable against source data",
      "tone": "Register matches the context (formal/casual) with no inappropriately aggressive or passive language",
      "actionability": "Contains a clear next step or call-to-action that the user can act on immediately",
      "format": "Follows the expected output structure and is appropriate length for context",
      "hallucination": "No fabricated entities, events, or data points — all claims supported by provided context"
    },
    "threshold": 0.70
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add _infrastructure/intelligence/evals/rubrics/universal.json
git commit -m "feat(evals): add universal rubric

6 dimensions, 20% Tier 2 sample rate, 0.70 pass threshold.
Baseline Tier 1 checks: min 10 words, max 5000, no placeholders."
```

### Task 9: Create namespace override rubrics

**Files:**
- Create: `_infrastructure/intelligence/evals/rubrics/overrides/inbox.json`
- Create: `_infrastructure/intelligence/evals/rubrics/overrides/invoice.json`
- Create: `_infrastructure/intelligence/evals/rubrics/overrides/prep.json`

- [ ] **Step 1: Write inbox.json**

```json
{
  "namespace": "inbox",
  "tier1": {
    "required_sections": ["Subject:", "Body:"],
    "min_words": 50,
    "max_words": 500,
    "forbidden_patterns": ["[PLACEHOLDER]", "INSERT_NAME", "{name}", "Dear Sir/Madam"]
  },
  "tier2": {
    "sample_rate": 0.20,
    "weights": {
      "tone": 0.15,
      "actionability": 0.20
    },
    "criteria": {
      "tone": "Professional register, matches founder voice profile, correct recipient salutation",
      "actionability": "Includes specific next step in closing paragraph (meeting time, deliverable, response)"
    }
  }
}
```

- [ ] **Step 2: Write invoice.json**

```json
{
  "namespace": "invoice",
  "tier1": {
    "required_sections": [],
    "min_words": 20,
    "max_words": 2000,
    "required_json_fields": ["line_items", "subtotal", "total", "due_date"]
  },
  "tier2": {
    "sample_rate": 0.0,
    "weights": {
      "accuracy": 0.35,
      "completeness": 0.30,
      "format": 0.20,
      "hallucination": 0.15
    },
    "criteria": {
      "accuracy": "Line items × quantities = subtotal, tax = rate × subtotal, total = subtotal + tax",
      "completeness": "All line items from source present, business ID included, due date specified"
    }
  }
}
```

Note: `sample_rate: 0.0` means invoice evals are deterministic-only (Tier 1). No LLM judge.

- [ ] **Step 3: Write prep.json**

```json
{
  "namespace": "prep",
  "tier1": {
    "required_sections": ["Agenda", "Attendees"],
    "min_words": 100,
    "max_words": 3000
  },
  "tier2": {
    "sample_rate": 0.25,
    "weights": {
      "completeness": 0.25,
      "actionability": 0.20
    },
    "criteria": {
      "completeness": "Agenda items listed with time allocations, all attendees listed with roles, previous action items referenced",
      "actionability": "Pre-meeting preparation items listed, discussion questions framed for decision-making"
    }
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add _infrastructure/intelligence/evals/rubrics/overrides/
git commit -m "feat(evals): add namespace rubric overrides

inbox: elevated tone, email structure checks
invoice: deterministic-only, accuracy-focused, JSON validation
prep: elevated completeness, agenda/attendee requirements"
```

### Task 10: Create eval-runner.mjs

**Files:**
- Create: `_infrastructure/intelligence/evals/eval-runner.mjs`

- [ ] **Step 1: Write eval-runner.mjs**

The main entry point called by hooks. ~200 lines. Two modes: post-task eval and regression check.

```javascript
#!/usr/bin/env node
// _infrastructure/intelligence/evals/eval-runner.mjs
//
// Usage:
//   node eval-runner.mjs --namespace inbox --command triage \
//     --output-file /tmp/fos-exec-123.txt \
//     --tokens-in 1200 --tokens-out 800 --duration-ms 3400
//
//   node eval-runner.mjs --check-regression --namespace inbox

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';

import { openDb, insertExecLog, updateExecLogT1, getLatestEwma, wasRegressionWarned } from './db.mjs';
import { collectTelemetry } from './checks/telemetry.mjs';
import { checkFormat } from './checks/format.mjs';
import { checkSchema } from './checks/schema.mjs';
import { shouldSample } from './sampler.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUBRICS_DIR = resolve(__dirname, 'rubrics');

// --- CLI Argument Parsing ---
const { values: args } = parseArgs({
  options: {
    namespace: { type: 'string' },
    command: { type: 'string' },
    'output-file': { type: 'string' },
    'output-text': { type: 'string' },
    'tokens-in': { type: 'string' },
    'tokens-out': { type: 'string' },
    'duration-ms': { type: 'string' },
    'check-regression': { type: 'boolean', default: false },
    'db-path': { type: 'string' },
    'input-text': { type: 'string' }
  },
  strict: false
});

// --- Main ---
function main() {
  const dbPath = args['db-path'] || undefined;
  const db = openDb(dbPath);

  try {
    if (args['check-regression']) {
      return handleRegressionCheck(db);
    }
    return handlePostTaskEval(db);
  } finally {
    db.close();
  }
}

// --- Post-Task Eval Mode ---
function handlePostTaskEval(db) {
  const namespace = args.namespace;
  const command = args.command;

  if (!namespace || !command) {
    console.error('Error: --namespace and --command are required');
    process.exit(1);
  }

  // Read output
  let output = args['output-text'] || '';
  if (args['output-file'] && existsSync(args['output-file'])) {
    output = readFileSync(args['output-file'], 'utf-8');
  }

  if (!output) {
    console.error('Error: no output provided (use --output-file or --output-text)');
    process.exit(1);
  }

  // Load rubric
  const rubric = loadRubric(namespace);

  // Tier 0: Telemetry
  const telemetry = collectTelemetry({
    namespace,
    command,
    input: args['input-text'] || null,
    output,
    tokensIn: args['tokens-in'] ? parseInt(args['tokens-in'], 10) : null,
    tokensOut: args['tokens-out'] ? parseInt(args['tokens-out'], 10) : null,
    durationMs: args['duration-ms'] ? parseInt(args['duration-ms'], 10) : null
  });

  // Insert exec_log row
  const execId = insertExecLog(db, { id: randomUUID(), ...telemetry });

  // Tier 1: Format checks
  const formatResult = checkFormat(output, rubric);
  const schemaResult = checkSchema(output, rubric);
  const t1Pass = formatResult.pass && schemaResult.pass;
  const t1Details = {
    format: formatResult.details,
    schema: schemaResult.details
  };

  updateExecLogT1(db, execId, { pass: t1Pass, details: t1Details });

  // Sampling decision
  const sampled = shouldSample(t1Pass, rubric);

  // Output result as JSON for the hook to parse
  const result = {
    execution_id: execId,
    namespace,
    command,
    t1_pass: t1Pass,
    sampled,
    rubric_path: getRubricPath(namespace)
  };

  console.log(JSON.stringify(result));
  return result;
}

// --- Regression Check Mode ---
function handleRegressionCheck(db) {
  const namespace = args.namespace;
  if (!namespace) {
    console.error('Error: --namespace is required for regression check');
    process.exit(1);
  }

  const ewmaData = getLatestEwma(db, namespace);

  // No eval data yet — nothing to warn about
  if (!ewmaData) {
    console.log(JSON.stringify({ regression: false, reason: 'no_data' }));
    return;
  }

  const isRegression = ewmaData.ewma_score < 0.65;
  const alreadyWarned = wasRegressionWarned(db, namespace, 30);

  if (isRegression && !alreadyWarned) {
    console.log(JSON.stringify({
      regression: true,
      namespace,
      ewma: ewmaData.ewma_score,
      message: `⚠️ Quality for ${namespace} commands has dropped recently. Run /founder-os:intel:health`
    }));
  } else {
    console.log(JSON.stringify({
      regression: false,
      ewma: ewmaData.ewma_score,
      suppressed: isRegression && alreadyWarned
    }));
  }
}

// --- Rubric Loading ---
function loadRubric(namespace) {
  const universalPath = resolve(RUBRICS_DIR, 'universal.json');
  const overridePath = resolve(RUBRICS_DIR, 'overrides', `${namespace}.json`);

  let universal = {};
  if (existsSync(universalPath)) {
    universal = JSON.parse(readFileSync(universalPath, 'utf-8'));
  }

  if (!existsSync(overridePath)) return universal;

  const override = JSON.parse(readFileSync(overridePath, 'utf-8'));
  return mergeRubrics(universal, override);
}

function mergeRubrics(universal, override) {
  const merged = JSON.parse(JSON.stringify(universal));

  // Merge Tier 1
  if (override.tier1) {
    merged.tier1 = { ...merged.tier1, ...override.tier1 };
  }

  // Merge Tier 2
  if (override.tier2) {
    if (override.tier2.sample_rate != null) {
      merged.tier2.sample_rate = override.tier2.sample_rate;
    }
    if (override.tier2.weights) {
      merged.tier2.weights = { ...merged.tier2.weights, ...override.tier2.weights };
      // Re-normalize weights to sum to 1.0
      const total = Object.values(merged.tier2.weights).reduce((a, b) => a + b, 0);
      if (total > 0) {
        for (const key of Object.keys(merged.tier2.weights)) {
          merged.tier2.weights[key] = merged.tier2.weights[key] / total;
        }
      }
    }
    if (override.tier2.criteria) {
      merged.tier2.criteria = { ...merged.tier2.criteria, ...override.tier2.criteria };
    }
    if (override.tier2.threshold != null) {
      merged.tier2.threshold = override.tier2.threshold;
    }
  }

  return merged;
}

function getRubricPath(namespace) {
  const overridePath = resolve(RUBRICS_DIR, 'overrides', `${namespace}.json`);
  return existsSync(overridePath) ? overridePath : resolve(RUBRICS_DIR, 'universal.json');
}

try {
  main();
} catch (err) {
  console.error('Eval runner error:', err.message);
  process.exit(1);
}
```

- [ ] **Step 2: Verify the file has no syntax errors**

Read the file back. Check: all imports resolve to files created in earlier tasks, no undefined variables, CLI args match spec.

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/intelligence/evals/eval-runner.mjs
git commit -m "feat(evals): add main eval runner

Two modes: post-task eval (Tier 0+1 + sampling) and regression check.
Rubric loading with universal + namespace override merging.
JSON output for hook integration. ~200 lines."
```

---

## Chunk 4: Eval Judge Agent

Can be built in parallel with Chunk 3.

### Task 11: Create eval-judge.md agent

**Files:**
- Create: `agents/intel/eval-judge.md`

- [ ] **Step 1: Create agents/intel/ directory if needed**

```bash
mkdir -p agents/intel
```

- [ ] **Step 2: Write eval-judge.md**

Follow the agent markdown format used by other agents (frontmatter with name, description, model, tools).

```markdown
---
name: eval-judge
description: |
  Background quality evaluator for Founder OS command outputs. Scores each
  dimension of a rubric using Boolean YES/NO judgments, computes weighted
  overall score, and writes results to the Intelligence database.

  This agent is spawned by the post-task hook when an execution is sampled
  for Tier 2 evaluation. It runs asynchronously and never blocks the
  founder's session.

  <example>
  Context: Post-task hook determines an inbox:triage output should be evaluated
  user: "Evaluate this command output against the rubric"
  assistant: "Running Tier 2 Boolean rubric evaluation on inbox:triage output"
  <commentary>
  The eval judge is spawned in background by the intelligence hooks, not invoked directly by users.
  </commentary>
  </example>

model: haiku
color: yellow
tools: ["Read", "Bash"]
---

You are the Eval Judge, a background quality evaluator for Founder OS.

**Your task:** Evaluate a command output against a rubric using Boolean YES/NO judgments per dimension, then write the results to the Intelligence database.

## Inputs (provided in your spawn context)

You will receive:
- `output_text`: The command output to evaluate
- `execution_id`: The exec_log row ID
- `namespace`: Command namespace (e.g., "inbox")
- `command`: Command name (e.g., "triage")
- `rubric_path`: Path to the JSON rubric file
- `db_path`: Path to the intelligence.db file

## Evaluation Process

### Step 1: Load the rubric

Read the rubric JSON file at `rubric_path`. Extract the `tier2.dimensions`, `tier2.weights`, and `tier2.criteria` fields.

### Step 2: Evaluate each dimension

For each dimension in `tier2.dimensions`:

1. Read the criterion text from `tier2.criteria[dimension]`
2. Evaluate the `output_text` against this single criterion
3. Make a **Boolean judgment**: Does the output satisfy this criterion? YES or NO
4. Write a **one-sentence reasoning** (under 100 characters)

**Scoring rules:**
- YES = score 1.0, pass = true
- NO = score 0.0, pass = false
- Be honest and conservative — when in doubt, score NO
- Evaluate each dimension independently (don't let one dimension's score affect another)

### Step 3: Compute overall score

```
overall_score = sum(weight[dim] * score[dim] for dim in dimensions)
```

Assign a label:
- PASS: overall_score >= 0.70
- WARN: overall_score >= 0.50 and < 0.70
- FAIL: overall_score < 0.50

### Step 4: Write results to database

Use the db.mjs CLI entry point to write all dimension results in a single call:

```bash
cd ${CLAUDE_PLUGIN_ROOT}
node _infrastructure/intelligence/evals/db.mjs --write-eval \
  --db-path "DB_PATH" \
  --execution-id "EXECUTION_ID" \
  --namespace "NAMESPACE" \
  --command "COMMAND" \
  --results '[
    {"dimensionId":"dim_completeness","score":1.0,"pass":true,"scoreLabel":"PASS","reasoning":"..."},
    {"dimensionId":"dim_accuracy","score":1.0,"pass":true,"scoreLabel":"PASS","reasoning":"..."},
    {"dimensionId":"dim_tone","score":0.0,"pass":false,"scoreLabel":"FAIL","reasoning":"..."},
    ...
  ]'
```

Replace the placeholder values with actual evaluation results. Pass all dimensions in one `--results` JSON array.

### Step 5: Output summary

Print a brief summary of the evaluation:

```
Eval complete: {namespace}:{command} → {label} ({overall_score})
  completeness: {pass/fail} | accuracy: {pass/fail} | tone: {pass/fail}
  actionability: {pass/fail} | format: {pass/fail} | hallucination: {pass/fail}
```

## Important Rules

- Never modify the output being evaluated
- Never interact with the founder — you run silently in background
- Keep reasoning under 100 characters per dimension
- If the database is locked or unavailable, exit silently (don't retry indefinitely)
- Total execution must complete within 30 seconds
```

- [ ] **Step 3: Commit**

```bash
git add agents/intel/eval-judge.md
git commit -m "feat(evals): add eval-judge background agent

Haiku model, Boolean rubric scoring per dimension, writes results
to intelligence.db via db.mjs. Runs async, never blocks session."
```

---

## Chunk 5: Hook Integration

Modifies existing SKILL.md files to wire eval into the execution flow.

### Task 12: Update hooks SKILL.md with eval triggers

**Files:**
- Modify: `_infrastructure/intelligence/hooks/SKILL.md`

- [ ] **Step 1: Read current hooks SKILL.md**

Read `_infrastructure/intelligence/hooks/SKILL.md` in full.

- [ ] **Step 2: Add post-task eval trigger section**

Append after the "Retention" section (before "Database Location") a new section:

```markdown
## Eval Pipeline Integration

### Post-Command Eval Trigger

After the standard post_command observation block completes, the hooks system triggers the eval pipeline:

1. Write the command output to a temp file: `/tmp/fos-exec-{session_id}.txt`
2. Run the eval runner synchronously (Tier 0 + Tier 1, <50ms):
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/_infrastructure/intelligence/evals/eval-runner.mjs \
     --namespace {namespace} --command {command} \
     --output-file /tmp/fos-exec-{session_id}.txt \
     --tokens-in {token_input} --tokens-out {token_output} \
     --duration-ms {duration_ms}
   ```
3. Parse the JSON output — if `sampled: true`, spawn the eval-judge agent in background:
   - Agent: `agents/intel/eval-judge.md`
   - Model: `haiku`
   - Run in background: `true`
   - Context: pass `output_text`, `execution_id`, `namespace`, `command`, `rubric_path`, `db_path`
4. Clean up the temp file

The eval trigger is **non-blocking** — Tier 0+1 completes in <50ms, the agent spawns asynchronously.

### Pre-Command Regression Check

Before the standard pre_command observation block, run a regression check:

1. Call the eval runner in regression mode:
   ```bash
   node ${CLAUDE_PLUGIN_ROOT}/_infrastructure/intelligence/evals/eval-runner.mjs \
     --check-regression --namespace {namespace}
   ```
2. Parse the JSON output — if `regression: true`, display the warning message to the founder
3. The warning is shown **once per session per namespace** (tracked in exec_log)

This check is fast (~1ms SQLite query) and adds no perceptible latency.
```

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/intelligence/hooks/SKILL.md
git commit -m "feat(evals): add eval pipeline triggers to hooks SKILL

Post-task: Tier 0+1 sync + Tier 2 background agent spawn.
Pre-task: EWMA regression check with once-per-session warning."
```

---

## Chunk 6: Health Command + Intelligence SKILL Update

### Task 13: Create health.md command

**Files:**
- Create: `commands/intel/health.md`

- [ ] **Step 1: Write health.md**

Follow the same format as `commands/intel/status.md`.

```markdown
---
name: intel-health
description: Quality dashboard showing eval scores, namespace trends, regression alerts, and dimension analysis
usage: /founder-os:intel:health
arguments: none
execution-mode: background
result-format: summary
---

# /founder-os:intel:health

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `intel` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Quality Dashboard

Display a comprehensive quality report based on eval data from the Intelligence database.

### Step 1: Read Intelligence Database

Read the Intelligence SQLite database at `_infrastructure/intelligence/.data/intelligence.db`.

If the database does not exist, display:
```
📊 Founder OS Quality Report
═══════════════════════════════
Quality tracking is active. Data will appear here after your
first few command runs. Check back in a day or two.
```
And stop here.

### Step 2: Check Data Volume

Query: `SELECT COUNT(DISTINCT execution_id) as eval_count FROM eval_results`

If this query fails with "no such table: eval_results", treat it the same as 0 evals — the eval tables are auto-created on first eval run, so they may not exist yet on a fresh install.

- **0 evals (or missing table):** Display "Quality tracking is active. Data will appear here after your first few command runs. Check back in a day or two." and stop.
- **1-10 evals:** Proceed but add note: "Early data — scores will stabilize after ~20 evaluations."
- **10+ evals:** Full dashboard output.

### Step 3: Compute Overall Score

Query the last 30 days:

```sql
SELECT AVG(score) as overall_avg,
       COUNT(DISTINCT execution_id) as eval_count
FROM eval_results
WHERE evaluated_at > unixepoch() - (30 * 86400)
```

Map overall score to label:
- >= 0.85: EXCELLENT
- >= 0.70: GOOD
- >= 0.50: NEEDS ATTENTION
- < 0.50: POOR

### Step 4: Compute Per-Namespace Scores

```sql
SELECT namespace,
       COUNT(DISTINCT execution_id) as eval_count,
       AVG(score) as avg_score,
       (SELECT ewma_score FROM eval_results er2
        WHERE er2.namespace = er.namespace AND er2.ewma_score IS NOT NULL
        ORDER BY er2.evaluated_at DESC LIMIT 1) as latest_ewma
FROM eval_results er
WHERE evaluated_at > unixepoch() - (30 * 86400)
GROUP BY namespace
ORDER BY eval_count DESC
```

### Step 5: Detect Regressions

```sql
SELECT namespace, ewma_score
FROM (
  SELECT namespace, ewma_score,
         ROW_NUMBER() OVER (PARTITION BY namespace ORDER BY evaluated_at DESC) as rn
  FROM eval_results
  WHERE ewma_score IS NOT NULL
)
WHERE rn = 1 AND ewma_score < 0.65
```

### Step 6: Find Lowest Dimensions

```sql
SELECT dimension_id, namespace, AVG(score) as avg_score
FROM eval_results
WHERE evaluated_at > unixepoch() - (30 * 86400)
GROUP BY dimension_id, namespace
HAVING avg_score < 0.75
ORDER BY avg_score ASC
LIMIT 5
```

### Step 7: Display Dashboard

Format output:

```
📊 Founder OS Quality Report
═══════════════════════════════

Overall: {overall_avg} ({label}) — {eval_count} executions evaluated

By Namespace (last 30 days):
  {namespace}  {bar}  {latest_ewma}  ({eval_count} evals)
  ...

Regressions: {count} detected {✅ or ⚠️}
  {namespace}: EWMA {ewma_score} (below 0.65 threshold)
  ...

Lowest Scoring Dimensions:
  {dimension}  {avg_score} {⚠️ if < 0.70}  ({namespace})
  ...

{tip based on lowest dimension}
```

Bar chart: use Unicode block characters. Map score 0.0-1.0 to 0-20 blocks:
- █ for filled, ░ for empty

### Notes
- All queries are read-only
- If any query fails, show "unavailable" for that section
- Round scores to 2 decimal places
- Show namespace names in lowercase
```

- [ ] **Step 2: Add observation blocks**

The health command needs the standard Intelligence Engine observation blocks. Add:
- Pre-command observation block after Preflight Check
- Post-command observation block at the end

Follow the pattern from `commands/intel/status.md` and the hooks SKILL.md convention templates.

- [ ] **Step 3: Commit**

```bash
git add commands/intel/health.md
git commit -m "feat(evals): add /founder-os:intel:health command

Quality dashboard: overall score, per-namespace trends, regression
alerts, dimension analysis. Cold start messaging for empty data.
Includes observation blocks for Intelligence Engine integration."
```

### Task 14: Update intelligence SKILL.md

**Files:**
- Modify: `_infrastructure/intelligence/SKILL.md`

- [ ] **Step 1: Read current SKILL.md**

Read `_infrastructure/intelligence/SKILL.md`.

- [ ] **Step 2: Add evals module reference**

In the "Modules" table, add a new row:

```markdown
| Evals | `evals/eval-runner.mjs` + `evals/db.mjs` + `evals/checks/` | Phase 1 |
```

Add a new section after the "Routing Integration" section:

```markdown
## Evals Integration

The evals module is a sub-module of the Intelligence Engine that measures command output quality.

### Components

- **Eval Runner** (`evals/eval-runner.mjs`): Main entry point called by hooks. Orchestrates Tier 0 (telemetry) → Tier 1 (format checks) → sampling decision.
- **DB Module** (`evals/db.mjs`): SQLite helpers for eval tables in `intelligence.db`. Handles EWMA computation.
- **Tier 0 Checks** (`evals/checks/telemetry.mjs`): Token counts, duration, SHA-256 hashes.
- **Tier 1 Checks** (`evals/checks/format.mjs`, `evals/checks/schema.mjs`): Required sections, word count bounds, forbidden patterns, JSON validation.
- **Sampler** (`evals/sampler.mjs`): Determines whether to send output to Tier 2 LLM judge.
- **Rubrics** (`evals/rubrics/`): JSON rubric files — `universal.json` + per-namespace overrides.
- **Eval Judge Agent** (`agents/intel/eval-judge.md`): Background Haiku agent for Tier 2 Boolean scoring.

### Data Flow

```
command output → post-task hook → eval-runner.mjs
  → Tier 0 (telemetry → exec_log INSERT)
  → Tier 1 (format + schema → exec_log UPDATE)
  → sampler → if sampled → spawn eval-judge agent
                         → Tier 2 (Boolean rubric → eval_results INSERT + EWMA update)
```

### Regression Detection

The pre-task hook calls `eval-runner.mjs --check-regression` before each command. If the namespace EWMA drops below 0.65, a warning is shown once per session.

### Column Naming

The eval tables use `namespace` where existing intelligence tables use `plugin`. Both refer to the same concept (the 32 Founder OS command namespaces). When joining: `eval_results.namespace = patterns.plugin`.
```

- [ ] **Step 3: Commit**

```bash
git add _infrastructure/intelligence/SKILL.md
git commit -m "feat(evals): add evals module reference to intelligence SKILL

Documents eval runner, db module, checks, sampler, rubrics,
judge agent, data flow, and regression detection."
```

---

## Chunk 7: Verification + Smoke Test

### Task 15: Verify all files exist and are syntactically valid

- [ ] **Step 1: Verify directory structure**

Run `find _infrastructure/intelligence/evals/ -type f` and confirm all 10 files exist:
- `db.mjs`
- `eval-runner.mjs`
- `sampler.mjs`
- `checks/telemetry.mjs`
- `checks/format.mjs`
- `checks/schema.mjs`
- `rubrics/universal.json`
- `rubrics/overrides/inbox.json`
- `rubrics/overrides/invoice.json`
- `rubrics/overrides/prep.json`

- [ ] **Step 2: Verify agent and command files**

Confirm these exist:
- `agents/intel/eval-judge.md`
- `commands/intel/health.md`

- [ ] **Step 3: Validate JSON rubrics**

```bash
cd founderOS
node -e "JSON.parse(require('fs').readFileSync('_infrastructure/intelligence/evals/rubrics/universal.json','utf8')); console.log('universal.json OK')"
node -e "JSON.parse(require('fs').readFileSync('_infrastructure/intelligence/evals/rubrics/overrides/inbox.json','utf8')); console.log('inbox.json OK')"
node -e "JSON.parse(require('fs').readFileSync('_infrastructure/intelligence/evals/rubrics/overrides/invoice.json','utf8')); console.log('invoice.json OK')"
node -e "JSON.parse(require('fs').readFileSync('_infrastructure/intelligence/evals/rubrics/overrides/prep.json','utf8')); console.log('prep.json OK')"
```

Expected: all 4 print "OK".

- [ ] **Step 4: Verify JS modules parse without errors**

```bash
cd founderOS
node --check _infrastructure/intelligence/evals/db.mjs
node --check _infrastructure/intelligence/evals/eval-runner.mjs
node --check _infrastructure/intelligence/evals/sampler.mjs
node --check _infrastructure/intelligence/evals/checks/telemetry.mjs
node --check _infrastructure/intelligence/evals/checks/format.mjs
node --check _infrastructure/intelligence/evals/checks/schema.mjs
```

Expected: no output (clean parse). If any file has syntax errors, fix before proceeding.

- [ ] **Step 5: Verify modified files are coherent**

Read these files and confirm the edits are present and correct:
- `_infrastructure/intelligence/hooks/schema/intelligence.sql` — has 4 eval tables
- `_infrastructure/intelligence/SKILL.md` — has evals module row and section
- `_infrastructure/intelligence/hooks/SKILL.md` — has eval pipeline integration section
- `scripts/package.json` — has `better-sqlite3` dependency

- [ ] **Step 6: Smoke test — run eval runner in regression check mode (no data)**

```bash
cd founderOS
npm install --prefix scripts
node _infrastructure/intelligence/evals/eval-runner.mjs --check-regression --namespace inbox
```

Expected: `{"regression":false,"reason":"no_data"}` (no eval data exists yet, so no regression).

- [ ] **Step 7: Final commit with all verification**

If any fixes were needed during verification, commit them:

```bash
git add -A
git commit -m "fix(evals): verification fixes from smoke test"
```

---

## Parallelization Guide

For subagent-driven development, these chunks can be parallelized:

| Agent | Chunks | Dependencies |
|-------|--------|-------------|
| Agent 1 | Chunk 1 (schema + db.mjs + package.json) | None |
| Agent 2 | Chunk 2 (Tier 0+1 checks + sampler) | None — no imports from db.mjs |
| Agent 3 | Chunk 4 (eval-judge agent) | None — standalone markdown |
| Agent 4 | Chunk 6 (health command + SKILL update) | None — standalone markdown |

**Sequential after parallel work completes:**
- Chunk 3 (eval-runner.mjs + rubrics): depends on Chunks 1 + 2 (imports db.mjs, checks, sampler)
- Chunk 5 (hook integration): depends on eval-runner.mjs existing
- Chunk 7 (verification): depends on everything

**Total: 4 parallel agents → 3 sequential tasks → done.**

---

## Platform Considerations

### better-sqlite3

`better-sqlite3` is a native Node.js module compiled via `node-gyp`. It requires:
- **macOS**: Xcode Command Line Tools (`xcode-select --install`)
- **Linux**: `build-essential` package (gcc, g++, make)
- **Windows**: Visual Studio Build Tools

If install fails, a fallback to `sql.js` (pure WASM) is possible but not implemented in Phase 1. The spec notes this as a Low probability / High impact risk.

### Node.js Version

The eval runner uses `node:util` `parseArgs` (Node 18.3+), `node:crypto` `createHash`, and top-level `import`. Requires **Node.js >= 18**.
