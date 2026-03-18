#!/bin/bash
# tests/test-stop-hook.sh — verify Stop hook
set -e
cd "$(dirname "$0")/.."

echo "=== Test: stop.mjs ==="

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR; rm -f /tmp/fos-session-init-*.json /tmp/fos-decay-*.txt" EXIT

# Set up mock project
mkdir -p "$TMPDIR/.founderOS/scripts/hooks/lib"
cp template/.founderOS/scripts/hooks/stop.mjs "$TMPDIR/.founderOS/scripts/hooks/"
cp template/.founderOS/scripts/hooks/lib/*.mjs "$TMPDIR/.founderOS/scripts/hooks/lib/"

# Test 1: Kill switch exits cleanly
FOUNDER_OS_HOOKS=0 node "$TMPDIR/.founderOS/scripts/hooks/stop.mjs" 2>/dev/null
echo "PASS: kill switch exits cleanly"

# Test 2: Cleans up session temp files
# Use resolved path (macOS /tmp → /private/tmp) to match process.cwd()
RESOLVED_TMPDIR=$(cd "$TMPDIR" && pwd -P)
HASH=$(node -e "const c=require('crypto');console.log(c.createHash('md5').update('$RESOLVED_TMPDIR').digest('hex').slice(0,8))")
echo '{"memoryReady":true}' > "/tmp/fos-session-init-$HASH.json"
echo "test" > "/tmp/fos-decay-$HASH.txt"

(cd "$TMPDIR" && node .founderOS/scripts/hooks/stop.mjs 2>/dev/null) || true

if [ ! -f "/tmp/fos-session-init-$HASH.json" ]; then
  echo "PASS: session file cleaned up"
else
  echo "FAIL: session file still exists"
  exit 1
fi

if [ ! -f "/tmp/fos-decay-$HASH.txt" ]; then
  echo "PASS: decay marker cleaned up"
else
  echo "FAIL: decay marker still exists"
  exit 1
fi

echo "All stop hook tests passed"
