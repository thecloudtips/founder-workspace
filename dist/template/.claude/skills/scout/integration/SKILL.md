---
name: scout-integration
description: "Wrapper command templates, promotion rules, workflow snippet patterns, and metadata embedding for scout:install, scout:promote, and scout:remove"
globs: ["commands/scout/install.md", "commands/scout/promote.md", "commands/scout/remove.md"]
---

# Scout Integration Skill

Defines how external tools discovered by scout are wrapped as founderOS commands, promoted to native namespaces, and integrated into P27 workflows.

---

## 1. Wrapper Command Template

When `scout:install` succeeds, it generates a standard founderOS command file at:

```
commands/scout/<tool-name>.md
```

The generated file uses only the five standard frontmatter fields:

```yaml
---
description: "[Auto-generated] <what the tool does>"
argument-hint: "<mapped arguments>"
allowed-tools: ["Read", "Bash"]  # Scoped to what the tool actually needs
execution-mode: background
result-format: summary
---
```

All scout-specific metadata (source URL, catalog ID, security verdict, install date) is stored in two places:
- `catalog.json` — machine-readable record
- A comment block in the command body — human-readable audit trail

The `scouted-from` and `security-verdict` fields are NOT placed in YAML frontmatter.

---

## 2. Frontmatter Rules

Only the following five fields are permitted in the YAML frontmatter of any scout-generated command:

| Field | Required | Notes |
|---|---|---|
| `description` | Yes | Prefixed with `[Auto-generated]` until promoted |
| `argument-hint` | Yes | Describes expected invocation arguments |
| `allowed-tools` | Yes | Minimal set — scoped to what the tool actually needs |
| `execution-mode` | Yes | Typically `background` for external tools |
| `result-format` | Yes | Typically `summary` |

Any additional metadata must go into `catalog.json` and/or the scout metadata comment block in the command body.

---

## 3. Scout Metadata Comment Block

Every auto-generated command body must begin with a scout metadata comment block immediately after the frontmatter:

```markdown
<!-- Scout Metadata
source_url: https://github.com/example/tool
catalog_id: tool-name-skill
security_verdict: yellow
installed: 2026-03-14
-->
```

### Security Verdict Values

| Value | Meaning |
|---|---|
| `green` | Reviewed and approved |
| `yellow` | Auto-scanned, no known issues, use with awareness |
| `red` | Flagged — do not use in production |

The comment block is preserved through promotion unless explicitly removed by the operator.

---

## 4. Argument Mapping

Scout maps the underlying tool's CLI or API arguments to founderOS command arguments using the following rules:

### Positional Arguments

Underlying positional args are mapped directly to command positional args in order:

```
tool <input-file> <output-dir>
→ argument-hint: "<input-file> <output-dir>"
```

### CLI Flags

Named flags are preserved in `--flag` format:

```
tool --format=mp4 --quality=high
→ argument-hint: "[--format=<mp4|webm>] [--quality=<low|high>]"
```

### Config Options

Options that are typically set via config files (not CLI) are documented in the command body under a `## Configuration` section, not expressed as argument-hint values.

### Argument Mapping Example

For a tool with signature `render --script <path> --output <dir> [--format mp4]`:

```yaml
---
description: "[Auto-generated] Render video from a script file"
argument-hint: "--script=<path> --output=<dir> [--format=<mp4|webm>]"
allowed-tools: ["Bash"]
execution-mode: background
result-format: summary
---
```

---

## 5. Promotion Flow

Promotion moves a scout-generated command into a permanent native namespace. The five steps are:

### Step 1 — Move the Command File

```
commands/scout/<tool-name>.md  →  commands/<namespace>/<new-name>.md
```

The target namespace and command name are supplied by the operator via `scout:promote`.

### Step 2 — Remove the Auto-Generated Prefix

Update the `description` field in frontmatter:

```
[Auto-generated] Render video from a script file
→  Render video from a script file
```

### Step 3 — Update the Catalog Entry

In `catalog.json`, set:

```json
{
  "install_status": "promoted",
  "command_path": "commands/<namespace>/<new-name>.md"
}
```

### Step 4 — Update Workflow References

Search all workflow YAML files for steps referencing the old command path and update them to the new path:

```
/founder-os:scout:<tool-name>  →  /founder-os:<namespace>:<new-name>
```

Affected files are reported in the promotion output.

### Step 5 — Optionally Scaffold a Domain Skill

If the operator passes `--scaffold-skill`, create a stub skill file at:

```
skills/<namespace>/<new-name>/SKILL.md
```

The stub includes the standard skill frontmatter and placeholder sections for the operator to complete.

---

## 6. Workflow YAML Integration

Scouted tools (before or after promotion) can be referenced in P27 workflow step definitions.

### Before Promotion (scout namespace)

```yaml
steps:
  - name: "Render video"
    command: "/founder-os:scout:remotion-render --script='$prev.output_path'"
```

### After Promotion (native namespace)

```yaml
steps:
  - name: "Render video"
    command: "/founder-os:video:render --script='$prev.output_path'"
```

### Argument Interpolation

Workflow steps support `$prev.output_path` and `$context.<key>` interpolation in argument values. Scout-generated commands pass these through to the underlying tool as-is.

### Result Passing

Because scout commands use `result-format: summary`, workflow steps receive a structured summary object. Downstream steps can reference:

```yaml
command: "/founder-os:notify:slack --message='$prev.summary'"
```

---

## 7. Removal Process

`scout:remove <tool-name>` performs the following steps in order:

1. **Delete wrapper command file** — removes `commands/scout/<tool-name>.md`
2. **Delete sandbox directory** — removes the isolated tool environment
3. **Remove catalog entry** — deletes the entry from `catalog.json` unless `--keep-catalog` is passed
4. **Remove Memory Engine entry** — removes the tool's record from the scout memory index

### Keep Catalog Flag

When `--keep-catalog` is passed, the catalog entry is retained with `install_status: "removed"`. This preserves the security verdict and source URL for audit purposes without keeping the executable command.

### Removal of Promoted Tools

If a tool has been promoted, `scout:remove` will refuse to delete it without an explicit `--force` flag, since the command now lives outside the scout namespace. The operator must either:
- Manually delete the promoted command file and run `scout:remove --keep-catalog`, or
- Run `scout:remove --force` to remove both the promoted command and the catalog entry
