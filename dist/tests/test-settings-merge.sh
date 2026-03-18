#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/helpers.sh"

echo "=== Test: settings.json Merge ==="

# Scenario 1: Fresh — no existing settings.json
echo "--- Scenario 1: Fresh settings ---"
setup_test_dir
node "$CLI_BIN" --init
assert_file_exists "$TEST_DIR/.claude/settings.json"
assert_contains "$TEST_DIR/.claude/settings.json" "founder-os"
pass "Fresh: settings.json created with founderOS permissions"
teardown_test_dir

# Scenario 2: Merge into existing settings
echo "--- Scenario 2: Merge with existing ---"
setup_test_dir
mkdir -p "$TEST_DIR/.claude"
echo '{"permissions":{"allow":["Bash(npm test)"]},"customSetting":true}' > "$TEST_DIR/.claude/settings.json"
node "$CLI_BIN" --init
assert_contains "$TEST_DIR/.claude/settings.json" "npm test"
assert_contains "$TEST_DIR/.claude/settings.json" "founder-os"
assert_contains "$TEST_DIR/.claude/settings.json" "customSetting"
pass "Merge: existing permissions and settings preserved"
teardown_test_dir

# Scenario 3: Uninstall removes only founderOS entries
echo "--- Scenario 3: Uninstall cleanup ---"
setup_test_dir
mkdir -p "$TEST_DIR/.claude"
echo '{"permissions":{"allow":["Bash(npm test)"]}}' > "$TEST_DIR/.claude/settings.json"
node "$CLI_BIN" --init
node "$CLI_BIN" --uninstall
assert_contains "$TEST_DIR/.claude/settings.json" "npm test"
assert_not_contains "$TEST_DIR/.claude/settings.json" "founder-os"
pass "Uninstall: founderOS entries removed, user entries kept"
teardown_test_dir

echo "=== All settings.json merge tests passed ==="
