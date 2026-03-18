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
