---
description: "Browse discovered tools and their security ratings"
argument-hint: "[search-term] [--verdict=green|yellow|red] [--type=skill|mcp|repo|package] [--installed]"
allowed-tools: ["Read"]
execution-mode: background
result-format: summary
---

# /founder-os:scout:catalog

Browse the local scout catalog of discovered tools. Filter by security verdict, type, or installation status. Returns a formatted table with IDs, verdicts, and usage statistics.

## Skills

Read these skill files before proceeding:
1. Read `../../../.founderOS/infrastructure/scout/SKILL.md` — catalog schema, verdict definitions, status values

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `search-term` | No | Filter by name or description (case-insensitive substring match) |
| `--verdict=green\|yellow\|red` | No | Filter by security verdict: green=approved, yellow=caution, red=blocked |
| `--type=skill\|mcp\|repo\|package` | No | Filter by source type |
| `--installed` | No | Show only tools with status="installed" |

## Business Context (Optional)

Check `../../../.founderOS/infrastructure/context/active/` for `.md` files. If present, read them to personalize behavior — e.g., highlight tools relevant to the current business tech stack.

## Preflight Check

Read the preflight skill at `../../../.founderOS/infrastructure/preflight/SKILL.md`.
Run the preflight check for the `scout` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust behavior:
- Required: (none)
- Optional: (none — this is a read-only command)

## Step 0: Memory Context

Read `../../../.founderOS/infrastructure/memory/context-injection/SKILL.md`.
Query memory store for: `scout catalog`, `installed tools`.
Inject top 5 relevant memories. If a memory references a recently installed or evaluated tool, surface a note alongside the catalog entry.

## Intelligence: Apply Learned Patterns

Before executing the main logic, check for learned patterns in the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'scout' OR plugin IS NULL) AND (command = 'scout-catalog' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
2. If patterns found, apply each instruction as additional context for this execution
3. Notify: `[Intel] Applying learned preference: "{description}"` for each pattern applied
4. If the Intelligence database does not exist, skip silently and continue execution

## Read & Filter Catalog

1. Read the catalog file at `../../../.founderOS/infrastructure/scout/catalog.json`.

2. If the file does not exist or is empty, display:
   ```
   ── Scout Catalog ──────────────────────────────────────
   No tools discovered yet.
   Run /founder-os:scout:find "<problem>" to discover tools.
   ```
   And stop here.

3. Apply filters in order:
   - If `search-term` provided: keep entries where `name` or `description` contains the term (case-insensitive)
   - If `--verdict` provided: keep entries where `verdict` matches the specified value
   - If `--type` provided: keep entries where `type` matches the specified value
   - If `--installed` provided: keep entries where `status == "installed"`

4. If no entries remain after filtering, display:
   ```
   ── Scout Catalog: No matches ──────────────────────────
   No catalog entries match the applied filters.
   Try broadening the search or removing filters.
   ```
   And stop here.

## Output

Display the filtered entries as a formatted table:

```
── Scout Catalog ──────────────────────────────────────────
Showing [N] of [total] entries[  · Filters: [active filters]]

ID        Name                Type       Verdict   Status      Last Used    Usage
────────  ──────────────────  ─────────  ────────  ──────────  ───────────  ─────
[id]      [name]              [type]     [verdict] [status]    [date|never] [n]
[id]      [name]              [type]     [verdict] [status]    [date|never] [n]
...

Verdict key:  green=approved  yellow=caution  red=blocked  pending=not yet reviewed
Status key:   installed  available  deprecated

───────────────────────────────────────────────────────────
Run /founder-os:scout:find "<problem>" to discover more tools.
Run /founder-os:scout:install <id> to install a tool.
```

**Column definitions** (from catalog schema):
- **ID** — unique catalog identifier (short hash or slug)
- **Name** — tool or package name
- **Type** — `skill` | `mcp` | `repo` | `package`
- **Verdict** — security review outcome: `green` | `yellow` | `red` | `pending`
- **Status** — `installed` | `available` | `deprecated`
- **Last Used** — date of last successful invocation, or `never`
- **Usage Count** — number of times invoked since installation

Verdict coloring guidance (display as text labels, not ANSI codes):
- `green` → approved
- `yellow` → caution (review notes available)
- `red` → blocked (do not install)
- `pending` → not yet reviewed

## Self-Healing: Error Recovery

If any error occurs during this command:
1. **Transient** (file read error, transient I/O): retry once
2. **Recoverable** (malformed catalog JSON): display raw entry count and warn: `[Scout] Catalog may be corrupted — showing parseable entries only.`
3. **Degradable** (optional tool unavailable): skip, warn
4. **Fatal** (catalog path unreadable after retry): halt with: `[Scout] Cannot read catalog at [path]. Check file permissions or run /founder-os:setup:verify.`

## Final Step: Observation Logging

Record observation via `../../../.founderOS/infrastructure/memory/pattern-detection/SKILL.md`:
- Plugin: `scout`
- Command: `scout-catalog`
- Key entities: filters applied, entry count returned
- Outcome: success or failure

## Intelligence: Post-Command

After execution completes, record a post_command event to the Intelligence event store:
- Event type: `post_command`
- Use the same session_id from start
- Outcome: `success` | `failure` | `degraded`
- Payload: { filters_applied, entries_returned, total_catalog_size }
- Duration: milliseconds elapsed since pre_command event

## Usage Examples

```
/founder-os:scout:catalog
/founder-os:scout:catalog "pdf"
/founder-os:scout:catalog --verdict=green
/founder-os:scout:catalog --type=mcp --installed
/founder-os:scout:catalog "slack" --verdict=green
```
