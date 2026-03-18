---
name: scout-common
description: "Core scout infrastructure: catalog schema, sandbox management, source configuration, and catalog lookup operations"
---

# Scout Common Infrastructure

## Catalog Schema

Each entry in `_infrastructure/scout/catalog.json` follows this structure:

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique tool identifier (kebab-case) |
| keywords | string[] | Search terms for catalog lookup |
| source_type | enum | "skill" \| "mcp" \| "github_repo" \| "package" |
| source_url | string | Original source URL |
| integration_type | enum | "skill_native" \| "mcp_add" \| "bash_wrapper" |
| security_verdict | enum | "green" \| "yellow" \| "red" \| "unreviewed" |
| install_status | enum | "installed" \| "removed" \| "pending" |
| command_path | string | Relative path to generated wrapper command |
| usage_count | number | Times the tool has been invoked |
| last_used | string | ISO date of last use |
| discovered | string | ISO date of discovery |
| description | string | What the tool does |

## Sandbox Layout

Downloaded tools live in isolated sandbox directories:

```
_infrastructure/scout/sandbox/<tool-id>/
  ├── _downloaded/        # Raw downloaded files (READ-ONLY after download)
  ├── _review/
  │   ├── report.json     # Structured security findings
  │   └── verdict.md      # Human-readable summary
  └── _meta.json          # Source URL, download date, version, status
```

### Cleanup Rules
- Sandbox entries for removed tools: delete entire `<tool-id>/` directory
- Sandbox entries for promoted tools: keep `_review/` for audit trail, delete `_downloaded/`
- `--keep-catalog` on remove: catalog entry stays, sandbox deleted

## Source Configuration

Sources are defined in `_infrastructure/scout/sources.json`. Priority 1 = searched first.

### Adding Custom Sources
Append to the `custom_sources` array:
```json
{
  "id": "my-source",
  "priority": 5,
  "type": "repo",
  "label": "My Custom Source",
  "search_patterns": ["site:example.com"],
  "enabled": true
}
```

Custom sources are always searched after built-in sources (priority 5+).

## Catalog Lookup

Before web search, check catalog by keyword match:
1. Read `_infrastructure/scout/catalog.json`
2. For each entry, check if any `keywords` array element matches the user's query (case-insensitive substring)
3. If match found with `install_status: "installed"`: return immediately (zero token cost)
4. If match found with `install_status: "removed"`: mention it was previously removed, continue search

## Generating Tool IDs

Tool IDs are kebab-case, derived from the tool name:
- `remotion-video-skill` (from "Remotion Video")
- `mcp-server-github` (from "@modelcontextprotocol/server-github")
- Strip org prefixes (@org/), version suffixes, file extensions
