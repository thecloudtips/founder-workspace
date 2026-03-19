# Founder OS Single Plugin Restructure — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure 33 separate plugins into a single Claude Code plugin with proper command/skill/agent discovery via nested directory namespacing.

**Architecture:** Move all command/skill/agent files from `founder-os-*/` directories into unified `commands/`, `skills/`, `agents/` directories at repo root. Create a single `.claude-plugin/plugin.json` manifest. Update install.sh to remove symlink logic. Clean up old plugin directories.

**Tech Stack:** Bash (migration scripts), Markdown (command/skill/agent files), JSON (manifest, MCP config).

**Spec:** `docs/superpowers/specs/[5]-2026-03-11-single-plugin-restructure-design.md`

---

## Chunk 0: Create New Structure and Plugin Manifest

### Task 0: Create plugin manifest and directory skeleton

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `commands/` (32 namespace subdirectories)
- Create: `skills/` (32 namespace subdirectories)
- Create: `agents/` (7 namespace subdirectories — only plugins with teams)

- [ ] **Step 1: Create `.claude-plugin/plugin.json`**

```json
{
  "name": "founder-os",
  "version": "1.0.0",
  "description": "32-plugin AI automation ecosystem for SMB founders. Email triage, meeting prep, report generation, CRM sync, and 28 more tools — all powered by Claude Code.",
  "platform": "claude-code",
  "author": {
    "name": "Founder OS",
    "email": "contact@founderos.dev"
  }
}
```

- [ ] **Step 2: Create command namespace directories**

```bash
mkdir -p commands/{setup,inbox,briefing,prep,actions,review,followup,meeting,newsletter,report,health,invoice,proposal,contract,sow,compete,expense,notion,drive,slack,client,crm,morning,kb,linkedin,savings,prompt,workflow,workflow-doc,learn,goal,memory,intel}
```

- [ ] **Step 3: Create skill namespace directories**

```bash
mkdir -p skills/{setup,inbox,briefing,prep,actions,review,followup,meeting,newsletter,report,health,invoice,proposal,contract,sow,compete,expense,notion,drive,slack,client,crm,morning,kb,linkedin,savings,prompt,workflow,workflow-doc,learn,goal,memory,intel,infrastructure}
```

- [ ] **Step 4: Create agent namespace directories**

Only 7 plugins have agent teams:

```bash
mkdir -p agents/{inbox,briefing,prep,client,invoice,report,sow}
```

- [ ] **Step 5: Commit**

```bash
git add .claude-plugin/plugin.json commands/ skills/ agents/
git commit -m "feat: create single plugin manifest and directory skeleton"
```

---

## Chunk 1: Migrate Commands

### Task 1: Migrate all 94 command files

**Files:**
- Move: All `founder-os-*/commands/*.md` → `commands/<namespace>/<action>.md`

The migration renames each file to strip the namespace prefix. For example:
- `founder-os-inbox-zero/commands/inbox-triage.md` → `commands/inbox/triage.md`
- `founder-os-report-generator/commands/report-generate.md` → `commands/report/generate.md`

- [ ] **Step 1: Run the migration script**

Execute the following to move and rename all command files:

```bash
# Namespace mapping: plugin-dir-suffix → namespace
declare -A NS_MAP=(
  [inbox-zero]=inbox
  [daily-briefing-generator]=briefing
  [meeting-prep-autopilot]=prep
  [action-item-extractor]=actions
  [weekly-review-compiler]=review
  [follow-up-tracker]=followup
  [meeting-intelligence-hub]=meeting
  [newsletter-draft-engine]=newsletter
  [report-generator]=report
  [client-health-dashboard]=health
  [invoice-processor]=invoice
  [proposal-automator]=proposal
  [contract-analyzer]=contract
  [sow-generator]=sow
  [competitive-intel-compiler]=compete
  [expense-report-builder]=expense
  [notion-command-center]=notion
  [google-drive-brain]=drive
  [slack-digest-engine]=slack
  [client-context-loader]=client
  [crm-sync-hub]=crm
  [multi-tool-morning-sync]=morning
  [knowledge-base-qa]=kb
  [linkedin-post-generator]=linkedin
  [time-savings-calculator]=savings
  [team-prompt-library]=prompt
  [workflow-automator]=workflow
  [workflow-documenter]=workflow-doc
  [learning-log-tracker]=learn
  [goal-progress-tracker]=goal
  [memory-hub]=memory
  [adaptive-intel]=intel
  [setup]=setup
)

# Command prefix mapping: namespace → prefix to strip from filenames
declare -A PREFIX_MAP=(
  [inbox]=inbox-
  [briefing]=daily-
  [prep]=prep-
  [actions]=actions-
  [review]=review
  [followup]=followup-
  [meeting]=meeting-
  [newsletter]=newsletter-
  [report]=report-
  [health]=health-
  [invoice]=invoice-
  [proposal]=proposal-
  [contract]=contract-
  [sow]=sow-
  [compete]=compete-
  [expense]=expense-
  [notion]=notion-
  [drive]=drive-
  [slack]=slack-
  [client]=client-
  [crm]=crm-
  [morning]=morning-
  [kb]=kb-
  [linkedin]=linkedin-
  [savings]=savings-
  [prompt]=prompt-
  [workflow]=workflow-
  [workflow-doc]=workflow-
  [learn]=learn-
  [goal]=goal-
  [memory]=memory-
  [intel]=intel-
  [setup]=setup-
)

for plugin_dir in founder-os-*/; do
  plugin_suffix=$(echo "$plugin_dir" | sed 's|founder-os-\(.*\)/|\1|')
  ns="${NS_MAP[$plugin_suffix]}"
  if [ -z "$ns" ]; then
    echo "WARN: No namespace for $plugin_suffix, skipping"
    continue
  fi
  prefix="${PREFIX_MAP[$ns]}"

  if [ -d "$plugin_dir/commands" ]; then
    for cmd_file in "$plugin_dir"/commands/*.md; do
      [ -f "$cmd_file" ] || continue
      filename=$(basename "$cmd_file")
      # Strip prefix from filename
      new_name="${filename#$prefix}"
      # Handle special cases where prefix doesn't match
      if [ "$new_name" = "$filename" ]; then
        # Try alternate: just use the filename with the known prefix stripped
        new_name=$(echo "$filename" | sed "s/^${prefix}//")
      fi
      # Special case: P05 weekly-review has just "review.md" → "weekly.md"
      # Special case: P08 has "newsletter.md" with no prefix
      cp "$cmd_file" "commands/$ns/$new_name"
      echo "  $cmd_file → commands/$ns/$new_name"
    done
  fi
done
```

- [ ] **Step 2: Verify all 94 commands were migrated**

```bash
find commands -name "*.md" | wc -l
# Expected: 94
```

List all migrated commands and verify the naming looks correct:

```bash
find commands -name "*.md" | sort
```

Review for any files that still have a redundant namespace prefix in their name (e.g., `commands/inbox/inbox-triage.md` instead of `commands/inbox/triage.md`). Fix any that slipped through.

- [ ] **Step 3: Verify command file content is intact**

Spot-check 5 commands by diffing against originals:

```bash
diff founder-os-inbox-zero/commands/inbox-triage.md commands/inbox/triage.md
diff founder-os-report-generator/commands/report-generate.md commands/report/generate.md
diff founder-os-setup/commands/setup-notion-hq.md commands/setup/notion-hq.md
diff founder-os-goal-progress-tracker/commands/goal-create.md commands/goal/create.md
diff founder-os-workflow-automator/commands/workflow-run.md commands/workflow/run.md
```

Expected: Identical content for all.

- [ ] **Step 4: Commit**

```bash
git add commands/
git commit -m "feat: migrate 94 commands into unified namespace directories"
```

---

## Chunk 2: Migrate Skills

### Task 2: Migrate all 77 skill directories

**Files:**
- Move: All `founder-os-*/skills/*/SKILL.md` → `skills/<namespace>/*/SKILL.md`

Skills keep their directory names (e.g., `email-triage/SKILL.md` stays as `email-triage/SKILL.md`), just moved under the namespace grouping.

- [ ] **Step 1: Run the migration script**

Uses the same NS_MAP from Task 1:

```bash
declare -A NS_MAP=(
  [inbox-zero]=inbox
  [daily-briefing-generator]=briefing
  [meeting-prep-autopilot]=prep
  [action-item-extractor]=actions
  [weekly-review-compiler]=review
  [follow-up-tracker]=followup
  [meeting-intelligence-hub]=meeting
  [newsletter-draft-engine]=newsletter
  [report-generator]=report
  [client-health-dashboard]=health
  [invoice-processor]=invoice
  [proposal-automator]=proposal
  [contract-analyzer]=contract
  [sow-generator]=sow
  [competitive-intel-compiler]=compete
  [expense-report-builder]=expense
  [notion-command-center]=notion
  [google-drive-brain]=drive
  [slack-digest-engine]=slack
  [client-context-loader]=client
  [crm-sync-hub]=crm
  [multi-tool-morning-sync]=morning
  [knowledge-base-qa]=kb
  [linkedin-post-generator]=linkedin
  [time-savings-calculator]=savings
  [team-prompt-library]=prompt
  [workflow-automator]=workflow
  [workflow-documenter]=workflow-doc
  [learning-log-tracker]=learn
  [goal-progress-tracker]=goal
  [memory-hub]=memory
  [adaptive-intel]=intel
  [setup]=setup
)

for plugin_dir in founder-os-*/; do
  plugin_suffix=$(echo "$plugin_dir" | sed 's|founder-os-\(.*\)/|\1|')
  ns="${NS_MAP[$plugin_suffix]}"
  [ -z "$ns" ] && continue

  if [ -d "$plugin_dir/skills" ]; then
    for skill_dir in "$plugin_dir"/skills/*/; do
      [ -d "$skill_dir" ] || continue
      skill_name=$(basename "$skill_dir")
      # Copy entire skill directory (SKILL.md + any supporting files)
      cp -r "$skill_dir" "skills/$ns/$skill_name"
      echo "  $skill_dir → skills/$ns/$skill_name"
    done
  fi
done
```

- [ ] **Step 2: Migrate infrastructure shared skills**

```bash
# Memory skills
for skill_dir in _infrastructure/memory/skills/*/; do
  [ -d "$skill_dir" ] || continue
  skill_name=$(basename "$skill_dir")
  cp -r "$skill_dir" "skills/infrastructure/$skill_name"
  echo "  $skill_dir → skills/infrastructure/$skill_name"
done

# Intelligence hooks skill
if [ -d "_infrastructure/intelligence/hooks" ] && [ -f "_infrastructure/intelligence/hooks/SKILL.md" ]; then
  mkdir -p "skills/infrastructure/intelligence-hooks"
  cp _infrastructure/intelligence/hooks/SKILL.md "skills/infrastructure/intelligence-hooks/SKILL.md"
  echo "  intelligence hooks → skills/infrastructure/intelligence-hooks"
fi

# Intelligence master skill
if [ -f "_infrastructure/intelligence/SKILL.md" ]; then
  mkdir -p "skills/infrastructure/intelligence"
  cp _infrastructure/intelligence/SKILL.md "skills/infrastructure/intelligence/SKILL.md"
  echo "  intelligence master → skills/infrastructure/intelligence"
fi
```

- [ ] **Step 3: Verify all skills were migrated**

```bash
find skills -name "SKILL.md" | wc -l
# Expected: ~80 (77 plugin skills + infrastructure skills)
```

- [ ] **Step 4: Commit**

```bash
git add skills/
git commit -m "feat: migrate 77+ skills into namespace-grouped directories"
```

---

## Chunk 3: Migrate Agents

### Task 3: Migrate all 7 agent teams

**Files:**
- Move: All `founder-os-*/teams/` → `agents/<namespace>/`

Agent teams have a `config.json` and agent definition markdown files.

- [ ] **Step 1: Run the migration**

```bash
declare -A AGENT_NS_MAP=(
  [inbox-zero]=inbox
  [daily-briefing-generator]=briefing
  [meeting-prep-autopilot]=prep
  [client-context-loader]=client
  [invoice-processor]=invoice
  [report-generator]=report
  [sow-generator]=sow
)

for plugin_dir in founder-os-*/; do
  plugin_suffix=$(echo "$plugin_dir" | sed 's|founder-os-\(.*\)/|\1|')
  ns="${AGENT_NS_MAP[$plugin_suffix]}"
  [ -z "$ns" ] && continue

  if [ -d "$plugin_dir/teams" ]; then
    # Copy config.json
    [ -f "$plugin_dir/teams/config.json" ] && cp "$plugin_dir/teams/config.json" "agents/$ns/config.json"

    # Copy agent definitions
    if [ -d "$plugin_dir/teams/agents" ]; then
      for agent_file in "$plugin_dir"/teams/agents/*.md; do
        [ -f "$agent_file" ] || continue
        cp "$agent_file" "agents/$ns/$(basename "$agent_file")"
        echo "  $agent_file → agents/$ns/$(basename "$agent_file")"
      done
    fi
  fi
done
```

- [ ] **Step 2: Verify all agents were migrated**

```bash
find agents -name "*.md" | wc -l
# Expected: 36

find agents -name "config.json" | wc -l
# Expected: 7
```

- [ ] **Step 3: Commit**

```bash
git add agents/
git commit -m "feat: migrate 7 agent teams (36 agents) into namespace directories"
```

---

## Chunk 4: Update Command File References

### Task 4: Update `${CLAUDE_PLUGIN_ROOT}` and skill references in command files

**Files:**
- Modify: All `commands/**/*.md` files

Command markdown files reference skills, agents, and infrastructure paths using `${CLAUDE_PLUGIN_ROOT}`. These need to be updated to reflect the new structure.

- [ ] **Step 1: Find all files with CLAUDE_PLUGIN_ROOT references**

```bash
grep -rl 'CLAUDE_PLUGIN_ROOT' commands/ | sort
```

- [ ] **Step 2: Update CLAUDE_PLUGIN_ROOT references**

In the old structure, `${CLAUDE_PLUGIN_ROOT}` pointed to the individual plugin directory (e.g., `founder-os-inbox-zero/`). In the new structure, it points to the repo root.

Old paths like:
- `${CLAUDE_PLUGIN_ROOT}/skills/email-triage/SKILL.md`

Become:
- `${CLAUDE_PLUGIN_ROOT}/skills/inbox/email-triage/SKILL.md`

Run a targeted find-and-replace for each namespace. Read each command file, understand its skill references, and update the paths. The pattern is:

Old: `${CLAUDE_PLUGIN_ROOT}/skills/<skill-name>/`
New: `${CLAUDE_PLUGIN_ROOT}/skills/<namespace>/<skill-name>/`

Old: `${CLAUDE_PLUGIN_ROOT}/teams/agents/<agent-name>.md`
New: `${CLAUDE_PLUGIN_ROOT}/agents/<namespace>/<agent-name>.md`

Old: `${CLAUDE_PLUGIN_ROOT}/templates/<file>`
New: May need to move templates or update paths — check each case.

- [ ] **Step 3: Update any references to other command files**

Some commands reference other commands (e.g., "See `/inbox:triage` for details"). Update to use new naming: `/founder-os:inbox:triage`.

```bash
grep -rn '/[a-z]*:[a-z]' commands/ | grep -v 'founder-os:' | head -20
```

Review and update any old-style command references.

- [ ] **Step 4: Verify no broken references remain**

```bash
# Check for any remaining old-style plugin root references
grep -rn 'founder-os-[a-z]' commands/ | head -20
# Expected: 0 results (no references to old plugin dirs)
```

- [ ] **Step 5: Commit**

```bash
git add commands/
git commit -m "fix: update skill/agent path references in migrated commands"
```

---

### Task 5: Update skill file references

**Files:**
- Modify: All `skills/**/*.md` files with cross-references

- [ ] **Step 1: Find skills with CLAUDE_PLUGIN_ROOT or cross-references**

```bash
grep -rl 'CLAUDE_PLUGIN_ROOT\|founder-os-' skills/ | sort
```

- [ ] **Step 2: Update paths in skill files**

Same pattern as Task 4: update `${CLAUDE_PLUGIN_ROOT}/skills/` to include the namespace prefix, and update `${CLAUDE_PLUGIN_ROOT}/teams/` to `${CLAUDE_PLUGIN_ROOT}/agents/`.

- [ ] **Step 3: Commit**

```bash
git add skills/
git commit -m "fix: update cross-references in migrated skill files"
```

---

## Chunk 5: Update Install Script and Configuration

### Task 6: Update install.sh

**Files:**
- Modify: `install.sh`

Remove the symlink phase (Phase 4 plugin installation) and simplify verification.

- [ ] **Step 1: Read current install.sh**

Read the full file to understand the current structure.

- [ ] **Step 2: Remove symlink logic from Phase 4**

Replace the current Phase 4 (plugin symlinks + P01 .mcp.json fix + MCP merge) with just the MCP config merge:

```bash
# ── Phase 4: Configure MCP ──────────────────────────────────────
if ! $VERIFY_ONLY; then
  header "Phase 4: Configuring MCP servers..."

  # Merge Notion + Filesystem into project-level .mcp.json
  info "Updating project .mcp.json..."
  if command -v python3 &>/dev/null; then
    python3 -c "
import json, os

mcp_path = '$SCRIPT_DIR/.mcp.json'

# Read existing config
config = {'mcpServers': {}}
if os.path.exists(mcp_path):
    with open(mcp_path, 'r') as f:
        config = json.load(f)

servers = config.setdefault('mcpServers', {})

# Add Notion if not present
if 'notion' not in servers:
    servers['notion'] = {
        'command': 'npx',
        'args': ['-y', '@modelcontextprotocol/server-notion'],
        'env': {
            'NOTION_API_KEY': '\${NOTION_API_KEY}'
        }
    }

# Add Filesystem if not present
if 'filesystem' not in servers:
    servers['filesystem'] = {
        'command': 'npx',
        'args': ['-y', '@modelcontextprotocol/server-filesystem', '\${WORKSPACE_DIR}'],
        'env': {}
    }

with open(mcp_path, 'w') as f:
    json.dump(config, f, indent=2)
    f.write('\n')

print('done')
" "$SCRIPT_DIR" && ok "MCP config: notion + filesystem configured" \
  || { fail "Could not update .mcp.json"; exit 1; }
  else
    fail "python3 is required for .mcp.json configuration"
    exit 1
  fi

  ok "MCP configuration complete"
fi
```

- [ ] **Step 3: Remove symlink check from Phase 6 verification**

Replace the plugin symlinks check with a command directory check:

```bash
# 3. Plugin commands
TOTAL=$((TOTAL + 1))
CMD_COUNT=$(find "$SCRIPT_DIR/commands" -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
if [ "$CMD_COUNT" -ge 90 ]; then
  ok "Commands: $CMD_COUNT found"
  PASS=$((PASS + 1))
elif [ "$CMD_COUNT" -gt 0 ]; then
  warn "Commands: only $CMD_COUNT found (expected 94+)"
else
  fail "Commands: no command files found in commands/"
fi
```

- [ ] **Step 4: Update --reset flag**

Remove symlink removal (no symlinks anymore). Keep MCP cleanup:

```bash
if $RESET; then
  header "Resetting Founder OS configuration..."

  # Remove installer-generated MCP entries from .mcp.json
  if [ -f "$SCRIPT_DIR/.mcp.json" ] && command -v python3 &>/dev/null; then
    python3 -c "
import json, sys
try:
    with open(sys.argv[1], 'r') as f:
        config = json.load(f)
    for key in ['notion', 'filesystem']:
        config.get('mcpServers', {}).pop(key, None)
    with open(sys.argv[1], 'w') as f:
        json.dump(config, f, indent=2)
        f.write('\n')
    print('Removed notion and filesystem entries from .mcp.json')
except Exception as e:
    print(f'Warning: could not update .mcp.json: {e}', file=sys.stderr)
" "$SCRIPT_DIR/.mcp.json" && ok "Cleaned .mcp.json" || warn "Could not clean .mcp.json"
  fi

  ok "Reset complete. Run ./install.sh to reconfigure."
  exit 0
fi
```

- [ ] **Step 5: Remove PLUGINS_DIR variable**

Remove the line `PLUGINS_DIR="$SCRIPT_DIR/.claude/plugins"` from the header since it's no longer used.

- [ ] **Step 6: Verify syntax**

```bash
bash -n install.sh
```

- [ ] **Step 7: Test --help flag**

```bash
./install.sh --help
```

- [ ] **Step 8: Commit**

```bash
git add install.sh
git commit -m "refactor: simplify install.sh — remove symlink phase, verify commands directly"
```

---

### Task 7: Update root .mcp.json

**Files:**
- Modify: `.mcp.json` (if it exists) or ensure install.sh creates it

The repo root `.mcp.json` should be the single source for MCP server config. Previously each plugin had its own `.mcp.json`.

- [ ] **Step 1: Create or update `.mcp.json` at repo root**

If `.mcp.json` doesn't exist, the install script creates it. But we should also have a working `.mcp.json` checked in so the plugin works even without running the installer (for dev use):

Check if `.mcp.json` exists and has the right entries. If not, the `.mcp.json.example` serves as reference. The installer handles runtime creation.

- [ ] **Step 2: Commit if changed**

```bash
git add .mcp.json 2>/dev/null
git diff --cached --quiet || git commit -m "feat: consolidate MCP config at repo root"
```

---

## Chunk 6: Update Release Script and Documentation

### Task 8: Update release script

**Files:**
- Modify: `scripts/release.sh`

The release script no longer needs to sync individual plugin directories. It syncs the unified structure.

- [ ] **Step 1: Update release.sh**

Replace the plugin sync loop with direct directory syncing:

```bash
# Sync plugin structure (commands, skills, agents)
echo "Syncing plugin structure..."
for dir in commands skills agents .claude-plugin; do
  rsync -a --delete "$DEV_ROOT/$dir/" "$DIST_DIR/$dir/"
done

# Sync infrastructure
echo "Syncing infrastructure..."
rsync -a --delete \
  --exclude='deprecated/' \
  "$DEV_ROOT/_infrastructure/" "$DIST_DIR/_infrastructure/"
```

Remove the old `founder-os-*` syncing loop.

- [ ] **Step 2: Verify syntax**

```bash
bash -n scripts/release.sh
```

- [ ] **Step 3: Commit**

```bash
git add scripts/release.sh
git commit -m "refactor: update release script for single-plugin structure"
```

---

### Task 9: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

Update the project documentation to reflect the new single-plugin architecture.

- [ ] **Step 1: Update Architecture section**

Replace the "Plugin Format" section. The repo IS the plugin now:

```markdown
### Plugin Architecture

The repository is a single Claude Code plugin. Commands, skills, and agents are organized by namespace:

- `commands/<namespace>/<action>.md` → `/founder-os:<namespace>:<action>`
- `skills/<namespace>/<skill-name>/SKILL.md` → domain knowledge
- `agents/<namespace>/config.json` + `<agent>.md` → agent teams
```

- [ ] **Step 2: Update the Plugin Quick Reference table**

Update to show the new command format:

| # | Namespace | Commands | Skills | Agents |
|---|-----------|----------|--------|--------|
| 00 | `setup` | notion-hq, verify | 1 | — |
| 01 | `inbox` | triage, drafts-approved | 5 | 4 |
... etc.

- [ ] **Step 3: Remove references to per-plugin structure**

Remove:
- Plugin folder convention (`founder-os-[kebab-case-name]/`)
- Per-plugin `.claude-plugin/plugin.json` format
- Per-plugin `.mcp.json`
- Known Gotcha about P01 missing `.mcp.json`
- Plugin symlink references

- [ ] **Step 4: Update conventions section**

Update command convention from `/namespace:action` to `/founder-os:namespace:action`.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md for single-plugin architecture"
```

---

### Task 10: Update user-facing CLAUDE.md generator

**Files:**
- Modify: `scripts/generate-user-claude-md.sh`

Update the generated CLAUDE.md to reflect the new structure.

- [ ] **Step 1: Update the generator**

Read the current generator, update all references to the new single-plugin structure. Key changes:
- Plugin format section → single plugin architecture
- Command naming → `/founder-os:namespace:action`
- Remove per-plugin directory references
- Update quick reference table format

- [ ] **Step 2: Verify syntax and output**

```bash
bash -n scripts/generate-user-claude-md.sh
bash scripts/generate-user-claude-md.sh | grep -i "founder-os-" | head -5
# Expected: 0 results (no old plugin dir references)
```

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-user-claude-md.sh
git commit -m "docs: update CLAUDE.md generator for single-plugin structure"
```

---

### Task 11: Update getting-started docs

**Files:**
- Modify: `docs/getting-started/SETUP-GUIDE.md`
- Modify: `docs/getting-started/FAQ.md`
- Modify: `docs/getting-started/TROUBLESHOOTING.md`

- [ ] **Step 1: Update SETUP-GUIDE.md**

- Phase 4 description: "Configures MCP servers" (not "Symlinks 32 plugins")
- First commands to try: Use `/founder-os:inbox:triage` format
- Remove any symlink references

- [ ] **Step 2: Update FAQ.md**

- "How do I disable a specific plugin?" → No longer relevant (can't disable individual namespaces via symlinks). Update to explain that all commands are available and unused ones have zero overhead.
- Update command examples to new format.

- [ ] **Step 3: Update TROUBLESHOOTING.md**

- Remove "Plugins not showing in Claude Code" symlink troubleshooting
- Remove "Broken symlinks after moving" entry
- Update "MCP server connection failed" to reference root `.mcp.json`
- Add: "Commands not recognized" → verify `.claude-plugin/plugin.json` exists

- [ ] **Step 4: Commit**

```bash
git add docs/getting-started/
git commit -m "docs: update getting-started docs for single-plugin structure"
```

---

## Chunk 7: Cleanup

### Task 12: Remove old plugin directories

**Files:**
- Delete: All 33 `founder-os-*/` directories

- [ ] **Step 1: Verify all content has been migrated**

Run a final check that nothing is being lost:

```bash
# Commands
OLD_CMD=$(find founder-os-*/commands -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
NEW_CMD=$(find commands -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
echo "Commands: $OLD_CMD old → $NEW_CMD new"

# Skills
OLD_SKILL=$(find founder-os-*/skills -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
NEW_SKILL=$(find skills -name "SKILL.md" 2>/dev/null | wc -l | tr -d ' ')
echo "Skills: $OLD_SKILL old → $NEW_SKILL new"

# Agents
OLD_AGENT=$(find founder-os-*/teams/agents -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
NEW_AGENT=$(find agents -name "*.md" 2>/dev/null | wc -l | tr -d ' ')
echo "Agents: $OLD_AGENT old → $NEW_AGENT new"
```

Expected: New counts >= Old counts for all three.

- [ ] **Step 2: Remove old plugin directories**

```bash
rm -rf founder-os-*/
```

- [ ] **Step 3: Remove .claude/plugins/ directory if it exists**

```bash
rm -rf .claude/plugins/
```

- [ ] **Step 4: Clean up .gitignore**

Remove the `.claude/plugins/` entry from `.gitignore` since it's no longer used. Keep all other entries.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "refactor: remove 33 old plugin directories — single plugin structure complete

Migrated all content:
- 94 commands → commands/<namespace>/<action>.md
- 77+ skills → skills/<namespace>/<skill>/SKILL.md
- 36 agents → agents/<namespace>/<agent>.md
- 7 team configs → agents/<namespace>/config.json"
```

---

## Chunk 8: Final Verification

### Task 13: Verify the complete restructure

- [ ] **Step 1: Verify file counts**

```bash
echo "Commands: $(find commands -name '*.md' | wc -l)"
echo "Skills: $(find skills -name 'SKILL.md' | wc -l)"
echo "Agents: $(find agents -name '*.md' | wc -l)"
echo "Agent configs: $(find agents -name 'config.json' | wc -l)"
echo "Plugin manifest: $(ls .claude-plugin/plugin.json 2>/dev/null && echo 'exists' || echo 'MISSING')"
```

Expected: 94+ commands, 77+ skills, 36 agents, 7 configs, manifest exists.

- [ ] **Step 2: Verify no old plugin directories remain**

```bash
ls -d founder-os-*/ 2>/dev/null | wc -l
# Expected: 0
```

- [ ] **Step 3: Verify install.sh works**

```bash
bash -n install.sh
./install.sh --help
```

- [ ] **Step 4: Verify release script works**

```bash
bash -n scripts/release.sh
```

- [ ] **Step 5: Verify CLAUDE.md generator works**

```bash
bash -n scripts/generate-user-claude-md.sh
bash scripts/generate-user-claude-md.sh | head -5
```

- [ ] **Step 6: Test in dist repo**

```bash
rm -rf /tmp/founder-os-test
mkdir /tmp/founder-os-test && cd /tmp/founder-os-test && git init
cd <dev-repo>
./scripts/release.sh --dist-dir /tmp/founder-os-test
cd /tmp/founder-os-test
ls .claude-plugin/plugin.json  # Should exist
find commands -name "*.md" | wc -l  # Should be 94+
rm -rf /tmp/founder-os-test
```
