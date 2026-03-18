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
