// _infrastructure/intelligence/evals/db.mjs
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Use createRequire to resolve better-sqlite3 from scripts/node_modules
const __filename = fileURLToPath(import.meta.url);
const require = createRequire(resolve(dirname(__filename), '../../../scripts/package.json'));
const Database = require('better-sqlite3');

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

  const prev = db.prepare(`
    SELECT ewma_score FROM eval_results
    WHERE namespace = ? AND ewma_score IS NOT NULL
    ORDER BY evaluated_at DESC LIMIT 1
  `).get(namespace);

  const prevEwma = prev?.ewma_score;
  const ewma = prevEwma != null
    ? EWMA_ALPHA * score + (1 - EWMA_ALPHA) * prevEwma
    : score;

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
