#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/helpers.sh"

echo "=== Test: Uninstall ==="

# Scenario 1: Clean uninstall
echo "--- Scenario 1: Clean uninstall ---"
setup_test_dir
node "$CLI_BIN" --init
node "$CLI_BIN" --uninstall
assert_file_not_exists "$TEST_DIR/.founderOS/version.json"
assert_file_not_exists "$TEST_DIR/.founderOS/manifest.json"
pass "Clean uninstall removes .founderOS/"
teardown_test_dir

# Scenario 2: Uninstall preserves non-founderOS CLAUDE.md content
echo "--- Scenario 2: Uninstall preserves user CLAUDE.md content ---"
setup_test_dir
mkdir -p "$TEST_DIR/.claude"
printf "# My Project\nUser content." > "$TEST_DIR/.claude/CLAUDE.md"
node "$CLI_BIN" --init
node "$CLI_BIN" --uninstall
assert_contains "$TEST_DIR/.claude/CLAUDE.md" "User content"
assert_not_contains "$TEST_DIR/.claude/CLAUDE.md" "founder-os:start"
pass "Uninstall preserves user CLAUDE.md content"
teardown_test_dir

echo "=== All uninstall tests passed ==="
