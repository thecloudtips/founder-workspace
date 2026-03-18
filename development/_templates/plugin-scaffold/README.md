# founder-os-{{plugin-name}}

> **Plugin #{{plugin-number}}** -- {{plugin-description}}

Part of the [Founder OS](https://github.com/founderOS) plugin ecosystem.

| Detail | Value |
|--------|-------|
| **Pillar** | {{pillar}} |
| **Platform** | {{platform}} |
| **Type** | {{plugin-type}} |
| **Difficulty** | {{difficulty}} |
| **Week** | {{release-week}} |

## What It Does

{{plugin-overview}}

## Requirements

### MCP Servers

{{#each mcp-servers}}
- **{{server-name}}** -- {{server-purpose}}
{{/each}}

### Platform

- **Claude Code**

## Quick Start

See [QUICKSTART.md](QUICKSTART.md) for usage examples.

## Installation

See [INSTALL.md](INSTALL.md) for full setup instructions.

## Commands

| Command | Description |
|---------|-------------|
{{#each commands}}
| `/{{namespace}}:{{action}}` | {{description}} |
{{/each}}

## Skills

{{#each skills}}
- **{{skill-name}}**: {{skill-description}}
{{/each}}

## Agent Teams

{{#if agent-teams}}
This plugin uses a **{{pattern-type}}** Agent Team pattern with {{agent-count}} agents.
See `teams/` for agent definitions and configuration.
{{else}}
This plugin does not use Agent Teams.
{{/if}}

## Dependencies

{{#if dependencies}}
{{#each dependencies}}
- **#{{plugin-number}} {{plugin-name}}**: {{relationship}}
{{/each}}
{{else}}
This plugin has no dependencies on other Founder OS plugins.
{{/if}}

## Blog Post

**Week {{release-week}}**: "{{blog-title}}"

{{blog-angle}}

## License

MIT
