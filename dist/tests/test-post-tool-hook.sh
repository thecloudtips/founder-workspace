#!/bin/bash
# tests/test-post-tool-hook.sh — verify PostToolUse hook
set -e
cd "$(dirname "$0")/.."

echo "=== Test: post-tool.mjs ==="

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Set up mock project
mkdir -p "$TMPDIR/.founderOS/scripts/hooks/lib"
cp template/.founderOS/scripts/hooks/post-tool.mjs "$TMPDIR/.founderOS/scripts/hooks/"
cp template/.founderOS/scripts/hooks/lib/*.mjs "$TMPDIR/.founderOS/scripts/hooks/lib/"

# Test 1: Kill switch exits cleanly
OUTPUT=$(echo '{}' | FOUNDER_OS_HOOKS=0 node "$TMPDIR/.founderOS/scripts/hooks/post-tool.mjs" 2>/dev/null || true)
if [ -z "$OUTPUT" ]; then
  echo "PASS: kill switch exits cleanly"
else
  echo "FAIL: kill switch should produce no output"
  exit 1
fi

# Test 2: Non-Skill tool calls → fast exit, no output
OUTPUT=$(echo '{"tool_name":"Bash","tool_input":{}}' | (cd "$TMPDIR" && node .founderOS/scripts/hooks/post-tool.mjs) 2>/dev/null || true)
if [ -z "$OUTPUT" ]; then
  echo "PASS: non-Skill tool has no output"
else
  echo "FAIL: non-Skill should have no output"
  exit 1
fi

# Test 3: Non-founder-os Skill → fast exit
OUTPUT=$(echo '{"tool_name":"Skill","tool_input":{"skill":"other:thing"}}' | (cd "$TMPDIR" && node .founderOS/scripts/hooks/post-tool.mjs) 2>/dev/null || true)
if [ -z "$OUTPUT" ]; then
  echo "PASS: non-founder-os skill has no output"
else
  echo "FAIL: non-founder-os skill should have no output"
  exit 1
fi

echo "All post-tool hook tests passed"
