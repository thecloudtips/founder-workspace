# [17] Init Plugin Install — `--with-plugins` Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `--with-plugins` flag to the `npx founder-os --init` CLI that installs 9 recommended Claude Code plugins from the official Anthropic marketplace into project scope.

**Architecture:** A new `lib/plugins.js` module handles plugin installation via `child_process.execSync` calls to `claude plugin install`. The existing `bin/founder-os.js` gains flag parsing and a post-install hook. Manifest gets a `plugins` key for tracking install state.

**Tech Stack:** Node.js >= 18 (built-ins: `child_process`, `fs`), existing CLI modules (`manifest.js`, `output.js`)

**Spec:** `docs/superpowers/specs/[17]-2026-03-17-init-plugin-install-design.md`

**Skills to use during implementation:**
- `@superpowers:test-driven-development` — TDD for the plugin module
- `@superpowers:verification-before-completion` — verify each chunk works

**Review gate:** Every chunk requires review before commit.

**Working directory:** `founder-os-dist/` (the npm package repo)

---

## File Structure

### Files to Create

```
# Chunk 1: Plugin module (in founder-os-dist repo)
lib/plugins.js                       # Plugin list, CLI detection, install logic, manifest tracking

# Chunk 2: Tests (in founder-os-dist repo)
tests/test-with-plugins.sh           # Integration tests for --with-plugins flag
```

### Files to Modify

```
# Chunk 1: CLI integration (in founder-os-dist repo)
bin/founder-os.js                    # Add --with-plugins flag parsing, call plugins module after init
lib/manifest.js                      # Add plugins helpers (addPlugin, readPlugins)
lib/uninstaller.js                   # Strip plugins key from manifest on --uninstall
```

---

## Chunk 1: Plugin Module and CLI Integration

**Wave:** 1 (single chunk — small feature, sequential dependencies)
**Subagent count:** 1
**Estimated steps:** ~30

### Task 1.1: Extend Manifest Module with Plugin Helpers

**Files:**
- Modify: `founder-os-dist/lib/manifest.js`

- [ ] **Step 1: Write tests for manifest plugin helpers**

Create a quick test script to verify the manifest plugin helpers:

```bash
# Run from founder-os-dist/
node -e "
const m = require('./lib/manifest.js');
const mf = m.createEmptyManifest('1.0.0');

// Should have plugins key
console.assert(mf.plugins !== undefined, 'manifest should have plugins key');
console.assert(typeof mf.plugins === 'object', 'plugins should be an object');

// Add a plugin
m.addPluginToManifest(mf, 'context7', 'claude-plugins-official', 1, 'installed');
console.assert(mf.plugins['context7@claude-plugins-official'] !== undefined, 'plugin should be added');
console.assert(mf.plugins['context7@claude-plugins-official'].status === 'installed', 'status should be installed');
console.assert(mf.plugins['context7@claude-plugins-official'].tier === 1, 'tier should be 1');

// Add a failed plugin
m.addPluginToManifest(mf, 'broken', null, 2, 'failed', 'network error');
console.assert(mf.plugins['broken'].status === 'failed', 'status should be failed');
console.assert(mf.plugins['broken'].error === 'network error', 'error should be recorded');

console.log('All manifest plugin tests passed');
"
```

Expected: Tests fail because `addPluginToManifest` doesn't exist yet and `createEmptyManifest` doesn't include `plugins`.

- [ ] **Step 2: Implement manifest plugin helpers**

Add to `lib/manifest.js` — modify `createEmptyManifest` and add `addPluginToManifest`:

In `createEmptyManifest`, add `plugins: {}` to the returned object:

```javascript
function createEmptyManifest(version) {
  return {
    version,
    installedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    files: {},
    plugins: {},
  };
}
```

Add new function before `module.exports`:

```javascript
function addPluginToManifest(manifest, name, source, tier, status, error) {
  const key = source ? `${name}@${source}` : name;
  manifest.plugins = manifest.plugins || {};
  manifest.plugins[key] = {
    installedAt: status === 'installed' ? new Date().toISOString() : undefined,
    lastAttempt: new Date().toISOString(),
    tier,
    status,
  };
  if (error) manifest.plugins[key].error = error;
}
```

Export `addPluginToManifest` in `module.exports`.

- [ ] **Step 3: Run manifest tests to verify they pass**

Run the test script from Step 1.
Expected: `All manifest plugin tests passed`

- [ ] **Step 4: Commit**

```bash
cd founder-os-dist
git add lib/manifest.js
git commit -m "feat: add plugin tracking to manifest module"
```

---

### Task 1.2: Create Plugin Module

**Files:**
- Create: `founder-os-dist/lib/plugins.js`

- [ ] **Step 1: Write tests for plugin module**

```bash
# Run from founder-os-dist/
# Test 1: Module loads and exports expected functions
node -e "
const p = require('./lib/plugins.js');
console.assert(typeof p.checkClaudeCli === 'function', 'checkClaudeCli should exist');
console.assert(typeof p.installRecommended === 'function', 'installRecommended should exist');
console.assert(typeof p.RECOMMENDED_PLUGINS === 'object', 'RECOMMENDED_PLUGINS should exist');
console.assert(Array.isArray(p.RECOMMENDED_PLUGINS), 'RECOMMENDED_PLUGINS should be array');
console.assert(p.RECOMMENDED_PLUGINS.length === 9, 'Should have 9 recommended plugins');
console.log('Plugin module structure tests passed');
"
```

Expected: Fails because `lib/plugins.js` doesn't exist yet.

- [ ] **Step 2: Create the plugin module**

```javascript
// lib/plugins.js
// Plugin installation via claude CLI — project scope
'use strict';

const { execSync } = require('child_process');
const output = require('./output.js');

const RECOMMENDED_PLUGINS = [
  // Tier 1: Official Anthropic
  { name: 'context7', source: 'claude-plugins-official', tier: 1 },
  { name: 'superpowers', source: 'claude-plugins-official', tier: 1 },
  { name: 'skill-creator', source: 'claude-plugins-official', tier: 1 },
  { name: 'frontend-design', source: 'claude-plugins-official', tier: 1 },
  { name: 'typescript-lsp', source: 'claude-plugins-official', tier: 1 },
  // Tier 2: Recommended Dev Plugins
  { name: 'claude-md-management', source: null, tier: 2 },
  { name: 'agent-sdk-dev', source: 'claude-code-plugins', tier: 2 },
  { name: 'plugin-dev', source: 'claude-code-plugins', tier: 2 },
  { name: 'pyright-lsp', source: null, tier: 2 },
];

function checkClaudeCli() {
  try {
    execSync('claude --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function pluginKey(plugin) {
  return plugin.source ? `${plugin.name}@${plugin.source}` : plugin.name;
}

function installPlugin(plugin) {
  const identifier = plugin.source
    ? `${plugin.name}@${plugin.source}`
    : plugin.name;
  try {
    execSync(`claude plugin install ${identifier} --scope project`, {
      stdio: 'pipe',
      timeout: 60000,
    });
    return { success: true };
  } catch (err) {
    const msg = err.stderr
      ? err.stderr.toString().trim().split('\n')[0]
      : 'unknown error';
    return { success: false, error: msg };
  }
}

function installRecommended(manifestData, force) {
  const existingPlugins = manifestData?.plugins || {};
  const results = { installed: [], skipped: [], failed: [] };

  // Check claude CLI first
  if (!checkClaudeCli()) {
    output.blank();
    output.warn('Claude CLI not found — skipping plugin installation');
    output.info('  Install Claude Code first, then run:');
    output.info('  npx founder-os@latest --init --with-plugins');
    return results;
  }

  output.blank();
  output.info('Installing recommended plugins...');
  output.blank();

  for (const plugin of RECOMMENDED_PLUGINS) {
    const key = pluginKey(plugin);
    const existing = existingPlugins[key];

    // Always skip user-removed plugins — respect user's choice even with --force
    if (existing?.status === 'user-removed') {
      results.skipped.push({ plugin, reason: 'user-removed' });
      continue;
    }

    // Skip already installed (unless --force to retry)
    if (existing?.status === 'installed' && !force) {
      results.skipped.push({ plugin, reason: 'already-installed' });
      output.success(`${plugin.name}${plugin.source ? ` (${plugin.source})` : ''} — already installed`);
      continue;
    }

    // Attempt install
    const result = installPlugin(plugin);

    if (result.success) {
      results.installed.push(plugin);
      output.success(`${plugin.name}${plugin.source ? ` (${plugin.source})` : ''}`);
    } else {
      results.failed.push({ plugin, error: result.error });
      output.warn(`${plugin.name} — install failed (${result.error})`);
    }
  }

  // Summary
  output.blank();
  const total = results.installed.length + results.skipped.filter(s => s.reason === 'already-installed').length;
  const failCount = results.failed.length;
  if (failCount === 0) {
    output.info(`${total}/${RECOMMENDED_PLUGINS.length} plugins installed (project scope)`);
  } else {
    output.info(`${total}/${RECOMMENDED_PLUGINS.length} plugins installed, ${failCount} skipped`);
    for (const f of results.failed) {
      const id = f.plugin.source
        ? `${f.plugin.name}@${f.plugin.source}`
        : f.plugin.name;
      output.info(`  Run manually: claude plugin install ${id} --scope project`);
    }
  }

  return results;
}

module.exports = {
  RECOMMENDED_PLUGINS,
  checkClaudeCli,
  installPlugin,
  installRecommended,
  pluginKey,
};
```

- [ ] **Step 3: Run structure tests to verify module loads**

Run the test script from Step 1.
Expected: `Plugin module structure tests passed`

- [ ] **Step 4: Commit**

```bash
cd founder-os-dist
git add lib/plugins.js
git commit -m "feat: add plugin installation module with 9 recommended plugins"
```

---

### Task 1.3: Integrate `--with-plugins` into CLI Entry Point

**Files:**
- Modify: `founder-os-dist/bin/founder-os.js`

- [ ] **Step 1: Add flag parsing**

In `bin/founder-os.js`, add to the `flags` object (line 23-30):

```javascript
const flags = {
  init: args.includes('--init'),
  version: args.includes('--version'),
  status: args.includes('--status'),
  uninstall: args.includes('--uninstall'),
  force: args.includes('--force'),
  withPlugins: args.includes('--with-plugins'),
  help: args.includes('--help') || args.includes('-h'),
};
```

- [ ] **Step 2: Add require for plugins module**

At the top of the file, after line 12 (`const uninstaller = ...`), add:

```javascript
const plugins = require('../lib/plugins.js');
```

- [ ] **Step 3: Add --with-plugins validation**

Before the `// Main` section (before line 174), add validation:

```javascript
// Validate flag combinations
if (flags.withPlugins && !flags.init) {
  output.error('--with-plugins requires --init');
  process.exit(1);
}
```

- [ ] **Step 4: Add plugin install phase to doInit**

In the `doInit` function, after the install/update output but before the "Done! Next steps" messages, add the plugin install call. Modify the fresh install branch (after line 86: `installer.install(...)`) and the update branch (after line 108: `updater.update(...)`).

For the **fresh install branch** (state === 'none' || state === 'corrupted'), replace lines 87-96 with:

```javascript
    installer.install(targetDir, TEMPLATE_DIR, VERSION);

    // Plugin install phase (opt-in)
    if (flags.withPlugins) {
      const mf = manifest.readManifest(targetDir) || { plugins: {} };
      const results = plugins.installRecommended(mf, flags.force);
      // Update manifest with plugin state
      for (const p of results.installed) {
        manifest.addPluginToManifest(mf, p.name, p.source, p.tier, 'installed');
      }
      for (const f of results.failed) {
        manifest.addPluginToManifest(mf, f.plugin.name, f.plugin.source, f.plugin.tier, 'failed', f.error);
      }
      if (results.installed.length > 0 || results.failed.length > 0) {
        manifest.writeManifest(targetDir, mf);
      }
    }

    output.blank();
    output.info('Done! Next steps:');
    output.blank();
    output.info('  1. Set NOTION_API_KEY in your environment');
    output.info('  2. Run `gws auth login` for Gmail/Calendar/Drive');
    output.info('  3. Open Claude Code and try:');
    output.info('     /inbox triage    \u2014 Process your inbox');
    output.info('     /briefing        \u2014 Get your daily briefing');
    output.info('     /prep            \u2014 Prepare for meetings');
    output.blank();
```

For the **update branch** (else clause), replace lines 108-111 with:

```javascript
    updater.update(targetDir, TEMPLATE_DIR, VERSION, flags.force);

    // Plugin install phase (opt-in)
    if (flags.withPlugins) {
      const mf = manifest.readManifest(targetDir) || { plugins: {} };
      const results = plugins.installRecommended(mf, flags.force);
      for (const p of results.installed) {
        manifest.addPluginToManifest(mf, p.name, p.source, p.tier, 'installed');
      }
      for (const f of results.failed) {
        manifest.addPluginToManifest(mf, f.plugin.name, f.plugin.source, f.plugin.tier, 'failed', f.error);
      }
      if (results.installed.length > 0 || results.failed.length > 0) {
        manifest.writeManifest(targetDir, mf);
      }
    }

    output.blank();
    output.info('Done! See CHANGELOG for what\'s new.');
    output.blank();
```

- [ ] **Step 5: Update help text**

In `showHelp()`, add the `--with-plugins` line after `--init`:

```javascript
function showHelp() {
  console.log(`
  founder-os v${VERSION}

  Usage: npx founder-os@latest --init

  Options:
    --init            Install or update Founder OS
    --with-plugins    Also install recommended Claude Code plugins (requires --init)
    --version         Show version info
    --status          Show installation status
    --uninstall       Remove Founder OS files
    --force           Overwrite modified files (creates .bak backups)
    --help            Show this help
`);
}
```

- [ ] **Step 6: Verify the CLI loads without errors**

```bash
cd founder-os-dist
node bin/founder-os.js --help
```

Expected: Help text shows `--with-plugins` option.

- [ ] **Step 7: Verify --with-plugins without --init fails**

```bash
cd founder-os-dist
node bin/founder-os.js --with-plugins 2>&1
```

Expected: `Error: --with-plugins requires --init`

- [ ] **Step 8: Commit**

```bash
cd founder-os-dist
git add bin/founder-os.js
git commit -m "feat: add --with-plugins flag to CLI for marketplace plugin install"
```

---

### Task 1.4: Update Uninstaller to Strip Plugins from Manifest

**Files:**
- Modify: `founder-os-dist/lib/uninstaller.js`

> The spec states: `--uninstall` does NOT remove plugins (they're managed by `claude` CLI). It only strips the `plugins` key from the manifest before the manifest/`.founderOS/` directory is removed. Since the uninstaller already deletes `.founderOS/` entirely (line 68-71), the plugins key is removed with it. No code change needed — the existing behavior already satisfies the spec.

- [ ] **Step 1: Verify uninstaller already removes .founderOS/ (which contains manifest)**

```bash
cd founder-os-dist
grep -n 'rmSync.*founderOS' lib/uninstaller.js
```

Expected: Line showing `fs.rmSync(founderOsDir, { recursive: true })` — confirms manifest (including any `plugins` key) is deleted with the directory.

- [ ] **Step 2: Add a comment for clarity**

In `lib/uninstaller.js`, before the `// Remove .founderOS/ directory` comment (line 67), add:

```javascript
  // Note: plugins installed via --with-plugins are NOT removed here.
  // They are managed by the `claude` CLI. The plugins manifest state is
  // deleted with .founderOS/ below.
```

- [ ] **Step 3: Commit**

```bash
cd founder-os-dist
git add lib/uninstaller.js
git commit -m "docs: clarify plugin uninstall behavior in uninstaller"
```

---

## Chunk 2: Integration Tests

**Wave:** 2 (depends on Chunk 1)
**Subagent count:** 1
**Estimated steps:** ~15

### Task 2.1: Create Plugin Integration Test

**Files:**
- Create: `founder-os-dist/tests/test-with-plugins.sh`

- [ ] **Step 1: Create the test script**

```bash
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
  if echo "$actual" | grep -q "$expected"; then
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
```

- [ ] **Step 2: Make test executable**

```bash
chmod +x founder-os-dist/tests/test-with-plugins.sh
```

- [ ] **Step 3: Run tests**

```bash
cd founder-os-dist
bash tests/test-with-plugins.sh
```

Expected: All tests pass (6 passed, 0 failed). Note: These tests verify structure and flag handling. Actual plugin install is not tested because it requires `claude` CLI with marketplace access — that's an integration test run manually.

- [ ] **Step 4: Commit**

```bash
cd founder-os-dist
git add tests/test-with-plugins.sh
git commit -m "test: add integration tests for --with-plugins flag"
```

---

## Post-Implementation Checklist

- [ ] All tests pass: `bash tests/test-with-plugins.sh`
- [ ] `node bin/founder-os.js --help` shows `--with-plugins`
- [ ] `node bin/founder-os.js --with-plugins` errors correctly (requires --init)
- [ ] Existing `--init` behavior unchanged (no plugin install without flag)
- [ ] `lib/plugins.js` exports 9 plugins (5 tier-1, 4 tier-2)
- [ ] Manifest module creates `plugins: {}` in new manifests
- [ ] No new npm dependencies added
