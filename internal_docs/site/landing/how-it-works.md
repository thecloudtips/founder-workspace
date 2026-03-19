# How It Works

> From zero to a fully personalized AI operations system in five steps.

Founder OS is a single plugin for Claude Code that turns your terminal into a business command center. It connects your Gmail, Google Calendar, Google Drive, Notion, Slack, and more — then gives you 120+ commands that handle the operational work you currently do by hand.

Here is how you go from installation to a system that learns your preferences, adapts to your business, and gets smarter every week.

---

## Step 1: Install

**One command. Thirty seconds. Everything you need.**

Founder OS installs through npm, the standard package manager that comes with Node.js. You run a single command in your terminal, and the installer creates a `.founderOS` directory in your project with the plugin structure, hooks, and default settings. No build step, no complex configuration files, no Docker containers.

The installer also registers Founder OS as a Claude Code plugin, which means the next time you open Claude Code in that project, all 120+ slash commands are immediately available. You will see them in autocomplete when you type `/founder-os:`.

What gets created during installation:

- A `.founderOS/` directory containing the plugin files, infrastructure, and hook scripts
- A `.claude/` settings entry that tells Claude Code where to find the plugin
- A `.memory/` directory (created on first use) for the local learning database
- Default configuration files you can customize later

**Try it:**

```
npx founder-os
```

That is the entire installation. The installer runs preflight checks, sets up the directory structure, and confirms everything is ready. You will see a summary of what was created and a prompt to run your first configuration command.

---

## Step 2: Configure

**Connect your tools and teach the system about your business.**

Founder OS works best when it can access the tools you already use. Configuration happens through two guided setup commands and an optional business context interview.

First, connect Notion. Notion serves as your operational headquarters — Founder OS stores briefings, meeting prep documents, client dossiers, tasks, invoices, and more in a structured set of 22 interconnected databases. The setup command walks you through creating a Notion integration, getting your API key, and verifying access.

Second, authenticate Google Workspace. The `gws` CLI tool gives Founder OS read access to your Gmail, Google Calendar, and Google Drive. One authentication flow covers all three services — no separate setup per tool.

Finally, you can optionally run the business context setup, which asks you a series of questions about your company, your current strategy, and your key clients. This context gets injected into every command, so outputs use your terminology, prioritize your actual clients, and align with your real business goals.

**Try it:**

```
/founder-os:setup:notion-cli
```

This launches an interactive wizard that walks you through Notion integration step by step. It checks for existing configuration, installs dependencies if needed, guides you through API key creation, and verifies that the connection works. Once Notion is connected, run:

```
/founder-os:setup:notion-hq
```

This creates all 22 Founder OS databases in your Notion workspace — CRM, Tasks, Meetings, Finance, Briefings, Content, and more — all pre-configured with the right properties and relations. The command is idempotent, so you can safely run it again if interrupted.

For Google Workspace access, authenticate once in your terminal:

```
gws auth login
```

After that, every command that needs Gmail, Calendar, or Drive access will work automatically.

---

## Step 3: Use

**Run your first commands and see results in seconds.**

With your tools connected, you are ready to start using Founder OS. The three commands most founders run first are inbox triage, daily briefing, and meeting prep — they cover the work that eats up your first two hours every morning.

Inbox triage scans your Gmail, categorizes every unread email by type (action required, waiting on reply, FYI, newsletter, promotion), assigns a priority score using an Eisenhower matrix, and presents a structured summary. Instead of scrolling through 87 emails trying to figure out what matters, you get a clear breakdown in about 30 seconds: 12 need action, 10 need a reply, 44 can be archived.

The daily briefing pulls together your calendar events, email highlights, open Notion tasks, and optionally Slack activity into a single morning overview. It is the equivalent of having a chief of staff who reviewed everything before you woke up and prepared a one-page summary of what your day looks like.

Meeting prep builds a detailed preparation document for a specific calendar event. It looks up each attendee in your CRM and email history, surfaces open action items and recent correspondence, and generates framework-based talking points. You walk into every meeting knowing the context, the open threads, and what you should bring up.

**Try it:**

```
/founder-os:inbox:triage
```

This scans your last 24 hours of unread email and returns a categorized summary:

```
## Inbox Triage Summary

**Processed**: 87 emails (last 24 hours)

### Categories
| Category        | Count |
|-----------------|-------|
| Action Required | 12    |
| Waiting On      | 8     |
| FYI             | 23    |
| Newsletter      | 15    |
| Promotions      | 29    |

### Needs Attention (Top 5)
1. **Re: Q2 Contract Renewal** from Sarah Chen — Priority 5 — Review and sign by Friday
2. **Invoice #4521 Past Due** from Acme Corp — Priority 5 — Follow up on payment
...

### Quick Actions
- **Archive candidates**: 44 emails ready to archive
- **Needs response**: 10 emails awaiting your reply
```

Want more depth? Add the `--team` flag to activate a full four-agent pipeline that also extracts action items into your Notion task list and drafts replies for emails that need a response:

```
/founder-os:inbox:triage --team
```

For your daily briefing:

```
/founder-os:briefing:briefing
```

This pulls from Calendar, Gmail, Notion tasks, and Slack to build a comprehensive morning overview saved to your Notion Briefings database.

For meeting prep:

```
/founder-os:prep:prep
```

When you run this without arguments, it shows your remaining meetings for the day and lets you pick which one to prep for. It then builds a full preparation document with attendee profiles, recent email threads, open items, and talking points.

All commands run in the background by default, so you can fire off multiple commands at once and continue working while they execute.

---

## Step 4: Learn

**The system observes your patterns and adapts to your preferences.**

This is where Founder OS diverges from a static set of scripts. Two engines work together behind the scenes to make every command smarter over time: the Memory Engine and the Intelligence Engine.

The Memory Engine is a local database (SQLite with vector search) that stores facts, preferences, patterns, contact details, and workflow knowledge that Founder OS discovers as you work. When you triage your inbox and always archive newsletters from a particular sender, the system notices. When meeting prep surfaces that a client prefers Slack over email, that gets recorded. These memories start as candidates with low confidence. Each time the same pattern is observed again, its confidence score increases by 15 points. Once a memory crosses the confirmation threshold (60 points), it becomes active. After three or more confirmations and a confidence score above 80, it gets promoted to "applied" status — meaning it automatically influences command behavior.

The Intelligence Engine sits on top of memory and handles the behavioral layer. It captures structured events from every command execution — what you ran, what decisions were made, what the outcome was. Over time, it detects patterns like "this user always wants formal tone in client emails" or "briefings should emphasize revenue metrics." These patterns go through an approval workflow: the system proposes an adaptation, you approve or dismiss it, and approved patterns get applied to future executions.

The system also includes self-healing: if a command fails because of a transient API error, it retries automatically with backoff. If a tool is temporarily unavailable, it degrades gracefully and continues with what it can access. You get notified about what happened and what was done to recover.

**What this looks like in practice:**

After your first week of running `/founder-os:inbox:triage`, you might see a notification like:

```
[Memory] New pattern detected: "Archive all emails from marketing-digest@industry.com"
         Confidence: 60/100 — now active. Will apply automatically.
```

Or from the Intelligence Engine:

```
[Intel] Learned preference: "Include revenue impact in daily briefings"
        Observed 4 times across briefing commands. Approve? [Y/n]
```

Memories that go unused for 30 days gradually decay (losing 5 confidence points per week), so stale preferences fade away naturally. You can always see what the system has learned, teach it new facts directly, or dismiss patterns you disagree with:

```
/founder-os:memory:show                        # See all active memories
/founder-os:memory:teach                       # Manually teach a new fact or preference
/founder-os:memory:forget                      # Remove a specific memory
/founder-os:intel:patterns                     # View detected intelligence patterns
/founder-os:intel:approve                      # Approve or dismiss a proposed pattern
```

---

## Step 5: Extend

**Discover new capabilities and chain commands into automated workflows.**

Founder OS ships with 33 namespaces covering email, meetings, reports, invoices, CRM, competitive research, social media, and more. But every business is different, and you will eventually need capabilities that were not built in.

Scout is the discovery engine. You describe a problem in plain language, and Scout searches both the local catalog and the web for tools, MCP servers, packages, and skills that solve it. Each result gets scored for relevance, security, and compatibility with your setup. When you find something useful, Scout installs it into a sandbox, runs a security review, generates a wrapper command, and registers it in your catalog. You can then promote it to a full namespace that works like any built-in command.

Workflows let you chain any combination of commands into a repeatable sequence. Instead of manually running inbox triage, then a briefing, then meeting prep every morning, you create a workflow that does all three in order, passing context between steps. Workflows can be scheduled to run on a recurring basis — daily, weekly, or on any cron expression — so your morning automation runs before you even open your laptop.

**Try it:**

```
/founder-os:scout:find "parse PDF invoices into structured line items"
```

Scout searches for tools that solve this problem, scores the results, and presents ranked options with integration guidance. If you find a match:

```
/founder-os:scout:install <tool-url>
```

This installs the tool into a sandboxed environment, runs a six-point security review, and generates a wrapper command you can use immediately.

For workflows, start by creating one:

```
/founder-os:workflow:create morning-routine
```

This builds a workflow YAML file where you define the steps — which commands to run, in what order, and how to pass data between them. A morning routine workflow might look like this:

```yaml
name: morning-routine
steps:
  - id: triage
    command: /founder-os:inbox:triage
    args: --hours=12
  - id: briefing
    command: /founder-os:briefing:briefing
    depends_on: [triage]
  - id: prep
    command: /founder-os:prep:today
    depends_on: [briefing]
```

Run it manually or schedule it:

```
/founder-os:workflow:run morning-routine
/founder-os:workflow:schedule morning-routine --cron "0 7 * * 1-5"
```

The second command sets the workflow to run every weekday at 7 AM. By the time you sit down with your coffee, your inbox is triaged, your briefing is in Notion, and prep documents are ready for every meeting on your calendar.

---

## What Comes Next

Once you have completed these five steps, you have a system that handles your operational work, learns from how you use it, and grows with your business. Most founders report saving 8-12 hours per week within the first month.

Ready to get started? Head to the [Getting Started guide](./getting-started.md) for a detailed walkthrough, or jump straight to installation:

```
npx founder-os
```

For a deeper look at what Founder OS can do for your specific situation, explore the [Use Cases](./use-cases.md) page to find the persona that matches your role.

Want to understand the full command library? Browse the [Command Reference](../docs/commands/index.md) for all 33 namespaces and 120+ commands.
