# Use Cases

Founder OS works differently depending on how you run your business. These four scenarios show how real founders use FOS commands to reclaim hours every week --- not by adding more tools, but by letting AI handle the operational work you already do inside the tools you already use.

---

## The Solopreneur: Morning Routine on Autopilot

### Who this is

You run a one-person business --- maybe a consultancy, a productized service, or a small agency with a few contractors. You wear every hat. Your mornings start by checking email, scanning your calendar, reviewing tasks, and trying to figure out what actually matters today. By the time you start real work, an hour has disappeared.

### A day in the life

It is 7:45 AM. You open Claude Code and type one command:

```
/founder-os:morning:quick
```

In under a minute, FOS scans your Gmail, Google Calendar, and Notion tasks. It pulls your unread email count, surfaces the five most urgent items across all sources, and tells you exactly what needs attention first. No Notion pages, no overhead --- just a clean summary in your terminal.

Your top priority is a client email from last night asking about a revised timeline. Before replying, you run:

```
/founder-os:inbox:triage --hours=12
```

FOS categorizes all 47 overnight emails using an Eisenhower matrix --- 6 need action, 4 are waiting on someone else, the rest are newsletters and promotions. It flags the client email as priority 5 and recommends responding immediately.

You draft a reply, but also want to know if you missed anything this week. One more command:

```
/founder-os:briefing:review
```

This checks your existing daily briefing for changes since this morning --- a new meeting was added at 2 PM, and two tasks became overdue. FOS appends the updates directly to your Notion briefing page so you have a single source of truth for the day.

At the end of Friday, you close the week:

```
/founder-os:review:review --output=both
```

FOS auto-discovers every task database in your Notion workspace, pulls completed tasks, calendar events, and email threads from the past week, and assembles a six-section weekly review covering wins, meetings, blockers, and next-week priorities. It saves to Notion and displays a summary in chat.

When a client relationship feels off, you check:

```
/founder-os:health:scan --client="Greenleaf Design"
```

FOS computes a health score across five metrics --- last contact, response time, open tasks, payment status, and sentiment --- and tells you exactly what needs attention. No spreadsheet required.

### Before and after

**Before FOS**: Your mornings start with 45-60 minutes of tab-switching --- Gmail, Calendar, Notion, Slack --- mentally assembling a picture of your day. You forget to follow up on client emails. Weekly reviews happen sporadically, if at all.

**After FOS**: A single command gives you a prioritized view of your day in under a minute. Follow-ups are tracked automatically. Weekly reviews generate themselves every Friday. You reclaim 4-5 hours per week and start your mornings with clarity instead of chaos.

### Key namespaces

| Namespace | What it does | Learn more |
|-----------|-------------|------------|
| `morning` | Quick check-ins and full morning syncs across Gmail, Calendar, Notion, Slack, and Drive | [Commands overview](../commands/index.md) |
| `inbox` | AI-powered email triage with Eisenhower matrix categorization and draft generation | [Commands overview](../commands/index.md) |
| `briefing` | Structured daily briefings with meeting prep, email highlights, and task priorities | [Commands overview](../commands/index.md) |
| `health` | Client health scoring with five-metric dashboard and risk flag detection | [Commands overview](../commands/index.md) |
| `review` | Automated weekly reviews with wins, blockers, and next-week priority ranking | [Commands overview](../commands/index.md) |

---

## The Agency Founder: Client Lifecycle Management

### Who this is

You run a creative or digital agency with 3-15 clients at any given time. Your day is split between client work, business development, and operations. Keeping track of every client relationship, every SOW revision, every overdue invoice, and every CRM update is a full-time job on top of your full-time job. Things fall through the cracks, and when they do, it costs you money.

### A day in the life

Monday morning. You have a discovery call with a new prospect at 10 AM. Before the call, you pull up everything FOS knows about them:

```
/founder-os:client:load "Meridian Partners" --team
```

FOS launches six parallel agents that simultaneously search your CRM, Gmail history, Google Calendar, Google Drive, and Notion notes. In seconds, you have a unified dossier: company profile, every email thread from the past 180 days, past meeting notes, open tasks, upcoming milestones, and a sentiment analysis of the relationship. It caches the dossier on the company's Notion page for instant access later.

The discovery call goes well. The prospect sends over a brief. You turn it into a formal Statement of Work:

```
/founder-os:sow:from-brief ./briefs/meridian-crm-rebuild.md --client="Meridian Partners"
```

FOS generates three scope options --- Conservative, Balanced, and Ambitious --- each with its own timeline, pricing, risk assessment, and deliverables table. It saves the SOW as a markdown file and tracks it in your Notion Deliverables database, automatically linking it to the client's company record.

Meanwhile, invoices from last month's batch are piling up. You process them all at once:

```
/founder-os:invoice:batch ~/invoices/march/ --team
```

FOS runs a five-agent pipeline on every invoice file in the folder --- extracting vendor data, validating line items, categorizing expenses, flagging anomalies, and recording each invoice in your Notion Finance database. You get a batch summary table showing totals, categories, and any items that need manual review.

Later, you need a status report for your biggest client. Instead of spending an hour assembling data:

```
/founder-os:report:generate --data=./data/acme-q1-metrics.csv --team
```

Five agents analyze the data, write the report prose, generate charts, and run a quality check. The polished report saves to your reports folder and gets tracked in Notion.

At the end of each day, you keep your CRM current with a single command:

```
/founder-os:crm:sync-email --since=1d
```

FOS scans your Gmail sent folder, matches email threads to CRM clients using a five-step progressive matching algorithm, generates AI summaries, classifies sentiment, and creates Communications records in Notion. What used to take 30 minutes of manual CRM entry happens automatically.

### Before and after

**Before FOS**: You spend 2-3 hours per week on CRM updates alone. SOWs take half a day to write. Invoice processing is a dreaded monthly chore. Client dossiers live in your head, which means context gets lost when you switch between accounts.

**After FOS**: CRM updates happen automatically from your email. SOWs generate in minutes with three pricing options ready for the client. Invoice batches process while you work on something else. Client context is always one command away. You save 6-8 hours per week on operations, freeing time for the client work that actually generates revenue.

### Key namespaces

| Namespace | What it does | Learn more |
|-----------|-------------|------------|
| `client` | Full client dossiers with six-agent parallel gathering from CRM, email, calendar, and drive | [Commands overview](../commands/index.md) |
| `sow` | Statement of Work generation with three scope options and competing-hypotheses pipeline | [Commands overview](../commands/index.md) |
| `invoice` | Single and batch invoice processing with extraction, validation, and Notion recording | [Commands overview](../commands/index.md) |
| `crm` | CRM sync for email and meetings with AI summaries, sentiment, and client matching | [Commands overview](../commands/index.md) |
| `report` | Polished report generation from data files with charts and executive summaries | [Commands overview](../commands/index.md) |

---

## The Consultant: Engagement Workflow

### Who this is

You are an independent consultant or a small consulting firm. Your business runs on client engagements --- each one has a lifecycle from first meeting to final invoice. You need to prepare thoroughly for every meeting, write proposals quickly, review contracts carefully, track expenses accurately, and never let a follow-up slip. The quality of your preparation directly determines whether you win and keep clients.

### A day in the life

You have a strategy session with a potential client at 2 PM. At 1:30, you run:

```
/founder-os:prep:prep
```

FOS shows your remaining meetings for the day. You select the 2 PM call. It pulls the calendar event details, searches your Gmail for every thread with the attendees over the past 90 days, looks up their CRM profiles and past meeting notes in Notion, and even finds relevant documents on Google Drive. The output includes attendee profiles ranked by seniority, a list of open items (what you owe them and what they owe you), and a tailored discussion guide with framework-based talking points, a suggested opener, and a closing statement. All saved to Notion for reference during the meeting.

The call goes well. They want a proposal by end of week. You generate one that afternoon:

```
/founder-os:proposal:create "Apex Financial"
```

FOS pulls their CRM history, walks you through a brief project discovery, then generates a complete seven-section proposal with three pricing packages (Starter, Professional, Enterprise), a comparison table, timeline with milestones, and terms and conditions. It saves both the proposal and a SOW-compatible brief file, so you can run `/founder-os:sow:from-brief` if they want a more detailed scope document.

Before you sign, the client sends their contract. You want to understand the risk:

```
/founder-os:contract:analyze ~/contracts/apex-msa.pdf
```

FOS reads the contract, detects it is a Service Agreement, extracts key terms across seven categories (payment, duration, IP, confidentiality, liability, termination, warranty), runs a risk assessment with red/yellow/green flags, and produces a prioritized list of negotiation points. Red flags come first.

At month-end, you compile your expenses:

```
/founder-os:expense:report "last month"
```

FOS aggregates approved invoices from your Notion Finance database and local receipt files, deduplicates them, categorizes any uncategorized items, calculates tax deductibility, compares against the prior month, and generates a seven-section expense report with category breakdowns, vendor summaries, and trend analysis.

Throughout the week, you track who owes you a reply:

```
/founder-os:followup:check --days=14 --priority=high
```

FOS scans your Gmail sent folder for threads where you sent the last message and no reply came back. It detects promises (both yours and theirs), scores urgency on a 1-5 scale, and suggests the right action for each: follow up immediately, send a nudge, or just monitor. High-priority items get tracked in your Notion Tasks database.

### Before and after

**Before FOS**: Meeting prep means 20-30 minutes of searching through email, CRM, and notes to remember the relationship context. Proposals take 4-6 hours to write from scratch. Contract review is stressful and time-consuming. Expense reports are a quarterly ordeal. Follow-ups fall through the cracks, costing you deals.

**After FOS**: Meeting prep is generated in minutes with talking points tailored to the attendees. Proposals come together in under an hour with professional formatting and three pricing tiers. Contract risk flags are surfaced instantly. Expense reports generate themselves. Follow-ups are tracked automatically. You save 5-7 hours per week and show up to every interaction more prepared than your competition.

### Key namespaces

| Namespace | What it does | Learn more |
|-----------|-------------|------------|
| `prep` | Deep meeting preparation with attendee profiles, open items, and discussion guides | [Commands overview](../commands/index.md) |
| `proposal` | Seven-section client proposals with three pricing packages and SOW-compatible brief output | [Commands overview](../commands/index.md) |
| `contract` | Contract analysis with key term extraction, risk detection, and negotiation recommendations | [Commands overview](../commands/index.md) |
| `expense` | Seven-section expense reports with tax deductibility, trend analysis, and vendor summaries | [Commands overview](../commands/index.md) |
| `followup` | Sent-email scanning for unanswered threads with promise detection and priority scoring | [Commands overview](../commands/index.md) |

---

## The SaaS Founder: Growth and Strategy

### Who this is

You are building a software product --- maybe pre-revenue, maybe approaching product-market fit, maybe scaling. Your time is split between building, selling, and thinking about what comes next. You need to stay on top of competitors, communicate with your audience, track your goals, learn from your experiments, and generate content that positions you as a thought leader. None of this is your core product work, but all of it determines whether your product succeeds.

### A day in the life

Your board meeting is in two weeks. You need to understand how a new competitor stacks up. You run:

```
/founder-os:compete:research "RivalApp" --your-product="Project management for distributed teams, $29/user/month"
```

FOS executes targeted web searches across five dimensions --- pricing, features, reviews, positioning, and news. It normalizes the data (pricing to per-user/month, review scores to a 5.0 scale), builds a SWOT analysis, characterizes their market positioning, and since you provided your product description, generates a head-to-head comparison showing where you win, where they win, and key differentiation opportunities. The full report saves to a local file and your Notion Research database.

You want to share your competitive insight with your audience. You start with an outline:

```
/founder-os:ideate:outline "why most project management tools fail distributed teams" --framework=contrarian --platform=linkedin
```

FOS selects the contrarian framework, generates three hook options (a bold claim, a surprising statistic angle, and a question), structures 4 body sections with transition notes, and provides three closer variants. You pick the hook you like and refine the outline.

Then you turn it into a newsletter:

```
/founder-os:newsletter:draft --tone=authoritative
```

FOS takes your outline and writes a complete newsletter in your founder voice --- punchy opening, opinion-driven sections with inline source links, actionable takeaways, and a conversational CTA. It formats everything for Substack compatibility and saves to your newsletters folder.

Between shipping features, you capture what you are learning:

```
/founder-os:learn:log "Discovered that onboarding completion rates doubled when we added a progress bar to the setup flow" --source=experiment
```

FOS auto-generates a title, detects the topics (Product, Growth), finds related past insights from your learning database, and saves everything to Notion. Over time, your learning log becomes a searchable knowledge base of founder lessons.

Every Monday, you check your quarterly goals:

```
/founder-os:goal:check
```

FOS pulls all active goals from your Notion Goals database, computes a progress percentage and RAG status (on track, at risk, behind) for each, calculates velocity, projects completion dates, and displays a compact dashboard. You can drill into any goal for milestone-level detail, blocker detection, and recommended actions.

### Before and after

**Before FOS**: Competitive research takes half a day and produces an unstructured document you never look at again. Content creation is a guilt-ridden afterthought that happens irregularly. Goals live in a spreadsheet that gets stale within a week. Learnings and insights scatter across Slack messages, meeting notes, and your memory.

**After FOS**: Competitive intel generates in minutes with actionable recommendations. Content flows from ideation to outline to newsletter draft in a structured pipeline. Goals are tracked with real-time RAG status and projected completion dates. Every insight you capture connects to your growing knowledge base. You save 4-6 hours per week on strategic work and build a compounding knowledge advantage.

### Key namespaces

| Namespace | What it does | Learn more |
|-----------|-------------|------------|
| `compete` | Competitive intelligence with web research, SWOT analysis, and head-to-head comparison | [Commands overview](../commands/index.md) |
| `newsletter` | Newsletter pipeline from research to outline to full draft in founder voice | [Commands overview](../commands/index.md) |
| `goal` | Goal tracking with RAG status, velocity analysis, milestone tracking, and blocker detection | [Commands overview](../commands/index.md) |
| `learn` | Learning capture with auto-tagging, topic detection, and related insight linking | [Commands overview](../commands/index.md) |
| `ideate` | Content ideation with framework selection, platform-adapted outlines, and draft generation | [Commands overview](../commands/index.md) |

---

## Which founder are you?

Most founders see themselves in more than one of these scenarios. That is by design --- Founder OS has 33 command namespaces that work together across every part of your business. Start with the workflow that costs you the most time today, and expand from there.

Ready to get started? See the [Installation Guide](./getting-started.md) to set up Founder OS in under 10 minutes. Or explore the [full command reference](../commands/index.md) to see everything FOS can do.
