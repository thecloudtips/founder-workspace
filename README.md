# Founder OS

### Your AI Chief of Staff, Running Inside Claude Code

Founder OS turns Claude Code into a unified business command center — handling email, meetings, clients, reports, and operations so you can focus on building your business.

**Open-source. Free. No signup required.**

```bash
npx founder-os
```

[Product Site](https://fos.naluforge.com) | [Blog](https://blog.naluforge.com) | [NaluForge](https://now.naluforge.com)

---

## What is Founder OS?

Founder OS is an AI-powered business automation plugin for Claude Code. It gives founders a single command-line interface to triage email, prepare for meetings, generate reports, manage clients, publish content, and run dozens of other workflows that typically eat hours of your week.

Instead of clicking through menus and filling out forms, you tell Claude what you need — "prep me for my 2pm with Acme Corp" or "triage my inbox and draft replies" — and it happens. 35 command namespaces, 10 agent teams, and a cross-namespace memory engine work together so every command gets smarter the more you use it.

Your data stays on your machine. Founder OS stores everything locally in SQLite databases and plain files. Your Notion workspace serves as your structured command center, but nothing leaves the tools you already control. No telemetry, no analytics, no data harvesting.

---

## Quick Start

**1. Install**

```bash
npx founder-os
```

**2. Connect your workspace**

```bash
/founder-os:setup:notion-hq
/founder-os:setup:verify
```

**3. Run your first command**

```bash
/founder-os:briefing:briefing
```

For the full setup walkthrough, see the [Getting Started Guide](docs/landing/getting-started.md).

---

## Four Pillars

### Daily Work

Tame the chaos of email, meetings, and follow-ups.

```bash
/founder-os:briefing:briefing          # Structured daily briefing from calendar, email, and tasks
/founder-os:inbox:triage               # AI-categorize and prioritize your unread email
/founder-os:followup:check             # Surface overdue follow-ups that need attention
/founder-os:morning:sync               # Pull Gmail, Calendar, Notion, Slack into one view
```

### Code Without Coding

Generate reports, invoices, proposals, and contracts — without templates or formatting headaches.

```bash
/founder-os:report:generate --data=./q1-metrics.csv   # Analysis report from data
/founder-os:invoice:batch                              # Process invoice files into Notion
/founder-os:proposal:from-brief                        # Turn a brief into a full proposal
/founder-os:contract:analyze                           # Analyze a contract for risks
```

### Integrations

Connect Gmail, Google Drive, Notion, Slack, and your CRM into a single workflow.

```bash
/founder-os:crm:sync-email             # Sync emails into your Notion CRM
/founder-os:drive:search               # Search Google Drive with natural language
/founder-os:slack:digest               # Get a summary of what you missed in Slack
/founder-os:client:brief "Acme Corp"   # Pull a client dossier from all sources
```

### Meta & Growth

Track your ROI, build reusable workflows, and capture what you learn.

```bash
/founder-os:savings:weekly             # Hours and dollars FOS saved you this week
/founder-os:workflow:create            # Build a reusable multi-step automation
/founder-os:goal:create                # Set a goal with milestones and tracking
/founder-os:learn:log                  # Capture a lesson learned for future reference
```

---

## By the Numbers

| 35 Namespaces | 120+ Commands | 10 Agent Teams | 6 Integrations |
|:---:|:---:|:---:|:---:|
| Organized by function | Ready to use | Parallel AI workers | Gmail, Drive, Notion, Slack, Filesystem, Social |

---

## Feature Highlights

### Memory Engine

Founder OS remembers how you work. Every command run trains the Memory Engine on your preferences — which clients you prioritize, how you like reports formatted, what follow-up cadence you use. Over time, it adapts automatically.

### Intelligence Engine

The Intelligence Engine learns from your corrections. When you adjust an output, it logs the pattern and applies it next time. It also includes self-healing: if a data source is temporarily unavailable, Founder OS automatically retries or switches to a fallback path.

### Agent Teams

Complex tasks like daily briefings use specialized agent teams. Multiple agents work in parallel — one fetches your calendar, another scans email, a third checks Notion tasks — and a lead agent merges the results. Activate teams with the `--team` flag.

### Scout Discovery

Scout finds new tools and MCP servers that can extend your setup. Search for integrations, browse what is available, and install with a single command. Think of it as an app store for your AI workspace.

### Workflow Automation

Chain any combination of commands into a repeatable workflow. Build it once, schedule it to run on a timer. A morning routine might chain `morning:sync`, `inbox:triage`, and `briefing:briefing` into a single command that runs every weekday.

---

## Documentation

- [Getting Started Guide](docs/landing/getting-started.md) — Install and run your first commands
- [Command Reference](docs/commands/index.md) — All 35 namespaces and 120+ commands
- [Agent Teams](docs/agents/index.md) — Multi-agent patterns and team configurations
- [Architecture Deep Dives](docs/deep-dives/memory-engine.md) — Memory Engine, Intelligence Engine, Dispatcher, Hooks
- [Extending Founder OS](docs/extending/custom-namespaces.md) — Custom namespaces, workflows, and Scout

---

## Links

- [fos.naluforge.com](https://fos.naluforge.com) — Product site and documentation
- [blog.naluforge.com](https://blog.naluforge.com) — Tutorials, insights, and updates
- [now.naluforge.com](https://now.naluforge.com) — NaluForge — AI Automation, Subscribed

---

## Contributing

Contributions are welcome! Whether it is a bug fix, new command, documentation improvement, or feature suggestion — we appreciate your help.

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, coding standards, and the PR process.

---

## License

[MIT](LICENSE) — Copyright (c) 2026 NaluForge / Founder OS
