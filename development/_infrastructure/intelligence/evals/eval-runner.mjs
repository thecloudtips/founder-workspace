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
