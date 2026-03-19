# Command Reference

Founder OS organizes its 95+ slash commands into 35 namespaces. Each namespace is a self-contained capability area -- email triage, meeting prep, report generation, CRM sync, and more. Every command follows the pattern `/founder-os:<namespace>:<action>`.

---

## How Commands Work

When you type a command, Founder OS runs a preflight check to verify required tools are available, loads your business context and relevant memories, then executes the command. By default, 92 of the 95+ commands run as background subagents -- your main Claude Code session stays free while the work happens. Three interactive commands (setup wizards) run in the foreground.

You can override execution mode on any command:

- `--foreground` -- Force inline execution in your current session
- `--background` -- Force background delegation
- `--team` -- Activate the multi-agent pipeline (available on namespaces with agent teams)
- `--schedule "expression"` -- Set up recurring execution via the workflow automator

---

## The Four Pillars

Founder OS commands are organized around four pillars that map to a founder's workday.

### Pillar 1: Daily Work

Commands that handle your inbox, calendar, meetings, and recurring check-ins.

### Pillar 2: Code Without Coding

Generate reports, process invoices, draft proposals, write newsletters, and create content -- all from natural language commands.

### Pillar 3: Integrations

Connect Notion, Google Drive, Slack, and your CRM into a unified data layer that every other command can draw from.

### Pillar 4: Meta & Growth

Track ROI, manage prompts, build workflows, log learnings, and extend the system with new capabilities.

---

## All 35 Namespaces

| Namespace | Description | Pillar |
|-----------|-------------|--------|
| [inbox](./inbox.md) | AI-powered email triage, categorization, and draft management for Gmail | Daily Work |
| [briefing](./briefing.md) | Generate a structured daily briefing from your calendar, email, tasks, and Slack | Daily Work |
| [prep](./prep.md) | Deep meeting preparation with attendee profiles, open items, and talking points | Daily Work |
| [actions](./actions.md) | Extract structured action items from text or files and create Notion tasks | Daily Work |
| [review](./review.md) | Generate a structured weekly review from tasks, meetings, and email activity | Daily Work |
| [followup](./followup.md) | Scan sent email, detect promises, score urgency, and nudge at the right time | Daily Work |
| [meeting](./meeting.md) | Turn meeting transcripts into structured intelligence with decisions and follow-ups | Daily Work |
| [morning](./morning.md) | Cross-source morning briefing synthesizing Gmail, Calendar, Notion, Slack, and Drive | Daily Work |
| [report](./report.md) | Transform raw data into polished, executive-ready reports with AI analysis and charts | Code Without Coding |
| [health](./health.md) | Score every client relationship on a 0-100 scale using five weighted metrics | Code Without Coding |
| [invoice](./invoice.md) | Process invoices from files or email with OCR, validation, and Notion recording | Code Without Coding |
| [proposal](./proposal.md) | Generate client proposals from briefs with pricing, timeline, and deliverables | Code Without Coding |
| [contract](./contract.md) | Analyze and compare contracts with clause extraction and risk flagging | Code Without Coding |
| [sow](./sow.md) | Generate three-option Statements of Work from project briefs | Code Without Coding |
| [compete](./compete.md) | Research competitors via live web search and produce comparison matrices | Code Without Coding |
| [expense](./expense.md) | Summarize spending or generate comprehensive expense reports with tax analysis | Code Without Coding |
| [newsletter](./newsletter.md) | Research topics and produce publication-ready newsletter drafts with source attribution | Code Without Coding |
| [social](./social.md) | Multi-platform social publishing with templates, scheduling, and A/B testing | Code Without Coding |
| [ideate](./ideate.md) | Content ideation engine for drafts, outlines, variations, and research briefs | Code Without Coding |
| [kb](./kb.md) | Search, query, and index company knowledge across Notion and Drive with sourced answers | Code Without Coding |
| [notion](./notion.md) | Create, query, update, and template Notion databases and pages directly | Integrations |
| [drive](./drive.md) | Search, summarize, organize, and ask questions across Google Drive files | Integrations |
| [slack](./slack.md) | Digest Slack activity into structured summaries with priority ranking | Integrations |
| [client](./client.md) | Load a complete client dossier from CRM, email, calendar, documents, and notes | Integrations |
| [crm](./crm.md) | Sync emails and meetings to your Notion CRM, and pull client context on demand | Integrations |
| [savings](./savings.md) | Track time savings and ROI across all Founder OS commands | Meta & Growth |
| [prompt](./prompt.md) | Store, optimize, and reuse your best prompts with built-in quality scoring | Meta & Growth |
| [workflow](./workflow.md) | Create, edit, schedule, and run multi-step command workflows | Meta & Growth |
| [workflow-doc](./workflow-doc.md) | Turn process descriptions into structured SOPs with Mermaid flowcharts | Meta & Growth |
| [learn](./learn.md) | Build a searchable knowledge base of daily insights with auto-tagging and weekly synthesis | Meta & Growth |
| [goal](./goal.md) | Track business goals with milestones, RAG status, velocity projections, and Gantt timelines | Meta & Growth |
| [memory](./memory.md) | View, teach, forget, and sync the cross-namespace memory engine | Meta & Growth |
| [intel](./intel.md) | Monitor and control the Adaptive Intelligence Engine | Meta & Growth |
| [scout](./scout.md) | Discover, security-review, and install external tools to extend Founder OS | Meta & Growth |
| [setup](./setup.md) | Configure your installation -- connect Notion, create databases, and verify health | Meta & Growth |

---

## How to Read Command Pages

Each command page follows a consistent structure:

- **Overview** -- What the namespace does and why you would use it.
- **Required Tools** -- Which external integrations are needed (required vs. optional).
- **Commands** -- Each slash command with usage examples, example scenarios, output descriptions, and available flags.
- **Tips & Patterns** -- Practical advice for getting the most out of the namespace.
- **Related Namespaces** -- Links to commands that work well together.

---

## Common Flags

These flags work across most namespaces:

| Flag | What it does |
|------|-------------|
| `--team` | Activate the multi-agent pipeline for deeper processing (available on 10 namespaces) |
| `--foreground` | Force the command to run inline in your current session |
| `--background` | Force the command to run as a background subagent |
| `--schedule "expression"` | Set up recurring execution (supported on 10 namespaces: briefing, review, followup, health, drive, slack, crm, morning, learn, social) |
