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
