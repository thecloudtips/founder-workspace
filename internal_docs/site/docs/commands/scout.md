# Scout

> Discover, security-review, and install external tools and skills to extend Founder OS capabilities.

## Overview

Scout is the package manager for your Founder OS ecosystem. When you hit a capability gap -- "I need to parse PDFs" or "I need a Slack notification MCP server" -- Scout searches local catalogs, memory, and the web to find tools that solve the problem. Found tools go through a 6-point security review before installation, get sandboxed with a wrapper command, and register in a local catalog for future reference.

The full lifecycle is covered: discover tools with `find`, install them with security review through `install`, browse your catalog with `catalog`, re-audit with `review`, promote proven tools to native namespaces with `promote`, manage search sources with `sources`, and clean up with `remove`. Every step is auditable, and security verdicts (green, yellow, red) travel with the tool through its entire lifecycle.

Scout integrates with the intelligence engine, so frequently discovered tool categories build up pattern knowledge that speeds future searches.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Web Search | Optional | Searches the web for tools (without it, catalog-only mode) |
| WebFetch | Optional | Fetches tool READMEs for richer descriptions |
| Filesystem | Yes | Manages sandbox directories and wrapper commands |

## Commands

### `/founder-os:scout:find`

**What it does** -- Discovers external tools, skills, MCP servers, packages, and repositories that solve a given problem. Checks the local catalog and memory first, then cascades to web search if no high-confidence match exists. Returns up to 3 ranked results with relevance scores and integration effort estimates.

**Usage:**

```
/founder-os:scout:find "<problem-description>" [--deep] [--type=skill|mcp|repo|package] [--budget=low|medium|high]
```

**Example scenario:**

> You need to parse PDF documents into markdown for your report generator. You run `scout:find "parse PDFs into markdown"` and get 3 results: an MCP server (relevance 92, low effort), an npm package (relevance 85, medium effort), and a GitHub repo (relevance 78, high effort).

**What you get back:**

- Up to 3 ranked results with name, URL, type, relevance score, and integration effort
- Source indicator (catalog, memory, or web)
- Install command for each result

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--deep` | -- | Spawn agent team for exhaustive multi-source research |
| `--type` | All | Restrict to `skill`, `mcp`, `repo`, or `package` |
| `--budget` | `medium` | Search depth: `low` (5 queries), `medium` (10), `high` (20) |

---

### `/founder-os:scout:install`

**What it does** -- Downloads a discovered tool into the scout sandbox, runs a 6-point security review (prompt injection, secret exfiltration, overly broad tools, data leakage, supply chain risk, permission escalation), generates a wrapper command, and registers the tool in the catalog. Red verdicts require explicit confirmation.

**Usage:**

```
/founder-os:scout:install <tool-url-or-catalog-id> [--skip-review] [--namespace=TARGET]
```

**Example scenario:**

> You found a PDF parsing MCP server and want to install it. The security review returns a green verdict (clean across all 6 checks). A wrapper command is created at `commands/scout/pdf-parser.md` and the tool is registered in the catalog with usage tracking.

**What you get back:**

- Download confirmation with sandbox path
- Security verdict with per-check findings
- Wrapper command path
- Catalog registration confirmation

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--skip-review` | -- | Skip security scan (logged for audit) |
| `--namespace=TARGET` | -- | Pre-set promotion namespace for later |

---

### `/founder-os:scout:catalog`

**What it does** -- Browse the local catalog of discovered and installed tools. Filter by security verdict, source type, installation status, or keyword search. Displays a formatted table with IDs, verdicts, usage statistics, and status.

**Usage:**

```
/founder-os:scout:catalog [search-term] [--verdict=green|yellow|red] [--type=skill|mcp|repo|package] [--installed]
```

**Example scenario:**

> You want to see all installed tools with green security verdicts. You run `catalog --verdict=green --installed` and see 5 tools with their usage counts and last-used dates.

**What you get back:**

- Formatted table with ID, name, type, verdict, status, last used, and usage count
- Filter summary and total entry count
- Verdict and status legends

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `search-term` | All | Filter by name or description |
| `--verdict` | All | `green`, `yellow`, or `red` |
| `--type` | All | `skill`, `mcp`, `repo`, or `package` |
| `--installed` | All | Show only installed tools |

---

### `/founder-os:scout:review`

**What it does** -- Re-runs the 6-point security scan on a previously installed tool. Updates the catalog verdict and presents a comparison with the previous review result (if one exists), showing which findings changed.

**Usage:**

```
/founder-os:scout:review <tool-id>
```

**Example scenario:**

> A tool you installed three months ago got a yellow verdict originally. You re-review it after the maintainer addressed the issues, and the new scan comes back green. The report shows the comparison: data leakage risk went from medium to none.

**What you get back:**

- Updated security verdict with per-check findings
- Comparison with previous verdict (changed findings highlighted)
- Catalog update confirmation

**Flags:**

None -- just provide the tool ID.

---

### `/founder-os:scout:promote`

**What it does** -- Moves an installed scout tool from the `scout` namespace into a native Founder OS namespace. The wrapper command file is relocated, its heading and frontmatter are updated, catalog references are rewritten, and any workflow YAML files referencing the old command path are updated automatically.

**Usage:**

```
/founder-os:scout:promote <tool-id> --to=<namespace> [--command-name=NAME]
```

**Example scenario:**

> The PDF parser has proven itself over 30 uses. You promote it from `scout` to the `report` namespace. The wrapper moves from `commands/scout/pdf-parser.md` to `commands/report/pdf-parser.md`, and 2 workflow files are automatically updated with the new command path.

**What you get back:**

- File move confirmation with before/after paths
- Catalog update (status: promoted)
- Workflow reference update count
- Optional domain skill scaffold offer

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--to=NAMESPACE` | Required | Target namespace to promote into |
| `--command-name=NAME` | From catalog | Override the command file name |

---

### `/founder-os:scout:remove`

**What it does** -- Removes a scouted tool by deleting its wrapper command, sandbox directory, catalog entry, and memory engine record. Warns about active workflow references before proceeding. Use `--keep-catalog` to retain the entry for audit purposes.

**Usage:**

```
/founder-os:scout:remove <tool-id> [--keep-catalog]
```

**Example scenario:**

> You installed a tool that turned out to be unreliable. You run remove, confirm the artifact list (wrapper, sandbox, catalog entry, memory), and everything is cleaned up. The system warns that one workflow references the tool and needs manual updating.

**What you get back:**

- Full artifact inventory with deletion status
- Workflow reference warnings (if any)
- Catalog entry retention status (if `--keep-catalog`)

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--keep-catalog` | -- | Retain catalog entry with "removed" status |

---

### `/founder-os:scout:sources`

**What it does** -- View and manage the list of search sources that Scout uses when discovering tools. Add custom source URLs (npm registries, GitHub organizations, MCP registries), remove sources, or reorder priorities to control which sources are searched first.

**Usage:**

```
/founder-os:scout:sources [--add=URL] [--remove=SOURCE-ID] [--reorder]
```

**Example scenario:**

> You want Scout to search your company's private npm registry first. You add the URL with `--add` and then reorder sources to put it at priority 10 (searched first).

**What you get back:**

- Source table with priority, ID, type, and URL
- Mutation confirmation (add, remove, or reorder)
- Management commands reference

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--add=URL` | -- | Add a new source (type auto-detected) |
| `--remove=ID` | -- | Remove a source by ID |
| `--reorder` | -- | Interactive priority reordering |

---

## Tips & Patterns

- **Always review before installing.** The security scan catches real issues. Only use `--skip-review` for tools you've personally audited from trusted sources.
- **Promote tools you use regularly.** Once a scout tool hits 10+ uses, promote it to a proper namespace. Promoted tools get cleaner command paths and are easier to reference in workflows.
- **Re-review periodically.** Tool dependencies change. A green verdict today might be yellow in six months. Run `review` quarterly on installed tools.
- **Use the catalog as your tool inventory.** `scout:catalog` is the single source of truth for what external tools you've evaluated, installed, and used.

## Related Namespaces

- **[Setup](/commands/setup)** -- Configure the Notion workspace and verify tool connections
- **[Intel](/commands/intel)** -- The intelligence engine learns from your scout discovery patterns
- **[Memory](/commands/memory)** -- Scout caches discovered tool knowledge in the memory engine
