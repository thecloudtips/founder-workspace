#!/usr/bin/env bash
# tests/test-with-plugins.sh
# Integration tests for --with-plugins flag
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CLI="$SCRIPT_DIR/../bin/founder-os.js"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

PASS=0
FAIL=0

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo -e "${GREEN}PASS${NC}: $desc"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}FAIL${NC}: $desc (expected '$expected', got '$actual')"
    FAIL=$((FAIL + 1))
  fi
}

assert_contains() {
  local desc="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -qF -- "$expected"; then
    echo -e "${GREEN}PASS${NC}: $desc"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}FAIL${NC}: $desc (expected to contain '$expected')"
    FAIL=$((FAIL + 1))
  fi
}

# --- Test 1: --with-plugins without --init fails ---
echo ""
echo "=== Test 1: --with-plugins requires --init ==="
OUTPUT=$(node "$CLI" --with-plugins 2>&1 || true)
assert_contains "rejects --with-plugins alone" "--with-plugins requires --init" "$OUTPUT"

# --- Test 2: --help shows --with-plugins ---
echo ""
echo "=== Test 2: Help text includes --with-plugins ==="
OUTPUT=$(node "$CLI" --help 2>&1)
assert_contains "help mentions --with-plugins" "--with-plugins" "$OUTPUT"

# --- Test 3: Plugin module loads with correct count ---
echo ""
echo "=== Test 3: Plugin list has 9 entries ==="
COUNT=$(node -e "const p = require('$SCRIPT_DIR/../lib/plugins.js'); console.log(p.RECOMMENDED_PLUGINS.length)")
assert_eq "9 recommended plugins" "9" "$COUNT"

# --- Test 4: Plugin tiers are correct ---
echo ""
echo "=== Test 4: Plugin tiers ==="
TIER1=$(node -e "
  const p = require('$SCRIPT_DIR/../lib/plugins.js');
  console.log(p.RECOMMENDED_PLUGINS.filter(x => x.tier === 1).length);
")
TIER2=$(node -e "
  const p = require('$SCRIPT_DIR/../lib/plugins.js');
  console.log(p.RECOMMENDED_PLUGINS.filter(x => x.tier === 2).length);
")
assert_eq "5 tier-1 plugins" "5" "$TIER1"
assert_eq "4 tier-2 plugins" "4" "$TIER2"

# --- Test 5: Plugin key generation ---
echo ""
echo "=== Test 5: Plugin key format ==="
KEY_WITH_SOURCE=$(node -e "
  const p = require('$SCRIPT_DIR/../lib/plugins.js');
  console.log(p.pluginKey({ name: 'context7', source: 'claude-plugins-official' }));
")
KEY_WITHOUT_SOURCE=$(node -e "
  const p = require('$SCRIPT_DIR/../lib/plugins.js');
  console.log(p.pluginKey({ name: 'pyright-lsp', source: null }));
")
assert_eq "key with source" "context7@claude-plugins-official" "$KEY_WITH_SOURCE"
assert_eq "key without source" "pyright-lsp" "$KEY_WITHOUT_SOURCE"

# --- Test 6: Manifest plugin tracking ---
echo ""
echo "=== Test 6: Manifest plugin tracking ==="
MANIFEST_TEST=$(node -e "
  const m = require('$SCRIPT_DIR/../lib/manifest.js');
  const mf = m.createEmptyManifest('1.0.0');
  // Should have plugins key
  if (!mf.plugins) { console.log('FAIL: no plugins key'); process.exit(1); }
  m.addPluginToManifest(mf, 'test', 'source', 1, 'installed');
  if (mf.plugins['test@source'].status !== 'installed') { console.log('FAIL: wrong status'); process.exit(1); }
  m.addPluginToManifest(mf, 'broken', null, 2, 'failed', 'timeout');
  if (mf.plugins['broken'].error !== 'timeout') { console.log('FAIL: no error'); process.exit(1); }
  console.log('OK');
")
assert_eq "manifest tracks plugins" "OK" "$MANIFEST_TEST"

# --- Summary ---
echo ""
echo "=============================="
echo -e "Results: ${GREEN}${PASS} passed${NC}, ${RED}${FAIL} failed${NC}"
echo "=============================="
[ "$FAIL" -eq 0 ] || exit 1
