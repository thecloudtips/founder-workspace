---
description: Set up Notion CLI integration — install dependencies, configure API token, and verify access
argument-hint: ""
allowed-tools: ["Bash", "Read"]
execution-mode: foreground
result-format: full
---

# /founder-os:setup:notion-cli

Guided setup wizard for configuring the Notion CLI integration. Walks through dependency installation, API token configuration, workspace sharing, and access verification.

## Preflight Check
Read the preflight skill at `${CLAUDE_PLUGIN_ROOT}/_infrastructure/preflight/SKILL.md`.
Run the preflight check for the `setup` namespace.
If the check returns `blocked`, stop execution and display the fix instructions.
If the check returns `degraded`, note which optional sources are unavailable and adjust later steps accordingly.

## Usage

```
/founder-os:setup:notion-cli
```

## Instructions

Work through each step in order. Skip steps where the condition is already satisfied.

### 1. Install Dependencies

Check if `${CLAUDE_PLUGIN_ROOT}/scripts/node_modules/` exists. If not, run:

```bash
npm install --prefix ${CLAUDE_PLUGIN_ROOT}/scripts
```

If Node.js is not available, stop and explain that Node.js (v18+) is required. Provide a link to https://nodejs.org/ for installation.

If `npm install` fails, show the error and suggest manual steps:
- Check that `${CLAUDE_PLUGIN_ROOT}/scripts/package.json` exists
- Try running `npm install` from the `scripts/` directory directly
- Check network connectivity

### 2. Check Environment Variable

Check if the `$NOTION_API_KEY` environment variable is set (non-empty). If yes, skip to step 8.

### 3. Check .env File

Check if `${CLAUDE_PLUGIN_ROOT}/.env` exists and contains a `NOTION_API_KEY=` line with a non-empty value. If yes, skip to step 8.

### 4. Create Notion Integration

Tell the user:

> To connect Founder OS to your Notion workspace, you need a Notion integration.
>
> 1. Open your browser and go to: **https://www.notion.so/profile/integrations**
> 2. Click **"New integration"**

### 5. Configure the Integration

Tell the user:

> 3. Name the integration **"Founder OS"**
> 4. Select your workspace from the dropdown
> 5. Under **Capabilities**, ensure all content capabilities are enabled (Read, Update, Insert)
> 6. Click **Save**

### 6. Copy the Token

Tell the user:

> 7. On the integration page, find the **"Internal Integration Secret"** section
> 8. Click **"Show"** then **"Copy"** to copy the token (it starts with `ntn_` or `secret_`)

### 7. Store the Token

Ask the user to paste their Notion API token. Once they provide it:

- If `${CLAUDE_PLUGIN_ROOT}/.env` does not exist, create it with `NOTION_API_KEY=<token>`.
- If `.env` exists but does not contain `NOTION_API_KEY`, append `NOTION_API_KEY=<token>` on a new line.
- If `.env` exists and already contains `NOTION_API_KEY`, replace the existing value.

Do not overwrite other variables in the file.

### 8. Share Workspace with Integration

Tell the user:

> Almost done! You need to share your Notion pages with the integration:
>
> 1. Open your **"Founder OS"** or **"Founder OS HQ"** root page in Notion
> 2. Click the **"..."** menu in the top-right corner
> 3. Click **"Connections"** then **"Connect to"**
> 4. Search for **"Founder OS"** and select your integration
> 5. Confirm access
>
> **Tip:** Sharing a parent page automatically grants the integration access to all child pages and databases beneath it. You only need to share the root page.

### 9. Verify Access

Run the following command to verify the integration can access Notion:

```bash
node ${CLAUDE_PLUGIN_ROOT}/scripts/notion-tool.mjs search "Founder OS"
```

Check the exit code. If the command exits with a non-zero code, go to step 10 failure path.

### 10. Report Results

**If successful:**

- Parse the search results to list all discovered databases.
- Count the databases found and compare against the expected 22 HQ databases.
- Report the result:

```
Notion CLI Setup Complete
=========================

Token:      Configured
Access:     Verified
Databases:  X/22 discovered

Discovered databases:
  - [FOS] Companies
  - [FOS] Tasks
  ...

Next step: Run /founder-os:setup:notion-hq to create any missing databases.
```

**If failed:**

- Show the error message from the command output.
- Suggest troubleshooting steps:
  1. Verify the API token is correct (starts with `ntn_` or `secret_`)
  2. Confirm the integration was shared with the correct Notion page
  3. Check that the integration has Read, Update, and Insert capabilities enabled
  4. Try regenerating the token at https://www.notion.so/profile/integrations
  5. Run `/founder-os:setup:verify` for a full health check
