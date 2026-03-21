---
description: "View or configure scout search sources"
argument-hint: "[--add=<url>] [--remove=<source-id>] [--reorder]"
allowed-tools: ["Read", "Write"]
execution-mode: foreground
result-format: full
---

# /founder-os:scout:sources

View the current list of scout search sources with their priorities and status. Optionally add, remove, or reorder sources. Changes are persisted to `sources.json`.

## Skills

Read these skill files before proceeding:
1. Read `../../../.founderOS/infrastructure/scout/SKILL.md` — sources schema, source types, priority ordering rules

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `--add=<url>` | No | Add a new source URL to the list (auto-detects source type from URL) |
| `--remove=<source-id>` | No | Remove a source by its ID from the list |
| `--reorder` | No | Interactive reorder: display numbered list and prompt for new order |

If no arguments are provided, display the current source list and exit.

## Business Context (Optional)

Check `../../../.founderOS/infrastructure/context/active/` for `.md` files. If present, read them to personalize behavior — e.g., suggest relevant sources for the business's technology domain.

## Preflight Check

Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `scout` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust behavior:
- Required: (none)
- Optional: (none — this is a config command)

## Step 0: Memory Context

Read `../../../.founderOS/infrastructure/memory/context-injection/SKILL.md`.
Query memory store for: `scout sources`, `search configuration`.
Inject top 5 relevant memories. If a memory references a previously added or removed source, surface a note.

## Intelligence: Apply Learned Patterns

Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'scout' OR plugin IS NULL) AND (command = 'scout-sources' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
2. If patterns found, apply each instruction as additional context for this execution
3. Notify: `[Intel] Applying learned preference: "{description}"` for each pattern applied
4. If the Intelligence database does not exist, skip silently and continue execution

## Read Current Sources

1. Read the sources file at `../../../.founderOS/infrastructure/scout/sources.json`.

2. If the file does not exist, initialize with the default source list defined in the scout SKILL.md. Write the defaults to `sources.json` before continuing.

## Apply Mutations

Apply mutations in this order if flags are provided:

### --add=<url>

1. Validate the URL is reachable (basic format check — do not make a network request).
2. Check for duplicate: if a source with the same URL already exists, warn and skip:
   ```
   [Scout] Source already exists: [url] (ID: [id])
   ```
3. Auto-detect source type from URL patterns:
   - `npmjs.com` → `package-registry`
   - `pypi.org` → `package-registry`
   - `github.com` → `repository`
   - `modelcontextprotocol.io` → `mcp-registry`
   - Other → `custom`
4. Assign a new unique ID (slug derived from hostname + path).
5. Assign priority = current highest priority + 10 (append to end of list).
6. Append new source entry to the sources list.

### --remove=<source-id>

1. Find the source by ID (case-insensitive match).
2. If not found, warn and stop:
   ```
   [Scout] Source not found: [source-id]
   Run /founder-os:scout:sources to see available source IDs.
   ```
3. If found, remove the entry from the list.
4. Renumber priorities to maintain continuous ordering (10, 20, 30, ...) without gaps.

### --reorder

1. Display the numbered current list.
2. Prompt: `Enter new order as comma-separated IDs (e.g., "github,npmjs,pypi"): `
3. Validate all provided IDs exist in the current list.
4. Reorder entries to match the provided sequence. Reassign priorities (10, 20, 30, ...).
5. Any sources not included in the new order are appended at the end in their original relative order.

## Write Back (if mutated)

If any mutation was applied (`--add`, `--remove`, or `--reorder`):
1. Write the updated sources list back to `../../../.founderOS/infrastructure/scout/sources.json`.
2. Confirm: `[Scout] Sources updated — [N] sources configured.`

## Display Current Source List

After any mutations (or immediately if no mutations), display the current source list:

```
── Scout Search Sources ────────────────────────────────────
[N] sources configured

Priority  ID                   Type               URL
────────  ───────────────────  ─────────────────  ──────────────────────────────────────
10        [id]                 [type]             [url]
20        [id]                 [type]             [url]
30        [id]                 [type]             [url]
...

────────────────────────────────────────────────────────────
Manage sources:
  Add:     /founder-os:scout:sources --add=<url>
  Remove:  /founder-os:scout:sources --remove=<source-id>
  Reorder: /founder-os:scout:sources --reorder
```

**Column definitions**:
- **Priority** — search order (lower number = searched first)
- **ID** — unique source identifier used with `--remove`
- **Type** — `package-registry` | `mcp-registry` | `repository` | `custom`
- **URL** — base URL of the source

## Self-Healing: Error Recovery

If any error occurs during this command:
1. **Transient** (file read/write transient I/O): retry once
2. **Recoverable** (malformed sources JSON): display warning, reset to defaults, and prompt user to confirm before writing: `[Scout] sources.json is malformed. Reset to defaults? (y/n)`
3. **Degradable** (optional tool unavailable): skip, warn
4. **Fatal** (sources path unwritable after retry): halt with: `[Scout] Cannot write sources at [path]. Check file permissions or run /founder-os:setup:verify.`

## Final Step: Observation Logging

Record observation via `../../../.founderOS/infrastructure/memory/pattern-detection/SKILL.md`:
- Plugin: `scout`
- Command: `scout-sources`
- Key entities: mutations applied (add/remove/reorder), source IDs affected
- Outcome: success or failure
- Log any newly added source URLs for future reference

## Intelligence: Post-Command

After execution completes, record a post_command event to the Intelligence event store:
- Event type: `post_command`
- Use the same session_id from start
- Outcome: `success` | `failure` | `degraded`
- Payload: { mutations_applied, sources_count_before, sources_count_after }
- Duration: milliseconds elapsed since pre_command event

## Usage Examples

```
/founder-os:scout:sources
/founder-os:scout:sources --add=https://registry.npmjs.org
/founder-os:scout:sources --remove=custom-source-1
/founder-os:scout:sources --reorder
```
