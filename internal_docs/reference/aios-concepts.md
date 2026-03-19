# AIOS Concepts Reference

> Condensed from AIOS by MS course materials. Original 35-file course archived.

---

## What is an AIOS?

An **AI Operating System (AIOS)** is an autonomous intelligence layer wrapped around an entire business -- data, operations, communications, decisions. It is not a chatbot, prompt library, or single SaaS tool. It functions like an OS for your business: always-on, context-aware, compounding over time.

**Core capabilities:**
- Knows the business (strategy, team, processes, history)
- Sees real-time numbers (revenue, traffic, conversions collected automatically)
- Watches everything (meetings, Slack, signals) and delivers a daily brief
- Lives in your pocket (Telegram voice notes, mobile-first decisions)
- Works while you sleep (cron jobs, scheduled collection, autonomous tasks)

**Key differentiator:** Holistic, not point-solution. Data feeds intelligence, intelligence feeds decisions, decisions feed automations. Everything compounds.

---

## The Operator Trap

The core problem AIOS solves. Business owners are stuck working IN the business (admin, firefighting, dashboard-checking, meetings for "staying informed"). 80% of bandwidth goes to operations, leaving nothing for growth or the freedom they started the business for.

**Old answer (fails):** Hire more people (more management overhead), buy more tools (more fragmentation), work more hours (treadmill).

**AIOS answer:** Less manual work, fewer people needed, less time in operations. Build a system that thinks and operates so you architect instead of operate.

---

## The Five Layers

Each layer is independently valuable. Build sequentially; each compounds the next.

| # | Layer | What It Does | Key Outcome |
|---|-------|-------------|-------------|
| 1 | **Context** | AI understands your business (strategy, team, processes, history) | Every interaction is 10x more useful; no more repeating yourself |
| 2 | **Data** | AI sees real-time numbers from your actual sources | Stop logging into 7 dashboards; ask questions in plain English |
| 3 | **Intelligence** | AI watches meetings, Slack, signals; delivers daily brief | Stop attending meetings just to stay informed; coffee + brief |
| 4 | **Automate** | Audit every task, score for automation, cross them off | Bandwidth actively recovered; Task Automation % climbs |
| 5 | **Build** | Freed bandwidth applied to growth, new initiatives, or life | You become the architect, not the operator |

**Compounding effect:** Context alone is transformational. Add Data = multiplier. Add Intelligence = most informed person in your org. Add Automate = recovering time. Add Build = full freedom.

**Hidden benefit:** By Layer 3 you are technical (through gradual exposure to file systems, APIs, databases, scripts) without having studied any of it directly.

---

## The Five Principles

1. **Just Ask** -- Believe anything is automatable, then describe it in plain English. Don't self-censor. The person who asks for the impossible gets it.

2. **Talk, Don't Type** -- Voice-first interaction. Hold FN key, speak, let Claude format. 200 wpm spoken vs 50 typing. Changes psychology from "using a tool" to "working with a partner."

3. **Layers, Not Leaps** -- One layer at a time. Each independently valuable. Permission to go slow. Understanding comes through doing.

4. **Build for Scale and Security** -- Human-in-the-loop by default. Approval gates before critical actions. Data stays local. Plan before you build (research > scope > execute). Self-healing loops (CLAUDE.md updates, cron failure logging).

5. **Borrow Before You Build** -- 80% borrow/adapt from module library, 20% custom build. Every module borrowed = days saved. Share back to grow the ecosystem.

---

## Three KPIs

| KPI | What It Measures | Starts Climbing At | Target |
|-----|-----------------|-------------------|--------|
| **Away-From-Desk Autonomy** | Hours/day you can step away with nothing falling apart | Layer 3 (Intelligence) | Business runs while you sleep/travel |
| **Task Automation %** | Percentage of recurring tasks automated or heavily augmented | Layer 4 (Automate) | 60-70% at 180 days |
| **Revenue Per Employee** | Total revenue / total team members (incl. contractors) | Layer 5 (Build) | Leaner, more profitable operation |

**Test:** Take a Friday off. Leave laptop closed. Can you run the business from your phone in 15 minutes via Telegram? If yes, AIOS is working.

**Rule:** If an automation does not move at least one KPI, question whether it is worth building.

---

## Setup Paths

| Path | Interface | For Whom | Trade-offs |
|------|-----------|----------|------------|
| **Claude Desktop** | Desktop app, no terminal | Non-technical owners wanting simplest setup | One conversation at a time, no parallel agents |
| **VS Code + CLI** | VS Code editor + Claude Code CLI | Technical users or agency builders | Full power (parallel agents, background tasks), small learning curve |

Both paths use the same modules, same workspace folder, same results. Workspace carries over if you switch.

---

## Core Modules

### ContextOS (Layer 1 -- Foundation)
- **Purpose:** Guided interview building 4 context files (business-info, personal-info, strategy, current-data) + personalized CLAUDE.md
- **Time:** 30-45 min | **Cost:** Free | **API keys:** None
- **Win:** Ask a strategic question and get an answer with full business context

### InfraOS (Layer 1 -- Foundation)
- **Purpose:** Git version control, GitHub backup, `/commit` command, HISTORY.md changelog, .gitignore, .env setup
- **Time:** 20-30 min | **Cost:** Free | **API keys:** None
- **Win:** `/commit` saves, documents, and backs up in one step

### DataOS (Layer 2 -- Data)
- **Purpose:** Interactive data workshop. Collectors for your sources (Stripe, YouTube, GA4, Google Sheets, etc.) into SQLite. Key-metrics summary. Next.js dashboard. Daily cron collection.
- **Time:** 30-60 min | **Cost:** Free | **API keys:** 1-7 per source
- **Six phases:** Discovery > Foundation > Connect Sources > Key Metrics > Dashboard Workshop > Automate

### IntelOS (Layer 3 -- Intelligence)
- **Purpose:** Meeting transcripts (Fireflies/Fathom) + Slack messages collected, classified by department, searchable forever. Cron-based collection.
- **Time:** 20-30 min | **Cost:** Free | **API keys:** 1-3
- **Win:** "Find that meeting with [person] last week about [topic]" -- instantly found

### CommandOS (Layer 3 -- Intelligence)
- **Purpose:** Telegram bot -- AIOS in your pocket. Voice notes, photos, text. 24/7 access.
- **Time:** 30-45 min | **Cost:** Included | **API keys:** 2-3

### Daily Brief (Layer 3 -- Intelligence)
- **Purpose:** Morning intelligence brief synthesizing everything across your business, delivered before breakfast.
- **Time:** 20-30 min | **Cost:** ~$1-3/mo (Gemini API) | **API keys:** 1

### ProductivityOS (Layer 4 -- Automate)
- **Purpose:** GTD system (inbox, decision tree, context lists, project tracking, weekly review, dashboard). Manages the work of automating your task audit.
- **Time:** 10-15 min | **Cost:** Free | **API keys:** None
- **Key commands:** `/process` (clear inbox), `/review` (weekly review)

### Slash Commands Toolkit (Layer 5 -- Build)
- **Purpose:** `/brainstorm` (figure out what to build) + `/explore` (shape an idea through 5 stages: Discovery > Research > Shape > Scope > Output)
- **Time:** 5-10 min | **Cost:** Free | **API keys:** None

---

## Task Audit

The `/task-audit` command (built into Starter Kit) runs a structured interview across 9 business areas: Operations, Finance, Sales, Marketing, Content, HR, Client Delivery, Product, Admin.

**Output:** `context/task-audit.md` with every recurring task mapped, scored (Fully Automatable / Partially / Not Yet / Human-Only), and prioritized by impact x ease. Includes checkboxes and a "Solved By" column.

**Workflow:** Task Audit > check Module Library > install matching modules > build custom for the rest > tick off completed items.

---

## Building Custom Automations

Four-step workflow: `/brainstorm` > `/explore` > `/create-plan` > `/implement`

**Autonomy Spectrum** (start interactive, move right as confidence grows):
- **Interactive** -- You trigger, Claude assists (e.g., /brainstorm)
- **Scheduled** -- Runs at set times via cron (e.g., Daily Brief)
- **Triggered** -- Fires on events (e.g., file watcher)
- **Autonomous** -- Decides and acts within defined boundaries (e.g., Telegram bot)

---

## Library Modules (Pick and Choose)

| Module | Time | For You If... |
|--------|------|--------------|
| Content Pipeline | 30-45 min | You create content regularly; commands: `/capture`, `/develop`, `/schedule` |
| Thumbnail Generator | 30-45 min | You make YouTube videos |
| Diagram Engine | 5-10 min | You want to visualize systems/architectures |
| AI Landscape Monitor | 15-20 min | You need to stay current on AI tools |

---

## Workspace Structure (Starter Kit)

```
aios-starter-kit/
  CLAUDE.md              # Foundation file, loaded every session
  .env                   # API keys (gitignored)
  .claude/commands/      # Slash commands (/prime, /install, /create-plan, /implement, /share)
  context/               # business-info.md, personal-info.md, strategy.md, current-data.md
    import/              # Drop existing docs for Claude to analyze
  module-installs/       # Unzip modules here, install with /install
  plans/                 # Implementation plans from /create-plan
  outputs/               # Deliverables, reports, work products
  reference/             # Templates, examples, reusable patterns
  scripts/               # Automation scripts (added by modules)
```

**Key commands:**
- `/prime` -- Load context at session start (run every session)
- `/install <path>` -- Install a module
- `/create-plan` -- Plan before building
- `/implement` -- Execute a plan step by step
- `/share` -- Package a system for sharing (6-stage: Research > Scope > Frame > Write > Validate > Deliver)
- `/task-audit` -- Map and score every task in your business
- `/brainstorm` -- Explore what to build next
- `/explore` -- Shape a specific idea through 5 stages

**Shell aliases:**
- `cs` = `claude "/prime"` (safe mode, approval required)
- `cr` = `claude --dangerously-skip-permissions "/prime"` (autonomous mode)

---

## Relevance to Founder OS

Founder OS shares the AIOS philosophy of automating business operations through an AI layer. Key parallels:

| AIOS Concept | Founder OS Equivalent |
|-------------|----------------------|
| ContextOS (business context files) | Plugin SKILL.md files + Notion HQ as source of truth |
| DataOS (centralized metrics) | P10 Client Health, P25 Time Savings, P09 Report Generator |
| IntelOS (meeting/Slack collection) | P07 Meeting Intelligence, P19 Slack Digest, P02 Daily Briefing |
| ProductivityOS (GTD task management) | P04 Action Items, P06 Follow-Up Tracker |
| Task Audit (map + score + automate) | 30-plugin ecosystem covering all four pillars |
| Slash commands (/brainstorm, /explore) | Plugin slash commands (/inbox:triage, /client:load, etc.) |
| Module Library (borrow before build) | Anthropic plugin format for distribution |
| Five Layers (Context > Data > Intel > Automate > Build) | Four Pillars (Daily Work > Code Without Coding > Integrations > Meta & Growth) |
