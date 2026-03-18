#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/helpers.sh"

echo "=== Test: Fresh Install ==="
setup_test_dir

# Run init
node "$CLI_BIN" --init

# Verify .founderOS/ created
assert_dir_exists "$TEST_DIR/.founderOS"
assert_file_exists "$TEST_DIR/.founderOS/version.json"
assert_file_exists "$TEST_DIR/.founderOS/manifest.json"
pass ".founderOS/ directory created with version and manifest"

# Verify .claude/ created
assert_dir_exists "$TEST_DIR/.claude"
pass ".claude/ directory created"

# Verify CLAUDE.md has markers
assert_file_exists "$TEST_DIR/.claude/CLAUDE.md"
assert_contains "$TEST_DIR/.claude/CLAUDE.md" "founder-os:start"
assert_contains "$TEST_DIR/.claude/CLAUDE.md" "founder-os:end"
pass "CLAUDE.md created with section markers"

# Verify settings.json has permissions
assert_file_exists "$TEST_DIR/.claude/settings.json"
assert_contains "$TEST_DIR/.claude/settings.json" "founder-os"
pass "settings.json created with founderOS permissions"

# Verify version.json has correct version
INSTALLED_VERSION=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$TEST_DIR/.founderOS/version.json','utf8')).version)")
PKG_VERSION=$(node -e "console.log(require('$(dirname "$CLI_BIN")/../package.json').version)")
if [[ "$INSTALLED_VERSION" != "$PKG_VERSION" ]]; then
  echo "FAIL: version.json ($INSTALLED_VERSION) != package.json ($PKG_VERSION)"
  exit 1
fi
pass "version.json matches package version"

teardown_test_dir
echo "=== All fresh install tests passed ==="
