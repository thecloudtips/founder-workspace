#!/bin/bash
# tests/test-hooks-merge.sh — verify hook merge/remove in settings.json
set -e
cd "$(dirname "$0")/.."

echo "=== Test: hooks merge ==="

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Test 1: Merge hooks into empty settings.json
cat > "$TMPDIR/settings.json" << 'JSON'
{"permissions":{"allow":["Bash(npx founder-os*)"]}}
JSON
cat > "$TMPDIR/registry.json" << 'JSON'
{"version":1,"hooks":{"PreToolUse":[{"matcher":"","hooks":[{"type":"command","command":"node .founderOS/scripts/hooks/pre-tool.mjs","timeout":2000}]}]}}
JSON

node -e "
const sj = require('./lib/settings-json.js');
sj.mergeHooksIntoSettingsJson('$TMPDIR/settings.json', '$TMPDIR/registry.json');
const result = JSON.parse(require('fs').readFileSync('$TMPDIR/settings.json','utf8'));
console.assert(result.hooks, 'Expected hooks key');
console.assert(result.hooks.PreToolUse.length === 1, 'Expected 1 PreToolUse matcher group');
console.assert(Array.isArray(result.hooks.PreToolUse[0].hooks), 'Expected hooks array inside matcher group');
console.assert(result.hooks.PreToolUse[0].hooks[0].command.includes('.founderOS'), 'Hook command should reference .founderOS');
console.assert(result.permissions.allow[0] === 'Bash(npx founder-os*)', 'Permissions preserved');
console.log('PASS: merge into empty');
"

# Test 2: Idempotent — running merge twice doesn't duplicate
node -e "
const sj = require('./lib/settings-json.js');
sj.mergeHooksIntoSettingsJson('$TMPDIR/settings.json', '$TMPDIR/registry.json');
const result = JSON.parse(require('fs').readFileSync('$TMPDIR/settings.json','utf8'));
console.assert(result.hooks.PreToolUse.length === 1, 'Expected 1 matcher group, not 2');
console.log('PASS: idempotent merge');
"

# Test 3: Remove hooks
node -e "
const sj = require('./lib/settings-json.js');
sj.removeHooksFromSettingsJson('$TMPDIR/settings.json');
const result = JSON.parse(require('fs').readFileSync('$TMPDIR/settings.json','utf8'));
const hasHooks = result.hooks && Object.values(result.hooks).some(arr => arr.some(g => g.hooks && g.hooks.some(h => h.command.includes('.founderOS'))));
console.assert(!hasHooks, 'founderOS hooks should be removed');
console.assert(result.permissions.allow[0] === 'Bash(npx founder-os*)', 'Permissions still preserved');
console.log('PASS: remove hooks');
"

# Test 4: Existing user hooks are preserved during remove
cat > "$TMPDIR/settings2.json" << 'JSON'
{"hooks":{"PreToolUse":[{"matcher":"","hooks":[{"type":"command","command":"node my-custom-hook.mjs"}]},{"matcher":"","hooks":[{"type":"command","command":"node .founderOS/scripts/hooks/pre-tool.mjs","timeout":2000}]}]}}
JSON
node -e "
const sj = require('./lib/settings-json.js');
sj.removeHooksFromSettingsJson('$TMPDIR/settings2.json');
const result = JSON.parse(require('fs').readFileSync('$TMPDIR/settings2.json','utf8'));
console.assert(result.hooks.PreToolUse.length === 1, 'Expected 1 user matcher group remaining');
console.assert(result.hooks.PreToolUse[0].hooks[0].command === 'node my-custom-hook.mjs', 'User hook preserved');
console.log('PASS: user hooks preserved');
"

echo "All hooks merge tests passed"
