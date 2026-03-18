---
name: preflight-fix-messages
description: Copy-pasteable fix instructions for each dependency type, used by the preflight skill when a dependency check fails
---

# Preflight Fix Messages

Reference file for the preflight dependency check skill. Each dependency type has a **required** variant (halts execution) and an **optional** variant (warns and continues).

---

## notion

**Required:**
```
✘ Required: Notion CLI not configured. This command stores results in your Notion workspace.
  To fix:
    1. Get an API key: https://www.notion.so/my-integrations
    2. Add to your shell profile: export NOTION_API_KEY="your-key-here"
    3. Restart your terminal, then restart Claude Code
    4. Or run /founder-os:setup:notion-cli for guided setup
```

**Optional:**
```
⚠ Optional: Notion not configured — skipping Notion save. Results will be displayed but not persisted.
  To enable:
    1. Get an API key: https://www.notion.so/my-integrations
    2. Add to your shell profile: export NOTION_API_KEY="your-key-here"
    3. Restart your terminal, then restart Claude Code
    4. Or run /founder-os:setup:notion-cli for guided setup
```

---

## gws:gmail

**Required:**
```
✘ Required: gws CLI not found (or not authenticated). This command accesses your Gmail data.
  To fix:
    1. Install gws: See gws documentation for installation
    2. Authenticate: gws auth login
    3. Verify: gws gmail +triage --max 1 --format json
```

**Optional:**
```
⚠ Optional: Gmail not available — skipping email data.
  To enable:
    1. Install gws: See gws documentation for installation
    2. Authenticate: gws auth login
    3. Verify: gws gmail +triage --max 1 --format json
```

---

## gws:calendar

**Required:**
```
✘ Required: gws CLI not found (or not authenticated). This command accesses your Google Calendar data.
  To fix:
    1. Install gws: See gws documentation for installation
    2. Authenticate: gws auth login
    3. Verify: gws calendar +today --format json
```

**Optional:**
```
⚠ Optional: Calendar not available — skipping calendar data.
  To enable:
    1. Install gws: See gws documentation for installation
    2. Authenticate: gws auth login
    3. Verify: gws calendar +today --format json
```

---

## gws:drive

**Required:**
```
✘ Required: gws CLI not found (or not authenticated). This command accesses your Google Drive data.
  To fix:
    1. Install gws: See gws documentation for installation
    2. Authenticate: gws auth login
    3. Verify: gws drive search "test" --max 1 --format json
```

**Optional:**
```
⚠ Optional: Drive not available — skipping document search.
  To enable:
    1. Install gws: See gws documentation for installation
    2. Authenticate: gws auth login
    3. Verify: gws drive search "test" --max 1 --format json
```

---

## filesystem

**Required:**
```
✘ Required: Filesystem MCP server not connected. This command reads/writes local files.
  To fix:
    1. Add MCP server: claude mcp add filesystem -- npx @modelcontextprotocol/server-filesystem ~/your-workspace
    2. Restart Claude Code
```

**Optional:**
```
⚠ Optional: Filesystem not available — skipping local file export.
  To enable:
    1. Add MCP server: claude mcp add filesystem -- npx @modelcontextprotocol/server-filesystem ~/your-workspace
    2. Restart Claude Code
```

---

## slack

**Required:**
```
✘ Required: Slack MCP server not connected. This command reads your Slack messages.
  To fix:
    1. Get a Slack Bot token from your workspace admin
    2. Add to shell profile: export SLACK_BOT_TOKEN="xoxb-your-token"
    3. Add MCP server: claude mcp add slack -- npx @anthropic/mcp-server-slack
    4. Restart Claude Code
```

**Optional:**
```
⚠ Optional: Slack not available — skipping team activity highlights.
  To enable:
    1. Get a Slack Bot token from your workspace admin
    2. Add to shell profile: export SLACK_BOT_TOKEN="xoxb-your-token"
    3. Add MCP server: claude mcp add slack -- npx @anthropic/mcp-server-slack
    4. Restart Claude Code
```

---

## websearch

**Required:**
```
✘ Required: Web Search not available. This command searches the web for research.
  To fix:
    1. Add MCP server: claude mcp add web-search -- npx @anthropic/mcp-server-web-search
    2. Restart Claude Code
```

**Optional:**
```
⚠ Optional: Web Search not available — skipping web research, using file-based sources only.
  To enable:
    1. Add MCP server: claude mcp add web-search -- npx @anthropic/mcp-server-web-search
    2. Restart Claude Code
```

---

## late

**Required:**
```
✘ Required: Late.dev API not configured. This command publishes to social media platforms.
  To fix:
    1. Sign up at https://getlate.dev
    2. Go to Settings > API Keys > Create Key
    3. Add to your shell profile: export LATE_API_KEY="sk_your_key_here"
       Or add to your .env file (ensure chmod 600)
    4. Verify: node scripts/late-tool.mjs --diagnostic
```

**Optional:**
```
⚠ Optional: Late.dev not configured — skipping social media publishing.
  To enable:
    1. Sign up at https://getlate.dev
    2. Go to Settings > API Keys > Create Key
    3. Add to your shell profile: export LATE_API_KEY="sk_your_key_here"
       Or add to your .env file (ensure chmod 600)
    4. Verify: node scripts/late-tool.mjs --diagnostic
```
