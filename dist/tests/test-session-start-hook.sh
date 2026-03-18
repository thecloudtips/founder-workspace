#!/bin/bash
# tests/test-session-start-hook.sh — verify SessionStart hook
set -e
cd "$(dirname "$0")/.."

echo "=== Test: session-start.mjs ==="

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR; rm -f /tmp/fos-decay-*.txt" EXIT

# Set up mock project
mkdir -p "$TMPDIR/.founderOS/scripts/hooks/lib"
mkdir -p "$TMPDIR/.founderOS/infrastructure/context/active"

# Copy files
cp template/.founderOS/scripts/hooks/session-start.mjs "$TMPDIR/.founderOS/scripts/hooks/"
cp template/.founderOS/scripts/hooks/lib/*.mjs "$TMPDIR/.founderOS/scripts/hooks/lib/"

# Test 1: Kill switch exits with no output
OUTPUT=$(FOUNDER_OS_HOOKS=0 node "$TMPDIR/.founderOS/scripts/hooks/session-start.mjs" 2>/dev/null || true)
if [ -z "$OUTPUT" ]; then
  echo "PASS: kill switch produces no output"
else
  echo "FAIL: kill switch should produce no output, got: $OUTPUT"
  exit 1
fi

# Test 2: Output contains dispatcher rules
OUTPUT=$(cd "$TMPDIR" && node .founderOS/scripts/hooks/session-start.mjs 2>/dev/null)
if echo "$OUTPUT" | grep -q "Founder OS Dispatcher Rules"; then
  echo "PASS: output contains dispatcher rules"
else
  echo "FAIL: missing dispatcher rules in output"
  exit 1
fi

# Test 3: Output contains execution-mode instructions
if echo "$OUTPUT" | grep -q "execution-mode"; then
  echo "PASS: output contains execution-mode instructions"
else
  echo "FAIL: missing execution-mode instructions"
  exit 1
fi

# Test 4: Business context paths listed if context files exist
echo "# Test context" > "$TMPDIR/.founderOS/infrastructure/context/active/test.md"
OUTPUT=$(cd "$TMPDIR" && node .founderOS/scripts/hooks/session-start.mjs 2>/dev/null)
if echo "$OUTPUT" | grep -q "Business Context Files"; then
  echo "PASS: business context files listed"
else
  echo "FAIL: business context not listed"
  exit 1
fi

echo "All session-start hook tests passed"
