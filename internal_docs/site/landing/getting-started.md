# Getting Started with Founder OS

Go from zero to your first AI-automated workflow in under 5 minutes. This guide walks you through installing Founder OS, running your first commands, and connecting the integrations that power the full experience.

---

## Prerequisites

Before you begin, make sure you have the following:

| Requirement | Why you need it | How to get it |
|---|---|---|
| **Claude Code** | Founder OS runs as a Claude Code plugin | [Install Claude Code](https://docs.anthropic.com/en/docs/claude-code) |
| **Node.js 18+** | Powers the installer and CLI tooling | [Download Node.js](https://nodejs.org/) |
| **Notion account** | Your business command center (CRM, tasks, briefings) | [Sign up free](https://www.notion.so/) |
| **Gmail / Google Workspace** | Email triage, calendar sync, Drive access | Any Google account works |

Notion and Google are optional for a first look, but most commands become significantly more useful with them connected. We recommend setting up both before your first real work session.

---

## Installation

Open a terminal in any project where you use Claude Code, then run:

```bash
npx founder-os@latest --init
```

You will see output like this:

```
  Founder OS v1.2.0

  ✓ Created .founderOS/
  ✓ Created .founderOS/config/
  ✓ Created .founderOS/context/
  ✓ Created .claude/ commands, skills, agents
  ✓ Registered 33 command namespaces
  ✓ Registered 7 agent teams
  ✓ Created .env.example
  ✓ Created .gitignore
  ✓ Wrote CLAUDE.md instructions
  ✓ Updated .claude/settings.json

  Done! Next steps:

    1. Set NOTION_API_KEY in your environment
    2. Run `gws auth login` for Gmail/Calendar/Drive
    3. Open Claude Code and try:
       /inbox triage    — Process your inbox
       /briefing        — Get your daily briefing
       /prep            — Prepare for meetings
```

### What just happened?

The installer created two directories in your project:

- **`.founderOS/`** -- Configuration, local databases, and auth tokens. Contains subdirectories for `config/`, `context/`, `auth/`, and `db/`. This is your local runtime state (automatically gitignored).
- **`.claude/`** -- Commands, skills, and agent definitions that Claude Code discovers automatically. This is where the 33 namespaces and 95+ slash commands live.

It also created `.env` and `.env.example` files for your API keys, and updated your `.gitignore` to keep secrets out of version control.

> **Already have Founder OS installed?** Running the same command again will detect your existing installation and upgrade it to the latest version. Modified files are backed up automatically.

---

## First 5 Commands to Try

Open Claude Code in the project where you just installed Founder OS. Type any of these commands to see it in action.

### 1. `/inbox:triage` -- See your inbox through a founder's lens

```
/inbox:triage
```

**What it does:** Pulls your unread emails from the last 24 hours, categorizes each one (action required, waiting on, FYI, newsletter, promotion), and scores them by priority using an Eisenhower matrix.

**What to expect:** A structured summary showing category counts, your top 5 most urgent emails with recommended next actions, how many emails are safe to archive, and how many need a reply. A typical run processes 50-100 emails in about 30 seconds.

> **Tip:** Add `--team` to run the full 4-agent pipeline, which also drafts replies and extracts action items into Notion.

### 2. `/morning:quick` -- Your 60-second morning check-in

```
/morning:quick
```

**What it does:** Scans all your connected sources overnight -- Gmail, Google Calendar, Notion tasks, and Slack (if connected) -- and distills everything into a single priority-ranked summary.

**What to expect:** A concise chat summary showing today's calendar, urgent emails that arrived overnight, overdue tasks, and anything that needs your attention before your first meeting. No Notion page is created -- this is designed to be fast and lightweight.

> **Tip:** Use `/morning:sync` instead if you want the full version that saves a detailed briefing page to Notion.

### 3. `/briefing:briefing` -- Your AI-generated daily briefing

```
/briefing:briefing
```

**What it does:** Generates a comprehensive daily briefing by pulling data from Google Calendar, Gmail, Notion tasks, and optionally Slack. Assembles everything into a structured Notion page with meeting prep notes, email highlights, task priorities, and team activity.

**What to expect:** A Notion page titled with today's date containing sections for your schedule, email highlights, task priorities, and a recommended focus order. The chat summary gives you the highlights; the Notion page has the full detail.

> **Tip:** Add `--team` for the parallel-gathering pipeline where dedicated agents each handle a different data source simultaneously.

### 4. `/setup:verify` -- Confirm everything is wired up

```
/setup:verify
```

**What it does:** Runs health checks across your entire Founder OS installation -- Notion connectivity, Google authentication, plugin commands, MCP configuration, and workspace directories.

**What to expect:** A table showing pass/fail status for each check. If anything is misconfigured, you get specific fix instructions. This is the fastest way to diagnose why a command is not working as expected.

### 5. `/report:generate` -- Create a business report from your data

```
/report:generate --type=weekly
```

**What it does:** Pulls activity data from your connected sources and generates a structured business report. The weekly type covers what happened this week, key metrics, completed tasks, and upcoming priorities.

**What to expect:** A formatted report saved to Notion (and displayed in chat) with sections for accomplishments, blockers, metrics, and next-week priorities. Useful for team updates, investor communication, or your own weekly review.

---

## Configuration Deep Dive

The five commands above work with minimal setup. To unlock the full power of Founder OS, connect your integrations and personalize your business context.

### Environment Variables

Your `.env` file (created during installation) holds API keys. At minimum, set these:

```bash
# Required for 21+ namespaces (CRM, tasks, briefings, reports)
NOTION_API_KEY=ntn_your_token_here
```

**How to get your Notion API key:**
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Name it "Founder OS", select your workspace
4. Copy the "Internal Integration Secret" (starts with `ntn_`)
5. Paste it into your `.env` file
6. In Notion, share each database you want Founder OS to access with your integration

### Google Workspace (Gmail, Calendar, Drive)

Founder OS uses the `gws` CLI for Google access. Authenticate once and it works across all 20 namespaces that use Google data:

```bash
gws auth login
```

This opens your browser for Google sign-in. Approve access to Gmail, Calendar, and Drive. You only need to do this once -- the token persists across sessions.

**Verify it worked:**
```bash
gws auth status
```

### MCP Server Setup

Founder OS uses MCP (Model Context Protocol) servers for Notion and filesystem access. The installer configures these automatically, but if you need to set them up manually, add this to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-notion"],
      "env": {
        "NOTION_API_KEY": "${NOTION_API_KEY}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${WORKSPACE_DIR}"]
    }
  }
}
```

### Notion HQ Setup

Founder OS works best with its 22 interconnected Notion databases -- your CRM, task tracker, briefing archive, report library, and more. Set them up in one step:

```
/setup:notion-hq
```

This creates all 22 databases in your Notion workspace with the correct schemas, relations, and naming conventions. Databases are prefixed with `[FOS]` (e.g., `[FOS] Companies`, `[FOS] Tasks`) so they are easy to find.

### Business Context

Personalize Founder OS so it knows your company, clients, and priorities. Run the guided setup:

```
/context:setup
```

This interview-style command asks about your business, strategy, and current focus areas. It saves context files that every command reads at startup, so results are tailored to your specific situation -- for example, emails from known clients get higher priority, and reports use your actual terminology.

---

## Troubleshooting

### "Preflight: Blocked" -- Missing Dependencies

Every command runs a preflight check before executing. If a required tool is missing, you will see:

```
## Preflight: Blocked

This command cannot run because required dependencies are missing:

✘ Required: Notion CLI is not configured. Set NOTION_API_KEY in your .env file.

Fix the above, then retry.
```

**Fix:** Follow the specific instructions shown. The most common causes:
- `NOTION_API_KEY` not set in `.env` -- see the Environment Variables section above
- `gws` CLI not installed -- install from the [gws documentation](https://github.com/nicholasgasior/gws)
- `gws` not authenticated -- run `gws auth login`

If a command says "degraded" instead of "blocked," that means an optional source is unavailable. The command will still run but with reduced functionality. For example, `/briefing:briefing` works without Slack connected -- you just will not see the Slack digest section.

### Notion API Key Not Working

**Symptoms:** Commands that write to Notion fail or report "Notion API: connection failed."

**Checklist:**
1. Confirm the key starts with `ntn_` (not `secret_` -- that is the old format)
2. Make sure you shared the relevant databases with your integration in Notion (click "Share" on each database, then invite your integration by name)
3. Run `/setup:verify` to see the exact HTTP error code
4. If you recently regenerated the key, update `.env` and restart Claude Code

### Gmail Authentication Issues

**Symptoms:** Email commands return empty results or error about authentication.

**Fixes:**
1. Run `gws auth status` to check if you are authenticated
2. If expired, run `gws auth login` again to refresh
3. If you see permission errors, make sure you approved Gmail, Calendar, and Drive scopes during the OAuth flow
4. Try `gws gmail list --limit=1` to confirm basic access works

### Hooks Not Loading / Commands Not Found

**Symptoms:** Typing `/founder-os:` does not show command suggestions, or commands return "not found."

**Fixes:**
1. Make sure you ran `npx founder-os@latest --init` in the correct project directory
2. Check that `.claude/commands/` exists and contains subdirectories like `inbox/`, `briefing/`, `morning/`
3. Restart Claude Code -- it reads plugin files at startup
4. Run `npx founder-os@latest --status` to check the installation state
5. If files are corrupted, run `npx founder-os@latest --init --force` to repair (creates `.bak` backups of any modified files)

### Still Stuck?

Run the full verification suite to see exactly what is working and what is not:

```
/setup:verify
```

This checks Notion connectivity, Google authentication, plugin file integrity, MCP configuration, and workspace directories. The output tells you exactly what to fix.

---

## What's Next?

Now that you are up and running, explore these areas:

- **[Command Reference](./commands.md)** -- All 95+ commands across 33 namespaces
- **[Notion HQ Guide](./notion-hq.md)** -- Deep dive into the 22-database workspace
- **[Workflow Automation](./workflows.md)** -- Chain commands together with `/workflow:create`
- **[Memory Engine](./memory.md)** -- How Founder OS learns your preferences over time

You have everything you need to start automating your founder workflows. The best way to learn is to try a few commands on your real data -- start with `/inbox:triage` and `/morning:quick` and go from there.
