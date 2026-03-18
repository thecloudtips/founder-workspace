---
description: "Promote a scouted tool to a native namespace"
argument-hint: "<tool-id> --to=<namespace> [--command-name=<name>]"
allowed-tools: ["Read", "Write", "Bash"]
execution-mode: foreground
result-format: full
---

# /founder-os:scout:promote

Promote an installed scouted tool from the scout namespace into a native Founder OS namespace, moving its wrapper command and updating all catalog and workflow references.

## Skills

Read these skill files before proceeding:
1. Read `${CLAUDE_PLUGIN_ROOT}/_infrastructure/scout/SKILL.md` — catalog structure, sandbox layout, install status values
2. Read `${CLAUDE_PLUGIN_ROOT}/skills/scout/integration/SKILL.md` — promotion rules, wrapper templates, namespace validation

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| `tool-id` | Yes | The tool identifier as recorded in the catalog (e.g., `carbon-cli`) |
| `--to` | Yes | Target namespace to promote into (e.g., `report`, `workflow`). Must be an existing namespace or a valid new namespace name. |
| `--command-name` | No | Override the command file name. Defaults to the tool's `command_name` from catalog. |

## Business Context (Optional)

Check if context files exist at `_infrastructure/context/active/`. If the directory contains `.md` files, read `business-info.md` and `current-data.md`. Use this context to inform namespace recommendations and identify relevant workflows to update. If files don't exist, skip silently.

## Preflight Check

Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `scout` namespace.
- Required: (none)
- Optional: `websearch`

If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and continue.

## Step 0: Memory Context

Read the context-injection skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/context-injection/SKILL.md`.
Query memory store for: `scout promote`, `namespace migration`, `tool integration`. Inject top 5 relevant memories as working context for this execution.

## Intelligence: Apply Learned Patterns

Check for learned optimizations from past runs by querying the Intelligence database (`_infrastructure/intelligence/.data/intelligence.db`):
1. Query: `SELECT instruction, description FROM patterns WHERE (plugin = 'scout' OR plugin IS NULL) AND (command = 'scout-promote' OR command IS NULL) AND status IN ('active', 'approved') ORDER BY confidence DESC`
2. If patterns found, apply each instruction as additional context
3. Notify: `[Intel] Applying learned preference: "{description}"` for each applied pattern
4. If the Intelligence database does not exist, skip silently and continue

## Phase 1/4: Validate

1. Read the catalog at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/scout/catalog.json`. Parse it as JSON.
2. Look up the entry where `id` equals the provided `tool-id`.
3. If not found, stop and display:
   ```
   Tool '{tool-id}' not found in the scout catalog.
   Run /founder-os:scout:catalog to view installed tools.
   ```
4. If found but `install_status` is not `"installed"`, stop and display:
   ```
   Tool '{tool-id}' cannot be promoted — current status: {install_status}.
   Only tools with install_status "installed" can be promoted.
   ```
5. Determine the target namespace from `--to`. Check whether `commands/<namespace>/` already exists:
   ```bash
   [ -d "${CLAUDE_PLUGIN_ROOT}/commands/<namespace>" ] && echo "exists" || echo "new"
   ```
6. If the namespace directory does not exist, confirm with the user:
   ```
   Namespace '{namespace}' does not exist yet. Creating a new namespace directory.
   Proceed? (yes/no)
   ```
   Wait for confirmation. If no, stop.
7. Resolve the final command name: use `--command-name` if provided, otherwise use the tool's `command_name` field from the catalog, otherwise derive from `tool-id` (strip `-cli` suffix, use kebab-case).
8. Confirm the destination path: `commands/<namespace>/<command-name>.md`. Check if the file already exists — if it does, warn:
   ```
   A command file already exists at commands/<namespace>/<command-name>.md.
   Overwrite it? (yes/no)
   ```

## Phase 2/4: Move Command

1. Read the current wrapper command file at `commands/scout/<tool-name>.md` (where `tool-name` is the catalog entry's `command_path` basename, or derived from `tool-id`).
2. If the namespace directory is new, create it:
   ```bash
   mkdir -p "${CLAUDE_PLUGIN_ROOT}/commands/<namespace>"
   ```
3. Write the command content to the destination path `commands/<namespace>/<command-name>.md`.
   - Remove the `[Auto-generated] ` prefix from the `description` field in the YAML frontmatter if present.
   - Update the command heading (e.g., `# /founder-os:scout:<tool>`) to `# /founder-os:<namespace>:<command-name>`.
   - Update the `usage` field in frontmatter if present.
4. Delete the original file at `commands/scout/<tool-name>.md`:
   ```bash
   rm "${CLAUDE_PLUGIN_ROOT}/commands/scout/<tool-name>.md"
   ```

## Phase 3/4: Update References

1. Update the catalog entry in `_infrastructure/scout/catalog.json`:
   - Set `install_status` to `"promoted"`
   - Set `command_path` to `commands/<namespace>/<command-name>.md`
   - Add `promoted_to_namespace: "<namespace>"` and `promoted_at: "<ISO timestamp>"`
2. Write the updated catalog back to disk.
3. Search for workflow YAML files that reference the old command path:
   ```bash
   grep -rl "scout:<tool-name>" "${CLAUDE_PLUGIN_ROOT}/workflows/" 2>/dev/null
   grep -rl "commands/scout/<tool-name>" "${CLAUDE_PLUGIN_ROOT}/workflows/" 2>/dev/null
   ```
4. For each workflow file found, update the old reference (`/founder-os:scout:<tool-name>`) to the new path (`/founder-os:<namespace>:<command-name>`). Inform the user of each file updated:
   ```
   Updated workflow reference in: workflows/<filename>.yaml
   ```
5. If no workflow files reference the old path, note: "No workflow references to update."

## Phase 4/4: Scaffold (Optional)

After completing the move, offer to scaffold a domain skill for the target namespace if one does not already exist:

1. Check: `[ -f "${CLAUDE_PLUGIN_ROOT}/skills/<namespace>/<command-name>/SKILL.md" ] && echo "exists" || echo "missing"`
2. If the skill file does not exist, ask:
   ```
   Would you like to scaffold a domain skill at:
   skills/<namespace>/<command-name>/SKILL.md

   This is optional — the promoted command works without it.
   Scaffold? (yes/no)
   ```
3. If yes, create a minimal skill scaffold at `skills/<namespace>/<command-name>/SKILL.md` with a placeholder header, description, and a note to populate with domain knowledge.
4. If no or if skill already exists, skip silently.

## Output

Display a summary of all actions taken:

```
scout:promote — Complete

Tool:          {tool-id}
Promoted to:   /founder-os:{namespace}:{command-name}

Files moved:
  commands/scout/{tool-name}.md
  → commands/{namespace}/{command-name}.md

Catalog updated:
  install_status: installed → promoted
  command_path: commands/{namespace}/{command-name}.md

Workflow references updated: {N} file(s)
Domain skill: {scaffolded | already exists | skipped}

To use the promoted command:
  /founder-os:{namespace}:{command-name} [arguments]
```

## Self-Healing: Error Recovery

- **Transient**: retry file read/write operations once before failing
- **Recoverable**: if workflow reference update fails for a single file, skip that file, warn the user, and continue
- **Degradable**: if domain skill scaffold fails, warn and skip — the promotion itself is still valid
- **Fatal**: if catalog write fails or the source command file cannot be read, halt and display fix instructions with the exact file paths involved

## Final Step: Observation Logging

Record observation via `${CLAUDE_PLUGIN_ROOT}/_infrastructure/memory/pattern-detection/SKILL.md`:
- Plugin: `scout`
- Command: `scout-promote`
- Action: tool promoted to namespace
- Entities: tool-id, target namespace, command name, number of workflow references updated
- Outcome: success or failure with reason

## Intelligence: Post-Command

Log execution metrics to the Intelligence event store (`_infrastructure/intelligence/.data/intelligence.db`):
- Event type: `post_command`
- Plugin: `scout`, command: `scout-promote`
- Outcome: `success` | `failure` | `degraded`
- Payload: tool promoted, target namespace, files moved, references updated
- If Intelligence DB is unavailable, skip silently
