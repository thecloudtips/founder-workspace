# Setup

> Configure your Founder OS installation -- connect Notion, create databases, and verify everything works.

## Overview

The Setup namespace handles the one-time configuration that makes everything else work. It walks you through connecting the Notion CLI (the backbone of Founder OS data storage), creating the full Founder OS HQ workspace with 22 interconnected databases, and running health checks to verify that all external tools and integrations are properly configured.

Most founders run these commands exactly once during initial setup, then occasionally when adding new integrations or troubleshooting connectivity issues. The commands are designed to be idempotent -- safe to re-run at any time without creating duplicates or breaking existing data.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Yes | All setup commands configure or verify Notion access |
| Node.js (v18+) | Yes | Required for Notion CLI script execution |

## Commands

### `/founder-os:setup:notion-cli`

**What it does** -- Guided setup wizard for the Notion CLI integration. Walks through dependency installation (npm packages), API token creation (with step-by-step browser instructions), token storage in your `.env` file, workspace sharing configuration, and access verification. This is the first command to run when setting up Founder OS.

**Usage:**

```
/founder-os:setup:notion-cli
```

**Example scenario:**

> You just installed Founder OS and need to connect it to your Notion workspace. You run the setup wizard, which checks for Node.js, installs npm dependencies, guides you through creating a Notion integration at notion.so/profile/integrations, stores your API token securely, walks you through sharing your workspace with the integration, and verifies access by searching for existing databases.

**What you get back:**

- Step-by-step instructions for creating a Notion integration
- Automatic dependency installation
- Token storage in `.env` file
- Access verification with database discovery count
- Next-step pointer to `setup:notion-hq`

**Flags:**

None -- this is a fully interactive wizard.

---

### `/founder-os:setup:notion-hq`

**What it does** -- Creates all 22 Founder OS HQ Notion databases programmatically, organized into 5 sections: CRM (Companies, Contacts, Deals, Communications), Operations (Tasks, Meetings, Finance), Intelligence (Briefings, Knowledge Base, Research, Reports), Content & Deliverables (Content, Deliverables, Prompts), and Growth & Meta (Goals, Milestones, Learnings, Weekly Insights, Workflows, Activity Log, Memory). Wires up cross-database relations and creates a dashboard page.

**Usage:**

```
/founder-os:setup:notion-hq
```

**Example scenario:**

> After connecting the Notion CLI, you run the HQ setup. It reads the manifest, creates each database with the correct schema and properties, wires up relations between them (e.g., Tasks relate to Companies, Finance relates to Companies), and creates a dashboard page. The whole process takes 2-3 minutes due to Notion API rate limits.

**What you get back:**

- Per-database status: Created, Already Exists, or Failed
- Cross-database relation wiring confirmation
- Dashboard page creation
- Final tally of databases created

**Flags:**

None -- reads configuration from database templates.

**Important notes:**

- **Idempotent:** Safe to run multiple times. Skips databases that already exist.
- **Partial recovery:** If interrupted, re-running creates only the missing databases.
- **Prerequisite:** Requires a configured Notion API key. Run `setup:notion-cli` first if you haven't.

---

### `/founder-os:setup:verify`

**What it does** -- Runs comprehensive health checks on the entire Founder OS installation. Verifies Notion connectivity and database coverage (22/22 expected), Google Workspace authentication (Gmail + Calendar access), plugin symlinks, MCP server configuration, and environment variables. Produces a pass/fail table covering every integration point.

**Usage:**

```
/founder-os:setup:verify
```

**Example scenario:**

> Something isn't working right with your briefing command. You run verify and get a diagnostic table showing 4/5 required checks passed -- the gws CLI authentication has expired. You re-authenticate and everything works again.

**What you get back:**

- Health check table with pass/fail status for each integration
- Notion: connectivity + database count (X/22)
- gws CLI: authentication status + Gmail/Calendar confirmation
- Plugin symlinks: count and broken link detection
- MCP configuration: filesystem server status
- Environment variables: required and optional status
- Final score: X/Y required checks passed

**Flags:**

None -- this is a fully automated diagnostic.

---

## Tips & Patterns

- **Run setup in order.** The recommended sequence is: `setup:notion-cli` (connect), then `setup:notion-hq` (create databases), then `setup:verify` (confirm everything works).
- **Re-run verify when things break.** If any Founder OS command starts failing unexpectedly, `setup:verify` is your first diagnostic tool. It checks every external dependency.
- **HQ setup is idempotent.** If you accidentally run `setup:notion-hq` twice, nothing breaks. It skips existing databases and only creates missing ones.
- **Share the root page, not individual databases.** When connecting your Notion integration, share the top-level "Founder OS" or "Founder OS HQ" page. This grants access to all child databases automatically.

## Related Namespaces

- **[Scout](/commands/scout)** -- Discover and install additional tools after initial setup
- **[Intel](/commands/intel)** -- The intelligence engine initializes automatically after your first few command runs
- **[Memory](/commands/memory)** -- The memory store initializes on first use; no manual setup required
