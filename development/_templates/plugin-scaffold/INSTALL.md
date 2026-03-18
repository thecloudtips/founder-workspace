# Installation Guide: founder-os-{{plugin-name}}

> {{plugin-description}}

## Prerequisites

- [ ] Claude Code installed
- [ ] Node.js 18+ installed
- [ ] npx available in your PATH

### MCP Servers Required

{{#each mcp-servers}}
- [ ] **{{server-name}}** -- {{server-purpose}}
{{/each}}

_Refer to the [MCP Server Setup](#mcp-server-setup) section below for configuration details._

## Installation

1. **Copy the plugin folder** into your Claude Code plugins directory:

   ```bash
   cp -r founder-os-{{plugin-name}} ~/path-to-plugins/
   ```

2. **Configure MCP servers** (see next section).

3. **Verify installation** (see [Verification](#verification) section).

## MCP Server Setup

Edit the `.mcp.json` file in the plugin root to enable and configure the required MCP servers.

### Notion

```json
{
  "notion": {
    "command": "npx",
    "args": ["-y", "@notionhq/notion-mcp-server"],
    "env": {
      "NOTION_API_KEY": "your-notion-api-key"
    }
  }
}
```

**Setup steps:**
1. Go to https://www.notion.so/my-integrations
2. Create a new integration
3. Copy the API key
4. Share your target databases with the integration

### Gmail

```json
{
  "gmail": {
    "command": "npx",
    "args": ["-y", "@anthropic/gmail-mcp-server"],
    "env": {
      "GMAIL_CREDENTIALS_PATH": "/path/to/credentials.json"
    }
  }
}
```

**Setup steps:**
1. Create a Google Cloud project
2. Enable the Gmail API
3. Download OAuth credentials JSON
4. Set the path in your `.mcp.json`

### Google Calendar

```json
{
  "google-calendar": {
    "command": "npx",
    "args": ["-y", "@anthropic/google-calendar-mcp-server"],
    "env": {
      "GOOGLE_CREDENTIALS_PATH": "/path/to/credentials.json"
    }
  }
}
```

### Filesystem

```json
{
  "filesystem": {
    "command": "npx",
    "args": ["-y", "@anthropic/filesystem-mcp-server", "/path/to/allowed/directory"]
  }
}
```

### Google Drive

```json
{
  "google-drive": {
    "command": "npx",
    "args": ["-y", "@anthropic/google-drive-mcp-server"],
    "env": {
      "GOOGLE_CREDENTIALS_PATH": "/path/to/credentials.json"
    }
  }
}
```

### Slack

```json
{
  "slack": {
    "command": "npx",
    "args": ["-y", "@anthropic/slack-mcp-server"],
    "env": {
      "SLACK_BOT_TOKEN": "xoxb-your-slack-bot-token"
    }
  }
}
```

### Web Search

```json
{
  "web-search": {
    "command": "npx",
    "args": ["-y", "@anthropic/web-search-mcp-server"]
  }
}
```

## Configuration

After enabling MCP servers, update any plugin-specific settings:

1. Open `.mcp.json` and enable only the servers listed in [Prerequisites](#prerequisites)
2. Remove the underscore prefix from each required server key (e.g., `_notion` becomes `notion`)
3. Replace all `{{placeholder}}` values with your actual credentials and paths
4. Remove any unused server entries

## Verification

Run the following commands to verify your installation:

```
/{{namespace}}:help
```

Expected result: The plugin should respond with a list of available commands and a brief description.

If you encounter errors:
1. Check that all required MCP servers are running
2. Verify API keys and credentials are correct
3. Ensure the plugin folder is in the correct location
4. Check Node.js and npx versions
