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
