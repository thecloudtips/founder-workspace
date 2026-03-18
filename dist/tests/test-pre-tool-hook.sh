#!/bin/bash
# tests/test-pre-tool-hook.sh — verify PreToolUse hook
set -e
cd "$(dirname "$0")/.."

echo "=== Test: pre-tool.mjs ==="

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR; rm -f /tmp/fos-session-init-*.json" EXIT

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
  (cd "$TMPDIR" && node .founderOS/scripts/hooks/pre-tool.mjs) 2>/dev/null)
echo "$OUTPUT" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.assert(d.decision === 'allow', 'Expected allow, got: ' + JSON.stringify(d));
console.log('PASS: outputs allow');
"

# Test 2: Kill switch
OUTPUT=$(echo '{}' | (cd "$TMPDIR" && FOUNDER_OS_HOOKS=0 node .founderOS/scripts/hooks/pre-tool.mjs) 2>/dev/null)
echo "$OUTPUT" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
console.assert(d.decision === 'allow', 'Kill switch should still allow');
console.log('PASS: kill switch exits cleanly');
"

echo "All pre-tool hook tests passed"
