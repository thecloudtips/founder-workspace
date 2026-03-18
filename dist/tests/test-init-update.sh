#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/helpers.sh"

echo "=== Test: Update Flow ==="

# Scenario 1: Same version — should exit early
echo "--- Scenario 1: Same version, no --force ---"
setup_test_dir
node "$CLI_BIN" --init
OUTPUT=$(node "$CLI_BIN" --init 2>&1)
if [[ "$OUTPUT" != *"already installed"* ]]; then
  echo "FAIL: Expected 'already installed' message"
  exit 1
fi
pass "Same version exits early"
teardown_test_dir

# Scenario 2: --force triggers update on same version
echo "--- Scenario 2: --force triggers repair on same version ---"
setup_test_dir
node "$CLI_BIN" --init
OUTPUT=$(node "$CLI_BIN" --init --force 2>&1)
if [[ "$OUTPUT" == *"already installed"* ]]; then
  echo "FAIL: --force should not exit early"
  exit 1
fi
pass "--force bypasses same-version check"
teardown_test_dir

echo "=== All update tests passed ==="
