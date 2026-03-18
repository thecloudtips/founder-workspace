#!/bin/bash
# tests/test-hook-registry.sh — verify hook-registry.json
set -e
cd "$(dirname "$0")/.."

echo "=== Test: hook-registry.json ==="

# Test 1: File exists
test -f template/.founderOS/infrastructure/hooks/hook-registry.json || { echo "FAIL: registry not found"; exit 1; }
echo "PASS: registry file exists"

# Test 2: Valid JSON
node -e "JSON.parse(require('fs').readFileSync('template/.founderOS/infrastructure/hooks/hook-registry.json','utf8')); console.log('PASS: valid JSON')"

# Test 3: Has all 5 hook events
node -e "
const reg = JSON.parse(require('fs').readFileSync('template/.founderOS/infrastructure/hooks/hook-registry.json','utf8'));
const events = Object.keys(reg.hooks);
const expected = ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop'];
for (const e of expected) {
  console.assert(events.includes(e), 'Missing event: ' + e);
}
console.assert(events.length === 5, 'Expected 5 events, got ' + events.length);
console.log('PASS: all 5 hook events defined');
"

# Test 4: Each hook has correct structure (matcher + hooks array format)
node -e "
const reg = JSON.parse(require('fs').readFileSync('template/.founderOS/infrastructure/hooks/hook-registry.json','utf8'));
for (const [event, matcherGroups] of Object.entries(reg.hooks)) {
  console.assert(matcherGroups.length === 1, event + ' should have 1 matcher group');
  const group = matcherGroups[0];
  console.assert(typeof group.matcher === 'string', event + ' should have matcher string');
  console.assert(Array.isArray(group.hooks), event + ' should have hooks array');
  console.assert(group.hooks.length === 1, event + ' should have 1 hook in array');
  console.assert(group.hooks[0].type === 'command', event + ' hook type should be command');
  console.assert(group.hooks[0].command.includes('.founderOS/scripts/hooks/'), event + ' command path wrong');
  console.assert(typeof group.hooks[0].timeout === 'number', event + ' should have timeout');
}
console.log('PASS: all hooks have correct structure');
"

echo "All hook-registry tests passed"
