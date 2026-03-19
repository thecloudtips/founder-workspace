# Founder OS Memory Engine — Implementation Plan

> **Status: Complete** — all 18 tasks implemented and merged to main. Plan updated 2026-03-13 to reflect Notion CLI migration and single-plugin architecture consolidation.

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add cross-plugin shared memory with adaptive behavior to Founder OS — a local SQLite+HNSW store with context injection, pattern detection, Notion sync, and 4 user-facing commands.

**Architecture:** Infrastructure layer (`_infrastructure/memory/`) provides 3 shared skills consumed by all namespaces. Commands and skills (`commands/memory/`, `skills/memory/`) provide user-facing commands and Notion sync. Local SQLite+HNSW for fast runtime queries; `[FOS] Memory` Notion DB for visibility and user editing.

**Tech Stack:** SQLite (WAL mode), HNSW vector index (via claude-flow), Notion CLI (`scripts/notion-tool.mjs`), Anthropic plugin format (markdown commands/skills).

**Spec:** `docs/superpowers/specs/2026-03-11-memory-engine-design.md`

---

## Chunk 1: Infrastructure — Local Store & Core Memory Skill

### Task 1: Create SQLite schema for memory store

**Files:**
- Create: `_infrastructure/memory/schema/memory-store.sql`

- [x] **Step 1: Create directory structure**

```bash
mkdir -p _infrastructure/memory/schema
mkdir -p _infrastructure/memory/context-injection
mkdir -p _infrastructure/memory/pattern-detection
```

- [x] **Step 2: Write the SQLite schema**

Create `_infrastructure/memory/schema/memory-store.sql` with three tables:
- `memories` — core memory entries with key, category, content, confidence, status, company_id, embedding, usage counters, timestamps
- `observations` — raw pattern observations before they become memories
- `adaptations` — log of behavior changes applied by the system

Include pragmas: WAL journal mode, normal synchronous, foreign keys ON.

Categories enum: preference, pattern, fact, contact, workflow.
Status enum: candidate, confirmed, applied, dismissed.

Reference the full schema from the design spec `docs/superpowers/specs/2026-03-11-memory-engine-design.md` (Data Model section).

- [x] **Step 3: Commit**

```bash
git add _infrastructure/memory/schema/memory-store.sql
git commit -m "feat(memory): add SQLite schema for memory store"
```

---

### Task 2: Write core memory SKILL.md

**Files:**
- Create: `_infrastructure/memory/SKILL.md`

- [x] **Step 1: Write the core memory skill**

This skill defines how any plugin reads/writes/queries the local memory store. It must cover:

**Overview section:**
- Purpose: shared cross-plugin memory for Founder OS
- Store location: `.memory/memory.db` in project root (distinct from `.swarm/`)
- Auto-initialization: if DB doesn't exist, create it from `_infrastructure/memory/schema/memory-store.sql`

**Store a Memory section:**
- Function: `memory_store(key, category, content, source_plugin, company_id?, tags?, confidence?)`
- If key already exists: update content, increment times_confirmed, bump confidence +15 (cap 100), update updated_at
- If key is new: insert with default confidence=50 for explicit (user-taught), confidence=20 for auto-detected
- Generate embedding from content for HNSW indexing (use same approach as `.swarm/` — JSON array of floats)
- Validate category is one of: preference, pattern, fact, contact, workflow

**Retrieve Memories section:**
- `memory_query(text, limit=5)` — semantic search via HNSW, returns top N by cosine similarity, filtered to status IN (confirmed, applied)
- `memory_get(key)` — exact key lookup
- `memory_by_company(company_id, limit=10)` — all memories for a company
- `memory_by_plugin(plugin, limit=10)` — all memories created by a plugin
- All retrievals increment `access_count` and update `last_used_at`

**Delete a Memory section:**
- `memory_delete(key)` — remove memory and its embedding from HNSW
- Also check `adaptations` table — if this memory has an active adaptation, mark it reverted

**Confidence & Decay section:**
- Confidence range: 0-100
- Confirmation: +15 per repeated observation (cap 100)
- Decay: memories not used in 30 days lose 5 confidence per week
- Auto-expire: memories below confidence 10 are deleted
- Promotion thresholds: ≥60 → confirmed, ≥80 + 3 confirmations → applied

**Initialization section:**
- Check if `.memory/memory.db` exists
- If not: `mkdir -p .memory && sqlite3 .memory/memory.db < _infrastructure/memory/schema/memory-store.sql`
- If exists: verify schema version, run migrations if needed

Follow the same markdown skill format as `_infrastructure/gws-skills/gws-common/SKILL.md` — YAML frontmatter with name and description, then structured sections with code examples.

- [x] **Step 2: Commit**

```bash
git add _infrastructure/memory/SKILL.md
git commit -m "feat(memory): add core memory skill with store/query/delete API"
```

---

### Task 3: Write context injection skill

**Files:**
- Create: `_infrastructure/memory/context-injection/SKILL.md`

- [x] **Step 1: Write the context injection skill**

This skill is referenced by every plugin command at the START of execution. It automatically enriches the plugin's context with relevant memories.

**Overview section:**
- Purpose: inject relevant memories before plugin logic runs
- Trigger: called as "Step 0" in every plugin command
- Performance target: < 2 seconds added to plugin startup

**Execution Flow section:**

1. **Initialize store**: Read core memory skill at `_infrastructure/memory/SKILL.md`. Ensure `.memory/memory.db` exists.
2. **Extract entities from input**: Parse the current plugin's input for:
   - Company names or domains (e.g., "Acme Corp", "@acmecorp.com")
   - Contact names or emails
   - Topics or keywords
   - The plugin name itself (for plugin-specific preferences)
3. **Query memories**:
   - Semantic query: `memory_query(input_text_summary, limit=5)` — top 5 by relevance
   - Company query: if a company is identified, `memory_by_company(company_id, limit=3)`
   - Plugin query: `memory_by_plugin(current_plugin, limit=2)` — plugin-specific preferences
   - Deduplicate across all three queries
   - Filter: only `status IN (confirmed, applied)`
   - Cap at 5 total memories (prioritize by confidence DESC, then relevance)
4. **Format injection block**:
   ```
   ## Relevant Memories
   - [category] content (confidence: N)
   - [category] content (confidence: N)
   ...
   ```
5. **Inject**: Add the block to the plugin's working context
6. **Update usage**: Increment `times_used` and `last_used_at` for each injected memory

**When No Memories Found section:**
- If no relevant memories exist, skip injection silently (no empty block)
- This is the expected state for new installations

**Graceful Degradation section:**
- If `.memory/memory.db` doesn't exist or is corrupt: skip injection, log warning, continue plugin execution
- Memory injection must NEVER block or fail a plugin's primary function

- [x] **Step 2: Commit**

```bash
git add _infrastructure/memory/context-injection/SKILL.md
git commit -m "feat(memory): add context injection skill for pre-plugin memory enrichment"
```

---

### Task 4: Write pattern detection skill

**Files:**
- Create: `_infrastructure/memory/pattern-detection/SKILL.md`

- [x] **Step 1: Write the pattern detection skill**

This skill is referenced by every plugin command at the END of execution. It observes what happened and detects emerging patterns.

**Overview section:**
- Purpose: detect usage patterns and create/promote memories automatically
- Trigger: called as the final step in every plugin command
- Runs after plugin output is delivered to user (non-blocking conceptually)

**Observation Logging section:**
- After every plugin execution, log an observation:
  ```sql
  INSERT INTO observations (id, plugin, action, context, observed_at)
  VALUES (generated_id, 'P01', 'triage_email', '{"company":"Acme Corp","category":"action","priority":"high"}', timestamp)
  ```
- `action` = the primary action the plugin performed
- `context` = JSON with key details (company, input type, output type, user edits if any)

**Pattern Detection Rules section:**

Rule 1 — **Repeated categorization**: If the same plugin categorizes the same entity the same way 3+ times → create candidate memory
- Example: P01 categorizes @acmecorp.com as "action-required" 5 times → memory: "Emails from @acmecorp.com are typically action-required"

Rule 2 — **User override detection**: If the user edits or overrides a plugin's output → create preference candidate
- Example: User changes briefing format after P02 generates it → memory: "User prefers [detected format] for daily briefings"
- Detection: compare plugin output to final state (if available)

Rule 3 — **New entity discovery**: If a plugin encounters a new company, contact, or entity not in existing memories → create fact memory
- Example: P21 CRM Sync finds new contact sarah@newclient.com → memory: "Sarah (sarah@newclient.com) — new contact discovered by CRM Sync"
- Initial confidence: 30 (auto-detected fact)

Rule 4 — **Sequential plugin usage**: If the same sequence of plugins is run 3+ times → create workflow memory
- Example: User runs P01 → P06 → P10 three sessions in a row → memory: "Common workflow: Inbox Triage → Follow-Up Scan → Client Health"

Rule 5 — **Temporal patterns**: If a plugin is consistently run at the same time of day → create pattern memory
- Example: P02 Daily Briefing run at 8am 5 days in a row → memory: "Daily briefing typically generated at 8:00 AM"

**Confidence Promotion section:**

After logging the observation, check existing candidate memories:
1. Does this observation confirm an existing candidate? → increment confidence +15, increment times_confirmed
2. Promotion ladder:
   - confidence ≥ 60 AND status=candidate → promote to status=confirmed
   - confidence ≥ 80 AND times_confirmed ≥ 3 AND status=confirmed → promote to status=applied, trigger adaptation

**Adaptation Trigger section:**

When a memory reaches `applied` status:
1. Log the adaptation:
   ```sql
   INSERT INTO adaptations (id, memory_id, plugin, description, applied_at)
   VALUES (generated_id, memory_id, plugin, 'Now auto-flagging @acmecorp.com as VIP', timestamp)
   ```
2. Append notification to plugin output:
   ```
   > Memory adapted: I'm now [description] based on your last [N] sessions.
   > Run /memory:show to review, or /memory:forget "[key]" to revert.
   ```

**Decay Processing section:**

Run decay check once per day (on first plugin execution of the day):
1. Find memories where `last_used_at` < 30 days ago
2. Reduce confidence by 5 for each week of inactivity
3. Delete memories where confidence drops below 10
4. For deleted memories with active adaptations: mark adaptation as reverted

**Graceful Degradation section:**
- If `.memory/memory.db` doesn't exist or is corrupt: skip pattern detection silently
- Pattern detection must NEVER block or fail a plugin's primary function
- If observation logging fails, continue without error

- [x] **Step 2: Commit**

```bash
git add _infrastructure/memory/pattern-detection/SKILL.md
git commit -m "feat(memory): add pattern detection skill with confidence promotion and adaptation"
```

---

## Chunk 2: Memory Hub Plugin

### Task 5: Create command and skill structure

> **Note (2026-03-13):** Original plan referenced a standalone `founder-os-memory-hub/` plugin directory. The project consolidated into a single-plugin architecture before implementation. Memory commands live at `commands/memory/`, skills at `skills/memory/`. The plugin manifest is the root `.claude-plugin/plugin.json`.

**Files (as implemented):**
- `commands/memory/show.md`
- `commands/memory/teach.md`
- `commands/memory/forget.md`
- `commands/memory/sync.md`
- `skills/memory/notion-sync/SKILL.md`

- [x] **Step 1: Create directory structure**

```bash
mkdir -p commands/memory
mkdir -p skills/memory/notion-sync
```

- [x] **Step 2: Plugin manifest** — N/A (single-plugin manifest at `.claude-plugin/plugin.json`)

- [x] **Step 3: Prerequisites**

Prerequisites: Notion CLI configured (`$NOTION_API_KEY` set), Founder OS HQ workspace with `[FOS] Memory` database. Run `/founder-os:setup:notion-cli` if needed.

- [x] **Step 4-6: Commit**

```bash
git add commands/memory/ skills/memory/
git commit -m "feat(memory): add command and skill structure"
```

---

### Task 6: Write /memory:show command

**Files:**
- Create: `commands/memory/show.md`

- [x] **Step 1: Write the command**

YAML frontmatter:
```yaml
description: View what the system has learned — memories, patterns, and active adaptations
argument-hint: "[company|plugin|all] [--candidates] [--adaptations]"
allowed-tools: ["Read", "Bash"]
```

Command logic:
1. Parse arguments: optional filter (company name, plugin name, or "all"), optional flags --candidates, --adaptations
2. Read core memory skill at `_infrastructure/memory/SKILL.md`. Initialize store.
3. Query memories based on filter:
   - No filter or "all": `SELECT * FROM memories WHERE status IN ('confirmed','applied') ORDER BY confidence DESC, last_used_at DESC LIMIT 20`
   - Company filter: `memory_by_company(company_id)` — first search [FOS] Companies for the company page, then query by ID
   - Plugin filter: `memory_by_plugin(plugin_name)`
   - `--candidates`: include status='candidate' in results
   - `--adaptations`: `SELECT a.*, m.key, m.content FROM adaptations a JOIN memories m ON a.memory_id = m.id WHERE a.reverted_at IS NULL ORDER BY a.applied_at DESC`
4. Format output grouped by category:
   ```
   ## Memories (12 confirmed, 3 applied)

   ### Preferences
   - **briefing-format** (P02, confidence: 95, applied): Prefers bullet-point daily briefings with max 5 items
   - **email-tone-formal** (User, confidence: 100, confirmed): Use formal tone in email drafts for client communications

   ### Patterns
   - **acme-action-emails** (P01, confidence: 82, applied): Emails from @acmecorp.com are 90% action-required
   ...

   ### Active Adaptations
   - Auto-flagging @acmecorp.com emails as VIP (since Mar 10)
   - Using bullet-point format for daily briefings (since Mar 8)
   ```
5. Show count summary at bottom: "12 confirmed, 3 applied, 5 candidates pending"

- [x] **Step 2: Commit**

```bash
git add commands/memory/show.md
git commit -m "feat(memory): add /memory:show command"
```

---

### Task 7: Write /memory:teach command

**Files:**
- Create: `commands/memory/teach.md`

- [x] **Step 1: Write the command**

YAML frontmatter:
```yaml
description: Explicitly teach the system a fact, preference, or rule
argument-hint: '"Always flag emails from @bigclient.com as urgent" [--company "Acme Corp"] [--category preference]'
allowed-tools: ["Read", "Bash"]
```

Command logic:
1. Parse arguments: quoted statement (required), optional --company, optional --category (default: auto-detect)
2. Read core memory skill. Initialize store.
3. Auto-detect category from content if not specified:
   - Contains "always", "never", "prefer", "use", "format" → preference
   - Contains company name or "client" → fact (with company relation)
   - Contains person name + email/role → contact
   - Contains "after X run Y", "workflow" → workflow
   - Default: fact
4. Generate key from content (slugified summary, e.g., "acme-vip-flag")
5. Check for existing memory with similar key or content (fuzzy match via HNSW)
   - If similar exists: ask user "A similar memory exists: [content]. Update it or create new?"
6. Store memory with confidence=100 (explicit user teaching), status=confirmed, source_plugin="User"
7. If --company provided: search [FOS] Companies for the company, set company_id relation
8. Confirm: "Learned: [key] — [content] (confidence: 100, confirmed)"
9. Trigger Notion sync for this memory

- [x] **Step 2: Commit**

```bash
git add commands/memory/teach.md
git commit -m "feat(memory): add /memory:teach command"
```

---

### Task 8: Write /memory:forget command

**Files:**
- Create: `commands/memory/forget.md`

- [x] **Step 1: Write the command**

YAML frontmatter:
```yaml
description: Delete a memory and revert any behavior it triggered
argument-hint: '<key> [--force]'
allowed-tools: ["Read", "Bash"]
```

Command logic:
1. Parse arguments: key (required), optional --force (skip confirmation)
2. Read core memory skill. Initialize store.
3. Look up memory by key: `memory_get(key)`
   - If not found: try fuzzy search `memory_query(key, limit=3)` and suggest matches
   - "Memory 'acme-vip' not found. Did you mean: acme-vip-flag, acme-action-emails?"
4. Show the memory to user and confirm deletion (unless --force):
   ```
   Delete this memory?
   - Key: acme-vip-flag
   - Content: Always flag @acmecorp.com emails as VIP
   - Confidence: 95 (applied)
   - Active adaptation: Auto-flagging @acmecorp.com emails as VIP
   Confirm? (y/n)
   ```
5. On confirm: `memory_delete(key)` — removes from SQLite + HNSW, marks any adaptation as reverted
6. Sync deletion to Notion (archive the page in [FOS] Memory, don't hard-delete)
7. Confirm: "Forgotten: [key]. Adaptation reverted."

- [x] **Step 2: Commit**

```bash
git add commands/memory/forget.md
git commit -m "feat(memory): add /memory:forget command"
```

---

### Task 9: Write /memory:sync command

**Files:**
- Create: `commands/memory/sync.md`

- [x] **Step 1: Write the command**

YAML frontmatter:
```yaml
description: Force sync between local memory store and Notion [FOS] Memory database
argument-hint: "[--direction push|pull|both] [--dry-run]"
allowed-tools: ["Read", "Bash"]
```

Command logic:
1. Parse arguments: optional --direction (default: both), optional --dry-run
2. Read core memory skill + notion-sync skill. Initialize store.
3. **Push (local → Notion)**:
   - Find memories where `updated_at > last_synced_at` or never synced
   - For each: create or update page in [FOS] Memory DB
   - Map fields: key→Title, category→Select, content→Rich Text, confidence→Number, status→Select, source_plugin→Select, company_id→Relation, tags→Multi-select, times_used→Number, last_used_at→Date
   - For deleted memories: archive the corresponding Notion page
4. **Pull (Notion → local)**:
   - Fetch pages from [FOS] Memory DB modified since last sync
   - For each: update local SQLite record
   - If a Notion page was archived/deleted by user: delete from local store + revert adaptations
   - If user changed status in Notion (e.g., dismissed): update local status
   - Conflict resolution: Notion wins for status/content (user is source of truth), local wins for confidence/usage counters
5. Update `last_synced_at` on all processed records
6. Report:
   ```
   Sync complete:
   - Pushed: 5 new, 3 updated, 1 deleted
   - Pulled: 2 updated, 1 dismissed by user
   - Last sync: 2026-03-11 09:15:00
   ```
7. If --dry-run: show what would happen without executing

- [x] **Step 2: Commit**

```bash
git add commands/memory/sync.md
git commit -m "feat(memory): add /memory:sync command"
```

---

### Task 10: Write Notion sync skill

**Files:**
- Create: `skills/memory/notion-sync/SKILL.md`

- [x] **Step 1: Write the Notion sync skill**

This skill handles bidirectional sync between local SQLite and [FOS] Memory Notion DB.

Sections to cover:
- **DB Discovery**: Search "[FOS] Memory" first, then "Founder OS HQ - Memory", then lazy-create if neither found (with full schema from design spec)
- **DB Schema**: Document the Notion properties and their types (matching the design spec)
- **Push Logic**: Local → Notion field mapping, batch creation (up to 10 pages per API call), archive for deletions
- **Pull Logic**: Notion → local field mapping, conflict resolution rules (Notion wins status/content, local wins counters)
- **Sync Triggers**:
  - Auto-push: after any memory reaches `confirmed` or `applied` status (debounced, max 1 sync per 5 minutes)
  - Auto-pull: on plugin start if last sync > 1 hour ago
  - Manual: `/memory:sync` for immediate full sync
- **Rate Limit Handling**: Back off on 429, retry up to 3 times with exponential backoff

- [x] **Step 2: Commit**

```bash
git add skills/memory/notion-sync/SKILL.md
git commit -m "feat(memory): add Notion sync skill for bidirectional memory sync"
```

---

## Chunk 3: Notion HQ Integration

### Task 11: Create [FOS] Memory database template

**Files:**
- Create: `_infrastructure/notion-db-templates/hq-memory.json`
- Modify: `_infrastructure/notion-db-templates/founder-os-hq-manifest.json`

- [x] **Step 1: Write the DB template JSON**

Create `_infrastructure/notion-db-templates/hq-memory.json` following the same format as existing templates (e.g., `hq-tasks.json`):

Properties:
- Key (title)
- Category (select: preference, pattern, fact, contact, workflow)
- Content (rich_text)
- Source Plugin (select: P01-P30, User, System)
- Confidence (number, 0-100)
- Status (select: candidate, confirmed, applied, dismissed)
- Company (relation → [FOS] Companies)
- Tags (multi_select)
- Times Used (number)
- Last Used (date)
- Synced At (date)

- [x] **Step 2: Update HQ manifest**

Read `_infrastructure/notion-db-templates/founder-os-hq-manifest.json` and add `hq-memory` to the "Growth & Meta" section's databases array.

- [x] **Step 3: Commit**

```bash
git add _infrastructure/notion-db-templates/hq-memory.json _infrastructure/notion-db-templates/founder-os-hq-manifest.json
git commit -m "feat(memory): add [FOS] Memory DB template and update HQ manifest"
```

---

### Task 12: Create the [FOS] Memory database in Notion

**Files:** None (Notion API operation)

- [x] **Step 1: Create the database**

Using the Notion CLI tool, create a new database titled "[FOS] Memory" in the Founder OS HQ workspace:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs create-database <parent-id> --title "[FOS] Memory" --properties '<schema-json>'
```
Use the schema from `hq-memory.json`. Place it in the "Growth & Meta" section alongside Goals, Milestones, Learnings, etc.

Set the Company relation to point to the [FOS] Companies database (ID: 2d00c568-27eb-4346-aad5-df4d854cf6f3).

- [x] **Step 2: Verify the database is discoverable**

Verify via CLI:
```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search "[FOS] Memory" --filter database
```

- [x] **Step 3: Commit** (no code change, but note the DB ID)

Record the new database ID in a comment at the top of `hq-memory.json` for reference.

```bash
git add _infrastructure/notion-db-templates/hq-memory.json
git commit -m "feat(memory): create [FOS] Memory database in Notion HQ"
```

---

## Chunk 4: Plugin Integration (modify existing 30 plugins)

### Task 13: Add memory integration to Pillar 1 namespaces (P01-P08)

**Files:**
- Modify: `commands/inbox/*.md`
- Modify: `commands/briefing/*.md`
- Modify: `commands/prep/*.md`
- Modify: `commands/actions/*.md`
- Modify: `commands/review/*.md`
- Modify: `commands/followup/*.md`
- Modify: `commands/meeting/*.md`
- Modify: `commands/newsletter/*.md`

- [x] **Step 1: Define the standard integration pattern**

Every plugin command gets two additions. After the argument parsing section, add:

```markdown
## Step 0: Memory Context
Read the context-injection skill at `_infrastructure/memory/context-injection/SKILL.md`.
Query for memories relevant to the current input (company, contacts, topics detected in arguments).
If memories are returned, incorporate them into your working context for this execution.
```

Before the final output/presentation step, add:

```markdown
## Final: Memory Update
Read the pattern-detection skill at `_infrastructure/memory/pattern-detection/SKILL.md`.
Log this execution as an observation with: plugin name, primary action performed, key entities (companies, contacts), and output summary.
Check for emerging patterns per the detection rules. If a memory reaches the adaptation threshold, append the notification to the output.
```

- [x] **Step 2: Add memory steps to each Pillar 1 command**

For each of the 8 plugins, find the primary command file and add the two sections above. Insert "Step 0: Memory Context" after argument parsing. Insert "Final: Memory Update" as the last numbered step before output.

Do NOT change any existing logic — only add the two new steps.

- [x] **Step 3: Verify no existing logic changed**

For each modified file, run `git diff` and confirm only the two new sections were added.

- [x] **Step 4: Commit**

```bash
git add commands/inbox/ commands/briefing/ commands/prep/ commands/actions/ commands/review/ commands/followup/ commands/meeting/ commands/newsletter/
git commit -m "feat(memory): integrate memory context injection + pattern detection into Pillar 1 (P01-P08)"
```

---

### Task 14: Add memory integration to Pillar 2 namespaces (P09-P16)

**Files:**
- Modify: `commands/report/*.md`, `commands/health/*.md`, `commands/invoice/*.md`, `commands/proposal/*.md`, `commands/contract/*.md`, `commands/sow/*.md`, `commands/compete/*.md`, `commands/expense/*.md`

- [x] **Step 1: Add memory steps to each Pillar 2 command**

Same pattern as Task 13: add "Step 0: Memory Context" after argument parsing, "Final: Memory Update" before output. For namespaces with multiple commands (e.g., invoice/process.md and invoice/batch.md), add to ALL commands.

- [x] **Step 2: Commit**

```bash
git add commands/report/ commands/health/ commands/invoice/ commands/proposal/ commands/contract/ commands/sow/ commands/compete/ commands/expense/
git commit -m "feat(memory): integrate memory into Pillar 2 (P09-P16)"
```

---

### Task 15: Add memory integration to Pillar 3 namespaces (P17-P24)

**Files:**
- Modify: `commands/notion/*.md`, `commands/drive/*.md`, `commands/slack/*.md`, `commands/client/*.md`, `commands/crm/*.md`, `commands/morning/*.md`, `commands/kb/*.md`, `commands/linkedin/*.md`

- [x] **Step 1: Add memory steps to each Pillar 3 command**

Same pattern as Tasks 13-14.

- [x] **Step 2: Commit**

```bash
git add commands/notion/ commands/drive/ commands/slack/ commands/client/ commands/crm/ commands/morning/ commands/kb/ commands/linkedin/
git commit -m "feat(memory): integrate memory into Pillar 3 (P17-P24)"
```

---

### Task 16: Add memory integration to Pillar 4 namespaces (P25-P30)

**Files:**
- Modify: `commands/savings/*.md`, `commands/prompt/*.md`, `commands/workflow/*.md`, `commands/workflow-doc/*.md`, `commands/learn/*.md`, `commands/goal/*.md`

- [x] **Step 1: Add memory steps to each Pillar 4 command**

Same pattern as Tasks 13-15.

- [x] **Step 2: Commit**

```bash
git add commands/savings/ commands/prompt/ commands/workflow/ commands/workflow-doc/ commands/learn/ commands/goal/
git commit -m "feat(memory): integrate memory into Pillar 4 (P25-P30)"
```

---

## Chunk 5: Documentation & CLAUDE.md Updates

### Task 17: Update CLAUDE.md with memory engine docs

**Files:**
- Modify: `CLAUDE.md`

- [x] **Step 1: Add Memory Engine section to CLAUDE.md**

Add a new section after the "Plugin Dependencies" section:

```markdown
### Memory Engine

Cross-plugin shared memory with adaptive behavior. Two components:

- **Infrastructure** (`_infrastructure/memory/`): 3 shared skills — core memory API, context injection, pattern detection
- **Commands** (`commands/memory/`): User-facing commands `/founder-os:memory:show`, `/founder-os:memory:teach`, `/founder-os:memory:forget`, `/founder-os:memory:sync`
- **Notion DB**: `[FOS] Memory` in HQ template — syncs with local SQLite store

**How it works**: Before any plugin runs, the context-injection skill queries the local memory store and injects the top 5 relevant memories. After execution, the pattern-detection skill logs observations and promotes patterns to memories when confidence reaches threshold. Auto-adaptations apply after 3+ confirmations and notify the user.

**Local store**: `.memory/memory.db` (SQLite + HNSW). Auto-initializes on first use. Not committed to git.
```

- [x] **Step 2: Add .memory/ to .gitignore**

Append `.memory/` to `.gitignore` if it exists, or create one.

- [x] **Step 3: Update the Plugin Quick Reference table**

Add row for P31 Memory Hub:
```
| 31 | Memory Hub | `commands/memory/` | None | Notion | Memory |
```

- [x] **Step 4: Commit**

```bash
git add CLAUDE.md .gitignore
git commit -m "docs: add Memory Engine section to CLAUDE.md and .gitignore"
```

---

### Task 18: Update HQ manifest and consolidation docs

**Files:**
- Modify: `docs/plans/2026-03-07-notion-hq-consolidation-design.md` (if it references the DB list)

- [x] **Step 1: Add [FOS] Memory to consolidation docs**

Update any references to "18 interconnected databases" to "19 interconnected databases". Add Memory to the Growth & Meta section documentation.

- [x] **Step 2: Commit**

```bash
git add docs/
git commit -m "docs: update HQ consolidation docs for [FOS] Memory database"
```

---

## Summary

| Chunk | Tasks | What it Delivers |
|-------|-------|-----------------|
| 1 | 1-4 | Infrastructure: SQLite schema, core memory skill, context injection, pattern detection |
| 2 | 5-10 | Memory Hub: command structure, 4 commands, Notion sync skill |
| 3 | 11-12 | Notion: [FOS] Memory DB template + live database creation |
| 4 | 13-16 | Namespace integration: all 32 namespaces get memory context injection + pattern detection (82 command files) |
| 5 | 17-18 | Documentation: CLAUDE.md, .gitignore, HQ docs updates |

**Total**: 18 tasks, ~5 chunks, each independently testable.

**Dependencies**: Chunk 1 must complete first (other chunks reference the infrastructure skills). Chunks 2 and 3 can run in parallel. Chunk 4 depends on Chunk 1. Chunk 5 can run last or in parallel with Chunk 4.
