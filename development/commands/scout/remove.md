---
description: "Remove a scouted tool and its artifacts"
argument-hint: "<tool-id> [--keep-catalog]"
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: foreground
result-format: full
---

# /founder-os:scout:remove

Remove a scouted tool from the sandbox, deleting its wrapper command, sandbox directory, catalog entry, and Memory Engine record. Use `--keep-catalog` to retain the catalog entry for future reference.

## Skills

Read these skill files before proceeding:
1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/scout/SKILL.md` — catalog structure, sandbox layout, install status values
2. Read `${CLAUDE_PLUGIN_ROOT}/skills/scout/integration/SKILL.md` — removal process, artifact inventory

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `tool-id` | Yes | The tool identifier as recorded in the catalog (e.g., `carbon-cli`) |
| `--keep-catalog` | No | Retain the catalog entry but set `install_status` to `"removed"`. Useful for auditing or reinstalling later. |

## Business Context (Optional)

Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md` and `current-data.md`. Use this context to check whether the tool is referenced in active workflows before removal. If files don't exist, skip silently.

## Preflight Check

Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `scout` namespace.
- Required: (none)
- Optional: `websearch`

If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and continue.

## Step 0: Memory Context

Read the context-injection skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/context-injection/SKILL.md`.
Query memory store for: `scout remove`, `tool cleanup`, `sandbox`. Inject top 5 relevant memories as working context for this execution.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past runs by querying the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'scout' OR plugin IS NULL) AND (command = 'scout-remove' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
2. If patterns found, apply each instruction as additional context
3. Notify: `[Intel] Applying learned preference: "{description}"` for each applied pattern
4. If the Intelligence database does not exist, skip silently and continue

## Phase 1/3: Locate

1. Read the catalog at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/scout/catalog.json`. Parse it as JSON.
2. Look up the entry where `id` equals the provided `tool-id`.
3. If not found, stop and display:
   ```
   Tool '{tool-id}' not found in the scout catalog.
   Run /founder-os:scout:catalog to view available tools.
   ```
4. If the tool has `install_status: "promoted"`, warn the user:
   ```
   Warning: '{tool-id}' has already been promoted to namespace '{promoted_to_namespace}'.
   Its wrapper command was moved to commands/{namespace}/{command-name}.md during promotion.
   Removing it here will only clean up the catalog entry and any remaining sandbox data.
   Proceed? (yes/no)
   ```
   Wait for confirmation. If no, stop.
5. Build the complete artifact inventory:

   | Artifact | Path | Exists? |
   |----------|------|---------|
   | Wrapper command | `commands/scout/<tool-name>.md` | check with `[ -f ... ]` |
   | Sandbox directory | `_infrastructure/scout/sandbox/<tool-id>/` | check with `[ -d ... ]` |
   | Catalog entry | `_infrastructure/scout/catalog.json` entry `id: <tool-id>` | found in step 2 |
   | Memory Engine entry | `.memory/memory.db` — key `scout-<tool-id>` | check with SQLite query |

6. Check for active workflow references:
   ```bash
   grep -rl "scout:<tool-name>" "${CLAUDE_PLUGIN_ROOT}/workflows/" 2>/dev/null
   ```
   If any workflow files reference this tool, list them as a warning in Phase 2.

7. Check for the Memory Engine entry:
   ```bash
   [ -f ".memory/memory.db" ] && sqlite3 .memory/memory.db "SELECT id, key, content FROM memories WHERE key LIKE 'scout-<tool-id>%' LIMIT 5;" 2>/dev/null
   ```

## Phase 2/3: Confirm

Display the full artifact list and ask for confirmation before proceeding:

```
scout:remove — Confirmation Required

Tool:    {tool-id}
Source:  {catalog entry source_url or "unknown"}
Status:  {install_status}

The following artifacts will be deleted:
  {[✓] commands/scout/{tool-name}.md         (wrapper command)}
  {[✓] _infrastructure/scout/sandbox/{tool-id}/  (sandbox directory)}
  {[✓] catalog entry in catalog.json          (or "marked removed" if --keep-catalog)}
  {[✓] memory entry: scout-{tool-id}          (if exists)}

{If --keep-catalog:}
  Note: --keep-catalog specified. Catalog entry will be retained with install_status="removed".

{If workflow references found:}
  Warning: The following workflows reference this tool and may break:
    - workflows/{filename}.yaml
  You will need to update or remove those references manually after removal.

Confirm deletion? (yes/no)
```

Wait for the user's response. If no, display "Removal cancelled." and stop.

## Phase 3/3: Remove

Execute removals in order. Report each step as it completes.

**1. Delete wrapper command**

If `commands/scout/<tool-name>.md` exists:
```bash
rm "${CLAUDE_PLUGIN_ROOT}/commands/scout/<tool-name>.md"
```
Report: `Deleted: commands/scout/<tool-name>.md`

If the file does not exist, note: `Skipped (not found): commands/scout/<tool-name>.md`

**2. Delete sandbox directory**

If `_infrastructure/scout/sandbox/<tool-id>/` exists:
```bash
rm -rf "${CLAUDE_PLUGIN_ROOT}/_infrastructure/scout/sandbox/<tool-id>/"
```
Report: `Deleted: _infrastructure/scout/sandbox/<tool-id>/`

If the directory does not exist, note: `Skipped (not found): _infrastructure/scout/sandbox/<tool-id>/`

**3. Update catalog**

Read `_infrastructure/scout/catalog.json`. Find the entry for `tool-id`.

- If `--keep-catalog` is set: update the entry's `install_status` to `"removed"` and add `removed_at: "<ISO timestamp>"`. Write the updated catalog back to disk.
  Report: `Catalog entry retained (install_status set to "removed")`

- If `--keep-catalog` is not set: remove the entire entry from the catalog array. Write the updated catalog back to disk.
  Report: `Catalog entry deleted`

**4. Remove Memory Engine entry**

If `.memory/memory.db` exists and a matching memory entry was found in Phase 1:
```bash
sqlite3 .memory/memory.db "DELETE FROM memories WHERE key LIKE 'scout-<tool-id>%';"
```
Report: `Memory Engine entry removed: scout-<tool-id>`

If the memory database does not exist or no matching entry was found, note: `Memory Engine: no entry to remove`

## Output

Display a final summary of all actions taken:

```
scout:remove — Complete

Tool:      {tool-id}
Outcome:   {fully removed | removed (catalog retained)}

Artifacts removed:
  {list each artifact with status: deleted | skipped | retained}

{If workflow references existed:}
Action required: Update the following workflows that referenced this tool:
  - workflows/{filename}.yaml
  Search for "/founder-os:scout:{tool-name}" and remove or replace those steps.

To scout a replacement tool:
  /founder-os:scout:find <capability-description>
```

## Self-Healing: Error Recovery

- **Transient**: retry file deletion once on transient I/O errors before failing
- **Recoverable**: if sandbox directory deletion partially fails (e.g., permissions on a subdirectory), delete what is accessible and warn about remaining paths
- **Degradable**: if Memory Engine deletion fails, warn the user and continue — catalog and file artifacts are still removed
- **Fatal**: if catalog write fails after deletions have already occurred, halt and display the exact state: list which artifacts were already deleted and instruct the user to manually remove the catalog entry

## Final Step: Observation Logging

Record observation via `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/pattern-detection/SKILL.md`:
- Plugin: `scout`
- Command: `scout-remove`
- Action: tool removed from sandbox
- Entities: tool-id, artifacts deleted, keep-catalog flag
- Outcome: success or failure with reason

## Intelligence: Post-Command

Log execution metrics to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `post_command`
- Plugin: `scout`, command: `scout-remove`
- Outcome: `success` | `failure` | `degraded`
- Payload: tool removed, artifacts deleted count, keep-catalog flag, workflow references found
- If Intelligence DB is unavailable, skip silently
