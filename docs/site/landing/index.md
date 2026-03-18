# Founder OS

## Your AI Chief of Staff, Running Inside Claude Code

Stop juggling tabs, tools, and to-do lists. Founder OS turns Claude Code into a command center that handles your email, meetings, clients, reports, and operations — so you can focus on building your business.

```bash
npx founder-os
```

---

## The Problem: Founders Are Drowning in Operations

You started a company to build something meaningful. Instead, you spend your days buried in busywork.

**Your inbox owns your morning.** Dozens of unread emails compete for attention, and you never know which ones actually matter until you have read them all.

**Meetings happen without context.** You walk into calls without knowing the client's history, open invoices, or last conversation — then scramble to catch up in real time.

**Your tools do not talk to each other.** CRM data lives in one place, project notes in another, emails in a third. Pulling together a client brief means opening five tabs and copy-pasting between them.

**Strategy gets squeezed out.** By the time you have triaged email, prepped for meetings, chased follow-ups, and processed invoices, the day is gone — and the big-picture work you started the company for never gets touched.

Founder OS fixes this. Not by adding another tool to your stack, but by teaching the tool you already use — Claude Code — to run your operations automatically.

---

## Four Pillars of Founder OS

### Daily Work

> *Tame the chaos of email, meetings, and follow-ups.*

Your mornings start with a briefing that pulls together everything you need to know — calendar, email highlights, open tasks, and team updates — in one view. Inbox triage categorizes and prioritizes email so you handle what matters first. Follow-up tracking makes sure nothing slips through the cracks.

**Example commands:**

```bash
/founder-os:briefing:briefing          # Get a structured daily briefing from calendar, email, and tasks
/founder-os:inbox:triage               # AI-categorize and prioritize your unread email
/founder-os:followup:check             # Surface overdue follow-ups that need your attention
/founder-os:morning:sync               # Pull Gmail, Calendar, Notion, and Slack into one morning view
```

---

### Code Without Coding

> *Generate reports, invoices, proposals, and contracts — without templates or formatting headaches.*

You describe what you need in plain language, and Founder OS produces polished, professional output. Generate business reports from raw data. Process a folder of invoice PDFs in batch. Draft proposals from a one-paragraph brief. Analyze contracts for risk before you sign.

**Example commands:**

```bash
/founder-os:report:generate --data=./q1-metrics.csv   # Generate an analysis report from your data
/founder-os:invoice:batch                              # Process a batch of invoice files into Notion
/founder-os:proposal:from-brief                        # Turn a short brief into a full client proposal
/founder-os:contract:analyze                           # Analyze a contract for risks and key terms
```

---

### Integrations

> *Connect Gmail, Google Drive, Notion, Slack, and your CRM into a single workflow.*

Founder OS sits on top of the tools you already use. It reads your email, checks your calendar, searches your Drive, syncs your CRM, and posts to Slack — all through one interface. No new accounts. No data migration. Your existing workspace becomes the backend.

**Example commands:**

```bash
/founder-os:crm:sync-email             # Sync recent emails into your Notion CRM automatically
/founder-os:drive:search               # Search Google Drive using natural language
/founder-os:slack:digest               # Get a summary of what you missed in Slack
/founder-os:client:brief "Acme Corp"   # Pull a 1-page client dossier from all connected sources
```

---

### Meta and Growth

> *Track your ROI, build reusable workflows, and capture what you learn.*

Founder OS does not just do the work — it measures the impact. Track how many hours you save each week. Build multi-step workflows that chain commands together. Log lessons learned so your business knowledge compounds over time. Set goals and track milestones.

**Example commands:**

```bash
/founder-os:savings:weekly             # See how many hours and dollars FOS saved you this week
/founder-os:workflow:create            # Build a reusable multi-step automation workflow
/founder-os:goal:create                # Set a goal with milestones and tracking
/founder-os:learn:log                  # Capture a lesson learned for future reference
```

---

## By the Numbers

| 35 Namespaces | 120+ Commands | 10 Agent Teams | 6 Integrations |
|:---:|:---:|:---:|:---:|
| Organized by function | Ready to use | Parallel AI workers | Gmail, Drive, Notion, Slack, Filesystem, Social |

---

## How It Works

| Step | What You Do | What Happens |
|------|-------------|--------------|
| **1. Install** | Run `npx founder-os` in Claude Code | The plugin installs and registers all 120+ commands |
| **2. Configure** | Run `/founder-os:setup:notion-hq` | Connect your Notion workspace, Gmail, and Calendar |
| **3. Automate** | Run any command, like `/founder-os:briefing:briefing` | AI agents gather data, process it, and deliver results — in seconds |

---

## Feature Highlights

### Memory Engine

Founder OS remembers how you work. Every time you run a command, the Memory Engine observes your preferences — which clients you prioritize, how you like reports formatted, what follow-up cadence you use. Over time, it adapts automatically. You can also teach it directly with `/founder-os:memory:teach` or review what it knows with `/founder-os:memory:show`.

### Intelligence Engine

The Intelligence Engine learns from your corrections. When you adjust an output, it logs the pattern and applies it next time — no manual configuration. It also includes self-healing: if a data source is temporarily unavailable, Founder OS automatically retries or switches to a fallback path. Run `/founder-os:intel:status` to see what it has learned.

### Background Execution

Most commands run in the background. When you kick off `/founder-os:inbox:triage`, a background agent picks it up while your main Claude session stays free. You can start a briefing, triage your inbox, and prep for a meeting all at once — each running in parallel. Results appear as they finish.

### Agent Teams

Complex tasks like daily briefings and client context pull use specialized agent teams. Instead of one AI doing everything sequentially, multiple agents work in parallel — one fetches your calendar, another scans email, a third checks Notion tasks — and a lead agent merges the results. Activate teams with the `--team` flag on supported commands.

### Scout Discovery

Scout finds new tools and MCP servers that can extend your Founder OS setup. Run `/founder-os:scout:find` to search for integrations, or `/founder-os:scout:catalog` to browse what is available. When you find something useful, `/founder-os:scout:install` adds it to your configuration. Think of it as an app store for your AI workspace.

### Workflow Automation

Chain any combination of Founder OS commands into a repeatable workflow. `/founder-os:workflow:create` builds the workflow. `/founder-os:workflow:schedule` sets it to run on a timer. A morning routine might chain `morning:sync`, `inbox:triage`, and `briefing:briefing` into a single command that runs every weekday at 8 AM — with no manual intervention.

---

## Real-World Scenarios

### Before and After: Monday Morning

**Without Founder OS:** You open Gmail (47 unread), scan for urgency, switch to Calendar (6 meetings), open Notion to check tasks, realize you forgot a follow-up from Friday, spend 20 minutes finding the email thread, then start prepping for your 9 AM call by searching Drive for the client's last proposal. It is 9:02 AM and you are already behind.

**With Founder OS:**

```bash
/founder-os:morning:sync
/founder-os:inbox:triage
/founder-os:prep:today
```

Three commands. Your morning sync pulls together calendar, email, tasks, and Slack into one view. Inbox triage categorizes all 47 emails and surfaces the 5 that need your attention. Meeting prep generates briefing documents for every call on your calendar — including client history, open invoices, and last touchpoints. It is 8:15 AM and you are ahead of your day.

---

### Before and After: Client Quarterly Review

**Without Founder OS:** You spend 3 hours pulling data from Notion, Gmail, and Drive. You copy-paste meeting notes, invoice totals, and project milestones into a Google Doc. The formatting takes another hour. You miss a key metric because it was buried in a Slack thread.

**With Founder OS:**

```bash
/founder-os:client:brief "Acme Corp"
/founder-os:report:generate --data=./acme-q1/
/founder-os:health:report
```

The client brief pulls together every interaction, deal, and communication with Acme Corp from across all connected tools. The report generator turns your quarterly data into a formatted analysis with charts. The health report scores the client relationship across five dimensions — contact frequency, response time, task completion, payment history, and sentiment. Total time: under 10 minutes.

---

### Before and After: End-of-Week Wrap

**Without Founder OS:** You try to remember what you accomplished this week. You skim your sent folder, scroll through Notion, and guess at how many hours you spent on admin. Your weekly review is a vague sense that you were busy.

**With Founder OS:**

```bash
/founder-os:review:review
/founder-os:savings:weekly
/founder-os:learn:weekly
```

The weekly review compiles a structured summary of what happened — meetings attended, emails sent, tasks completed, and deals progressed. The savings report calculates exactly how many hours Founder OS saved you, converted to a dollar amount. The learning log surfaces the top insights you captured during the week. You walk into the weekend with clarity.

---

## Get Started

Install Founder OS in Claude Code and run your first command in under two minutes.

```bash
npx founder-os
```

Then set up your workspace:

```bash
/founder-os:setup:notion-hq
/founder-os:setup:verify
```

For the full setup walkthrough, configuration options, and troubleshooting, see the [Getting Started Guide](../docs/getting-started.md).
