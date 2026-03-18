#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/helpers.sh"

echo "=== Test: CLAUDE.md Merge Scenarios ==="

# Scenario 1: No existing CLAUDE.md
echo "--- Scenario 1: Fresh (no existing CLAUDE.md) ---"
setup_test_dir
node "$CLI_BIN" --init
assert_contains "$TEST_DIR/.claude/CLAUDE.md" "founder-os:start"
assert_contains "$TEST_DIR/.claude/CLAUDE.md" "founder-os:end"
pass "Fresh: markers present"
teardown_test_dir

# Scenario 2: Existing CLAUDE.md without markers
echo "--- Scenario 2: Existing CLAUDE.md without markers ---"
setup_test_dir
mkdir -p "$TEST_DIR/.claude"
printf "# My Project\n\nExisting content here." > "$TEST_DIR/.claude/CLAUDE.md"
node "$CLI_BIN" --init
assert_contains "$TEST_DIR/.claude/CLAUDE.md" "founder-os:start"
assert_contains "$TEST_DIR/.claude/CLAUDE.md" "Existing content here"
pass "Prepend: markers added, existing content preserved"
teardown_test_dir

# Scenario 3: Existing CLAUDE.md with markers (update)
echo "--- Scenario 3: Update existing markers ---"
setup_test_dir
node "$CLI_BIN" --init
# Add user content outside markers
printf "\n# My Custom Section\nUser content." >> "$TEST_DIR/.claude/CLAUDE.md"
# Re-run init (simulating update — need --force for same version)
node "$CLI_BIN" --init --force
assert_contains "$TEST_DIR/.claude/CLAUDE.md" "founder-os:start"
assert_contains "$TEST_DIR/.claude/CLAUDE.md" "My Custom Section"
pass "Update: markers replaced, user content preserved"
teardown_test_dir

# Scenario 4: Uninstall removes markers only
echo "--- Scenario 4: Uninstall removes markers ---"
setup_test_dir
mkdir -p "$TEST_DIR/.claude"
printf "# My Project" > "$TEST_DIR/.claude/CLAUDE.md"
node "$CLI_BIN" --init
printf "\n# Keep This" >> "$TEST_DIR/.claude/CLAUDE.md"
node "$CLI_BIN" --uninstall
assert_not_contains "$TEST_DIR/.claude/CLAUDE.md" "founder-os:start"
assert_contains "$TEST_DIR/.claude/CLAUDE.md" "Keep This"
pass "Uninstall: markers removed, user content kept"
teardown_test_dir

echo "=== All CLAUDE.md merge tests passed ==="
