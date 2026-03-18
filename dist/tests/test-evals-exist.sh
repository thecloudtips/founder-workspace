#!/bin/bash
# tests/test-evals-exist.sh — verify evals files are in dist template
set -e
cd "$(dirname "$0")/.."

echo "=== Test: evals packaging ==="

EVALS_DIR="template/.founderOS/infrastructure/intelligence/evals"

# Test 1: Core files exist
for f in eval-runner.mjs db.mjs sampler.mjs; do
  test -f "$EVALS_DIR/$f" || { echo "FAIL: missing $f"; exit 1; }
done
echo "PASS: core eval files exist"

# Test 2: Count total files (at least 3 core + checks + rubrics)
FILE_COUNT=$(find "$EVALS_DIR" -type f | wc -l | tr -d ' ')
echo "Found $FILE_COUNT eval files"
test "$FILE_COUNT" -ge 3 || { echo "FAIL: expected at least 3 files"; exit 1; }
echo "PASS: sufficient eval files ($FILE_COUNT)"

echo "All evals packaging tests passed"
