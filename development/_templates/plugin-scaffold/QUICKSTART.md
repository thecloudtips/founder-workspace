# Quick Start: founder-os-{{plugin-name}}

> {{plugin-description}}

## Overview

**Plugin #{{plugin-number}}** | **Pillar**: {{pillar}} | **Platform**: {{platform}}

{{plugin-overview}}

### What This Plugin Does

- {{capability-1}}
- {{capability-2}}
- {{capability-3}}

### Time Savings

Estimated **{{time-saved}}** per {{time-period}} compared to doing this manually.

## Available Commands

| Command | Description |
|---------|-------------|
| `/{{namespace}}:{{action-1}}` | {{action-1-description}} |
| `/{{namespace}}:{{action-2}}` | {{action-2-description}} |
| `/{{namespace}}:help` | Show available commands and usage |

## Usage Examples

### Example 1: {{example-1-title}}

```
/{{namespace}}:{{action-1}} {{example-1-args}}
```

**What happens:**
{{example-1-description}}

### Example 2: {{example-2-title}}

```
/{{namespace}}:{{action-2}} {{example-2-args}}
```

**What happens:**
{{example-2-description}}

## Tips

- {{tip-1}}
- {{tip-2}}
- {{tip-3}}

## Related Plugins

{{#if dependencies}}
This plugin connects with:
{{#each dependencies}}
- **#{{plugin-number}} {{plugin-name}}**: {{relationship-description}}
{{/each}}
{{/if}}

## Troubleshooting

| Issue | Solution |
|-------|----------|
| MCP server not responding | Check `.mcp.json` configuration and API keys |
| Command not found | Verify plugin is installed in the correct directory |
| Permission error | Ensure MCP server has access to required resources |

## Next Steps

1. Try the basic commands above
2. Explore the `skills/` folder for domain knowledge this plugin uses
3. Check `INSTALL.md` for advanced configuration options
