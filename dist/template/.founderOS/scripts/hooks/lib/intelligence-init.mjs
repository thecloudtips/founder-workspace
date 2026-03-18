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
