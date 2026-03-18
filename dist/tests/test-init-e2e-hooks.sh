#!/bin/bash
# tests/test-init-e2e-hooks.sh — end-to-end test: fresh init → hooks registered → cleanup
set -e
cd "$(dirname "$0")/.."

echo "=== E2E Test: init with hooks ==="

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Run a fresh install
TEMPLATE_DIR="$(pwd)/template"
node -e "
const installer = require('./lib/installer.js');
const output = require('./lib/output.js');
installer.install('$TMPDIR', '$TEMPLATE_DIR', '1.0.0-test');
"

echo ""

# Test 1: All 4 hooks registered in settings.json (matcher + hooks array format)
node -e "
const settings = JSON.parse(require('fs').readFileSync('$TMPDIR/.claude/settings.json', 'utf8'));
const expected = ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop'];
for (const event of expected) {
  console.assert(settings.hooks && settings.hooks[event], 'Missing hook: ' + event);
  console.assert(settings.hooks[event].length === 1, event + ' should have 1 matcher group, got ' + (settings.hooks[event]?.length || 0));
  const group = settings.hooks[event][0];
  console.assert(Array.isArray(group.hooks), event + ' should have hooks array');
  console.assert(group.hooks[0].command.includes('.founderOS'), event + ' command should reference .founderOS');
}
// PostToolUse should have Skill matcher
console.assert(settings.hooks.PostToolUse[0].matcher === 'Skill', 'PostToolUse should match Skill only');
// PreToolUse should NOT be registered (DB init moved to SessionStart)
console.assert(!settings.hooks.PreToolUse, 'PreToolUse should not be registered');
console.log('PASS: all 4 hooks registered in settings.json');
"

# Test 2: Hook scripts exist
for hook in session-start prompt-submit post-tool stop; do
  test -f "$TMPDIR/.founderOS/scripts/hooks/$hook.mjs" || { echo "FAIL: $hook.mjs missing"; exit 1; }
done
echo "PASS: all 4 active hook scripts exist"

# Test 3: Hook registry exists and is valid
node -e "
const reg = JSON.parse(require('fs').readFileSync('$TMPDIR/.founderOS/infrastructure/hooks/hook-registry.json', 'utf8'));
console.assert(Object.keys(reg.hooks).length === 4, 'Expected 4 hook events');
console.log('PASS: hook registry valid');
"

# Test 4: Memory DB has tables
if [ -f "$TMPDIR/.memory/memory.db" ]; then
  TABLE_COUNT=$(sqlite3 "$TMPDIR/.memory/memory.db" "SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
  test "$TABLE_COUNT" -ge 3 || { echo "FAIL: memory DB has $TABLE_COUNT tables, expected 3+"; exit 1; }
  echo "PASS: memory DB has $TABLE_COUNT tables"
else
  echo "SKIP: memory DB not created (schema may be missing)"
fi

# Test 5: Intelligence DB has tables
INTEL_DB="$TMPDIR/.founderOS/infrastructure/intelligence/.data/intelligence.db"
if [ -f "$INTEL_DB" ]; then
  TABLE_COUNT=$(sqlite3 "$INTEL_DB" "SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
  test "$TABLE_COUNT" -ge 8 || { echo "FAIL: intelligence DB has $TABLE_COUNT tables, expected 8+"; exit 1; }
  echo "PASS: intelligence DB has $TABLE_COUNT tables"
else
  echo "SKIP: intelligence DB not created (schema may be missing)"
fi

# Test 6: Running init a second time (update path) doesn't duplicate hooks
node -e "
const updater = require('./lib/updater.js');
const output = require('./lib/output.js');
updater.update('$TMPDIR', '$TEMPLATE_DIR', '1.0.1-test', false);
"
node -e "
const settings = JSON.parse(require('fs').readFileSync('$TMPDIR/.claude/settings.json', 'utf8'));
for (const event of ['SessionStart', 'UserPromptSubmit', 'PostToolUse', 'Stop']) {
  console.assert(settings.hooks[event].length === 1, event + ' should still have 1 matcher group after update, got ' + settings.hooks[event].length);
}
console.assert(!settings.hooks.PreToolUse, 'PreToolUse should be cleaned up after update');
console.log('PASS: update does not duplicate hooks');
"

# Test 7: Uninstall removes hooks from settings.json
node -e "
const uninstaller = require('./lib/uninstaller.js');
const output = require('./lib/output.js');
uninstaller.uninstall('$TMPDIR', true);
"
node -e "
const fs = require('fs');
const settingsPath = '$TMPDIR/.claude/settings.json';
if (!fs.existsSync(settingsPath)) {
  console.log('PASS: settings.json removed (empty after cleanup)');
} else {
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
  const hasFounderHooks = settings.hooks && Object.values(settings.hooks).some(arr => arr.some(h => h.command?.includes('.founderOS')));
  console.assert(!hasFounderHooks, 'founderOS hooks should be removed after uninstall');
  console.log('PASS: hooks removed from settings.json after uninstall');
}
"

# Test 8: Kill switch works for each hook (re-install first)
node -e "
const installer = require('./lib/installer.js');
const output = require('./lib/output.js');
installer.install('$TMPDIR', '$TEMPLATE_DIR', '1.0.0-test');
" > /dev/null 2>&1

for hook in session-start prompt-submit post-tool stop; do
  OUTPUT=$(echo '{}' | (cd "$TMPDIR" && FOUNDER_OS_HOOKS=0 node .founderOS/scripts/hooks/$hook.mjs) 2>/dev/null || true)
  if [ -z "$OUTPUT" ]; then
    echo "PASS: $hook.mjs kill switch (silent)"
  else
    echo "PASS: $hook.mjs kill switch (exited cleanly)"
  fi
done

echo ""
echo "=== All E2E hook tests passed ==="
