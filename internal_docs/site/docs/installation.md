# Installation & Configuration

This guide covers everything you need to install, configure, and verify a complete Founder OS environment. For a quicker walkthrough, see the [Getting Started guide](../landing/getting-started.md).

---

## Prerequisites

| Requirement | Minimum Version | Why You Need It |
|---|---|---|
| **Claude Code** | Latest | Founder OS runs as a Claude Code plugin |
| **Node.js** | 18.0+ | Powers the installer, Notion CLI, and build tooling |
| **Notion account** | Free or paid | Your business command center -- CRM, tasks, briefings, reports (used by 21+ namespaces) |
| **Gmail / Google Workspace** | Any Google account | Email triage, calendar sync, Drive access (used by 20 namespaces) |

Notion and Google Workspace are technically optional -- commands degrade gracefully when integrations are unavailable. But the majority of Founder OS functionality depends on at least one of them, and the full experience requires both.

---

## Step-by-Step Installation

### 1. Run the Installer

Open a terminal in any project where you use Claude Code:

```bash
npx founder-os@latest --init
```

The installer creates two directories:

- **`.founderOS/`** -- Local runtime state: configuration, databases, auth tokens, and context files. Automatically gitignored.
- **`.claude/`** -- Commands, skills, and agent definitions that Claude Code discovers automatically. This is where the 35 namespaces and 95+ slash commands live.

It also creates `.env` and `.env.example` files for API keys, updates your `.gitignore`, and writes a `CLAUDE.md` with project instructions.

### 2. What Gets Created

```
your-project/
  .founderOS/
    config/          # Plugin configuration
    context/         # Business context files
    auth/            # OAuth tokens (gitignored)
    db/              # Local SQLite databases (gitignored)
  .claude/
    commands/        # 35 namespace directories, 95+ command files
    skills/          # Domain knowledge per namespace
    agents/          # Agent team definitions (10 teams)
    settings.json    # Claude Code plugin settings
  .env               # API keys (gitignored)
  .env.example       # Template showing required variables
```

---

## Configuration

### Environment Variables

Your `.env` file holds API keys. At minimum, set the Notion API key:

```bash
# Required for 21+ namespaces (CRM, tasks, briefings, reports)
NOTION_API_KEY=ntn_your_token_here
```

### Notion API Key Setup

The fastest way to configure Notion is through the guided setup wizard:

```
/founder-os:setup:notion-cli
```

This interactive command walks you through:

1. Checking Node.js and installing npm dependencies
2. Creating a Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
3. Storing the API token securely in your `.env` file
4. Sharing your Notion workspace with the integration
5. Verifying access by searching for existing databases

If you prefer manual setup:

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click "New integration" and name it "Founder OS"
3. Select your workspace and create the integration
4. Copy the "Internal Integration Secret" (starts with `ntn_`)
5. Add it to your `.env` file as `NOTION_API_KEY=ntn_your_token_here`
6. In Notion, share each database you want Founder OS to access with your integration

### Notion HQ Databases

Founder OS works best with its 22 interconnected Notion databases -- your CRM, task tracker, briefing archive, report library, and more. Create them all in one step:

```
/founder-os:setup:notion-hq
```

This command reads the HQ manifest, creates each database with the correct schema, wires up cross-database relations (Tasks relate to Companies, Finance relates to Companies, etc.), and creates a Command Center dashboard page. All databases are prefixed with `[FOS]` for easy identification. The process takes 2-3 minutes due to Notion API rate limits.

The 22 databases are organized into 5 sections:

- **CRM**: Companies, Contacts, Deals, Communications
- **Operations**: Tasks, Meetings, Finance
- **Intelligence**: Briefings, Knowledge Base, Research, Reports
- **Content & Deliverables**: Content, Deliverables, Prompts
- **Growth & Meta**: Goals, Milestones, Learnings, Weekly Insights, Workflows, Activity Log, Memory

### Google Workspace Authentication

Founder OS uses the `gws` CLI for Gmail, Calendar, and Drive access. Authenticate once and it works across all 20 namespaces that use Google data:

```bash
gws auth login
```

This opens your browser for Google sign-in. Approve access to Gmail, Calendar, and Drive. The token persists across sessions.

Verify the connection:

```bash
gws auth status
```

### Business Context

Personalize Founder OS so it knows your company, clients, and priorities:

```
/founder-os:setup:verify
```

The verify command runs health checks across your entire installation -- Notion connectivity, Google authentication, plugin commands, MCP configuration, and workspace directories. It produces a table showing pass/fail status for each check with specific fix instructions for anything misconfigured.

For business context personalization, run the context setup interview:

```
/context:setup
```

This guided command asks about your business, strategy, and current focus areas. It saves context files that every command reads at startup, so results are tailored to your situation -- emails from known clients get higher priority, reports use your terminology, and recommendations align with your strategy.

---

## Verifying the Installation

Run the full verification suite:

```
/founder-os:setup:verify
```

You should see a table of checks, each showing pass or fail:

- Notion API connectivity
- Google Workspace authentication (gws CLI)
- Plugin file integrity (commands, skills, agents)
- MCP server configuration
- Workspace directory structure
- Environment variable presence

If any check fails, the output includes specific fix instructions. Common issues:

- **NOTION_API_KEY not set** -- Add it to `.env` and restart Claude Code
- **gws CLI not authenticated** -- Run `gws auth login`
- **Plugin files missing** -- Run `npx founder-os@latest --init --force` to repair (creates `.bak` backups of modified files)

---

## Upgrading

To upgrade to the latest version, run the installer again in your project directory:

```bash
npx founder-os@latest --init
```

The installer detects your existing installation and upgrades to the latest version. Modified files are backed up automatically with `.bak` extensions before being replaced. Your `.env` file, business context, and local databases are preserved.

---

## Uninstalling

To remove Founder OS from a project:

1. Delete the `.founderOS/` directory (local runtime state)
2. Delete the Founder OS entries from `.claude/` (commands, skills, agents)
3. Remove the `NOTION_API_KEY` line from your `.env` file
4. Optionally, revoke the Notion integration at [notion.so/my-integrations](https://www.notion.so/my-integrations)
5. Optionally, revoke Google access via `gws auth logout`

The Notion HQ databases remain in your Notion workspace and are not affected by uninstallation. You can continue to use them independently or delete them manually.
