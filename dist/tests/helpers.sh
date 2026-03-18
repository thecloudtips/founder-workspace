#!/usr/bin/env bash
# tests/helpers.sh — shared setup/teardown for CLI tests

setup_test_dir() {
  TEST_DIR="$(mktemp -d)"
  export TEST_DIR
  # Point CLI at the test directory
  cd "$TEST_DIR"
}

teardown_test_dir() {
  cd /
  [[ -n "${TEST_DIR:-}" ]] && rm -rf "$TEST_DIR"
}

# Path to the CLI
CLI_BIN="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/bin/founder-os.js"
export CLI_BIN

assert_file_exists() {
  if [[ ! -f "$1" ]]; then
    echo "FAIL: Expected file $1 to exist"
    exit 1
  fi
}

assert_file_not_exists() {
  if [[ -f "$1" ]]; then
    echo "FAIL: Expected file $1 to NOT exist"
    exit 1
  fi
}

assert_dir_exists() {
  if [[ ! -d "$1" ]]; then
    echo "FAIL: Expected directory $1 to exist"
    exit 1
  fi
}

assert_contains() {
  local file="$1" pattern="$2"
  if ! grep -q "$pattern" "$file" 2>/dev/null; then
    echo "FAIL: Expected $file to contain '$pattern'"
    exit 1
  fi
}

assert_not_contains() {
  local file="$1" pattern="$2"
  if grep -q "$pattern" "$file" 2>/dev/null; then
    echo "FAIL: Expected $file to NOT contain '$pattern'"
    exit 1
  fi
}

pass() {
  echo "PASS: $1"
}
