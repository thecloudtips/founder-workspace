#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/helpers.sh"

echo "=== Test: --version and --status ==="

# Test --version without install
echo "--- --version without install ---"
setup_test_dir
OUTPUT=$(node "$CLI_BIN" --version 2>&1)
if [[ "$OUTPUT" != *"not installed"* ]]; then
  echo "FAIL: Expected 'not installed' in version output"
  exit 1
fi
pass "--version shows 'not installed' when no install"
teardown_test_dir

# Test --version with install
echo "--- --version with install ---"
setup_test_dir
node "$CLI_BIN" --init
OUTPUT=$(node "$CLI_BIN" --version 2>&1)
if [[ "$OUTPUT" != *"Installed: v"* ]]; then
  echo "FAIL: Expected installed version in output"
  exit 1
fi
pass "--version shows installed version"
teardown_test_dir

# Test --status without install
echo "--- --status without install ---"
setup_test_dir
OUTPUT=$(node "$CLI_BIN" --status 2>&1)
if [[ "$OUTPUT" != *"not installed"* ]]; then
  echo "FAIL: Expected 'not installed' in status output"
  exit 1
fi
pass "--status shows 'not installed'"
teardown_test_dir

echo "=== All version/status tests passed ==="
