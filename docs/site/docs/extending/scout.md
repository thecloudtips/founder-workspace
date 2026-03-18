# Scout: Discovering New Capabilities

## Overview

Scout is Founder OS's capability discovery system. When you need something that the built-in namespaces do not cover -- parsing PDFs, transcribing audio, sending Slack notifications through an MCP server -- Scout finds it, reviews it for security, installs it into a sandbox, and optionally promotes it to a native namespace.

Scout is not a package manager. It is a discovery-and-integration pipeline that combines web search, a local catalog of previously discovered tools, and a security review process to bring external capabilities into your Founder OS environment safely.

---

## How Scout Differs from the Command Reference

The [command reference for Scout](/commands/scout) lists each command's flags and arguments. This page focuses on the *workflow* -- how the pieces fit together, when to use each command, and what a full discovery-to-integration cycle looks like from start to finish.

---

## The Discovery Pipeline

Scout follows a four-stage pipeline: **search, review, install, promote**. You can stop at any stage. Not every discovered tool needs to be installed, and not every installed tool needs to be promoted to a native namespace.

```
find  -->  install  -->  review  -->  promote
  |           |            |            |
  v           v            v            v
Discover    Sandbox      Security    Native
candidates  + wrapper    audit       namespace
```

### Stage 1: Find

The `find` command searches for tools that solve a problem you describe in natural language.

```
/founder-os:scout:find "parse PDFs into markdown"
/founder-os:scout:find "send Slack notifications" --type=mcp
/founder-os:scout:find "transcribe audio to text" --deep --budget=high
```

The search runs in three phases:

1. **Catalog and memory check** -- Searches the local catalog (`_infrastructure/scout/catalog.json`) and the Memory Engine for previously discovered tools. If a high-confidence match exists (score of 0.7 or above), it is returned immediately without hitting the web.

2. **Web search cascade** -- If no local match is found, Scout queries the web using templates tuned for different source types (GitHub repositories, npm packages, MCP servers, Claude plugins). The `--budget` flag controls search depth: `low` runs 5 queries, `medium` (default) runs 10, and `high` runs 20.

3. **Scoring and ranking** -- Each candidate is scored on five factors: relevance to your problem, integration effort, community health, security posture, and recency. The top 3 results are presented with relevance scores and a suggested install command.

**Restricting by type** narrows the search to a specific source tier:

```
/founder-os:scout:find "validate JSON schemas" --type=package --budget=low
```

**Deep mode** (`--deep`) spawns a multi-agent research team for exhaustive discovery across multiple sources simultaneously.

The output gives you everything you need to decide whether to proceed:

```
-- Scout Discovery: parse PDFs into markdown -----
Source: web    Budget: medium

#1  pdf-to-markdown
    Type:        package
    URL:         https://github.com/example/pdf-to-markdown
    Relevance:   92/100
    Effort:      low
    Description: Converts PDF documents to clean markdown with table support
    Next step:   /founder-os:scout:install https://github.com/example/pdf-to-markdown

#2  ...
```

### Stage 2: Install

The `install` command downloads a tool into a sandboxed directory, runs a security review, generates a wrapper command, and registers the tool in the local catalog.

```
/founder-os:scout:install https://github.com/example/pdf-to-markdown
```

Installation follows four phases:

1. **Download** -- Fetches the tool's files into `_infrastructure/scout/sandbox/<tool-id>/_downloaded/`. No downloaded file is executed.

2. **Security review** -- A security auditor agent runs a six-point checklist against all downloaded files:
   - Prompt injection (embedded instructions that could manipulate the AI)
   - Secret exfiltration (attempts to read or transmit credentials)
   - Overly broad tool permissions
   - Data leakage (sending user data to external services)
   - Supply chain risk (untrusted dependencies)
   - Permission escalation

   The review produces a verdict: **GREEN** (clean), **YELLOW** (caution -- review notes provided), or **RED** (blocked -- explicit confirmation required before proceeding). You can skip the review with `--skip-review`, but the tool is flagged as "unreviewed" in the catalog.

3. **Wrapper generation** -- Creates a wrapper command file at `commands/scout/<tool-name>.md` with proper frontmatter and a scout metadata comment block. This makes the tool immediately usable as `/founder-os:scout:<tool-name>`.

4. **Catalog registration** -- Appends the tool to `_infrastructure/scout/catalog.json` with its ID, source URL, security verdict, install status, and usage tracking fields.

You can pre-set a target namespace for future promotion:

```
/founder-os:scout:install https://github.com/example/pdf-to-markdown --namespace=report
```

### Stage 3: Review (Re-review)

The `review` command re-runs the security scan on an already-installed tool. This is useful when a tool has been updated, when you skipped the initial review, or when you want a fresh assessment before promoting to a native namespace.

```
/founder-os:scout:review pdf-to-markdown
```

The review produces the same six-point audit and compares the new verdict against the previous one:

```
Verdict Change
Previous: [YELLOW] -- reviewed 2026-02-15
Current:  [GREEN]  -- reviewed 2026-03-10

Changed findings:
- supply_chain: medium -> low (dependency updated to maintained fork)
```

### Stage 4: Promote

The `promote` command moves an installed tool from the scout sandbox into a native Founder OS namespace, making it a first-class citizen alongside built-in commands.

```
/founder-os:scout:promote pdf-to-markdown --to=report
```

Promotion does four things:

1. **Moves the wrapper command** from `commands/scout/<tool>.md` to `commands/<namespace>/<command>.md` and updates the command heading and description
2. **Updates the catalog** -- Sets the install status to "promoted" and records the target namespace
3. **Updates workflow references** -- Scans all workflow YAML files for references to the old `scout:<tool>` command and updates them to the new `<namespace>:<command>` path
4. **Offers skill scaffolding** -- If no domain skill exists for the promoted tool, asks whether you want to create a skeleton `SKILL.md` in the target namespace

After promotion, the tool is invoked with its new namespace path:

```
/founder-os:report:pdf-to-markdown [arguments]
```

---

## Source Management

Scout searches multiple source registries when looking for tools. The `sources` command lets you view, add, remove, and reorder these registries.

### Viewing Sources

```
/founder-os:scout:sources
```

Output:

```
-- Scout Search Sources -----
3 sources configured

Priority  ID              Type               URL
--------  --------------  -----------------  ------------------------------------
10        github          repository         https://github.com
20        npmjs           package-registry   https://registry.npmjs.org
30        mcp-registry    mcp-registry       https://modelcontextprotocol.io
```

### Adding a Source

```
/founder-os:scout:sources --add=https://pypi.org
```

Scout auto-detects the source type from the URL (npm, PyPI, GitHub, MCP registry, or custom). New sources are appended at the lowest priority.

### Removing a Source

```
/founder-os:scout:sources --remove=custom-source-1
```

### Reordering Sources

```
/founder-os:scout:sources --reorder
```

This presents a numbered list and prompts you to enter the new order as comma-separated IDs. Sources searched first (lower priority number) are queried before those searched later.

---

## Browsing the Catalog

The `catalog` command gives you a browsable view of every tool Scout has discovered or installed:

```
/founder-os:scout:catalog
```

Filter by verdict, type, or installation status:

```
/founder-os:scout:catalog --verdict=green
/founder-os:scout:catalog --type=mcp --installed
/founder-os:scout:catalog "pdf"
```

The output includes each tool's ID, name, type, security verdict, install status, last used date, and usage count.

---

## Removing a Tool

The `remove` command cleans up a scouted tool by deleting its wrapper command, sandbox directory, catalog entry, and Memory Engine record:

```
/founder-os:scout:remove pdf-to-markdown
```

Before deletion, Scout shows you a complete artifact inventory and checks for workflow references that would break. You must confirm before anything is deleted.

To keep the catalog entry for auditing while removing everything else:

```
/founder-os:scout:remove pdf-to-markdown --keep-catalog
```

This sets the catalog entry's status to "removed" so you can reference it later or reinstall.

---

## End-to-End Example: Adding PDF Parsing

Here is the full lifecycle of discovering, installing, reviewing, and promoting a PDF parsing capability.

**1. Discover what is available:**

```
/founder-os:scout:find "parse PDFs into clean markdown with tables"
```

Scout searches the local catalog, finds no matches, runs a web search cascade, and returns three ranked results. The top result, `pdf-to-markdown`, scores 92/100 for relevance with low integration effort.

**2. Install the top result:**

```
/founder-os:scout:install https://github.com/example/pdf-to-markdown
```

Scout downloads the tool into the sandbox, runs a security audit (verdict: GREEN), generates a wrapper command at `commands/scout/pdf-to-markdown.md`, and registers it in the catalog. You can now use it as `/founder-os:scout:pdf-to-markdown`.

**3. Test it out:**

```
/founder-os:scout:pdf-to-markdown quarterly-report.pdf
```

Run it a few times to confirm it works for your use case. Scout tracks usage count and last-used date in the catalog.

**4. Review security before promotion:**

```
/founder-os:scout:review pdf-to-markdown
```

The six-point audit comes back GREEN. No findings.

**5. Promote to the report namespace:**

```
/founder-os:scout:promote pdf-to-markdown --to=report
```

The wrapper moves from `commands/scout/` to `commands/report/`. Any workflows referencing `/founder-os:scout:pdf-to-markdown` are updated to `/founder-os:report:pdf-to-markdown`. Scout offers to scaffold a domain skill at `skills/report/pdf-to-markdown/SKILL.md`.

**6. Use it as a native command:**

```
/founder-os:report:pdf-to-markdown quarterly-report.pdf
```

The tool is now a permanent part of the report namespace, indistinguishable from built-in commands to the user.

---

## Scout Command Reference

| Command | Purpose |
|---------|---------|
| `/founder-os:scout:find` | Discover tools that solve a problem |
| `/founder-os:scout:install` | Download, review, and register a tool |
| `/founder-os:scout:catalog` | Browse discovered and installed tools |
| `/founder-os:scout:review` | Re-run security audit on an installed tool |
| `/founder-os:scout:promote` | Move a tool into a native namespace |
| `/founder-os:scout:remove` | Delete a tool and its artifacts |
| `/founder-os:scout:sources` | Manage search source registries |

For full flag and argument details for each command, see the [Scout command reference](/commands/scout).
