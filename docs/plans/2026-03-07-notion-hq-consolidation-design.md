# Founder OS Notion HQ - Database Consolidation Design

**Date:** 2026-03-07
**Status:** Approved
**Goal:** Ship a single Notion workspace template ("Founder OS HQ") that founders install once. All 30 plugins connect to pre-built, interconnected databases. CRM Pro is the heart; everything relates back to Companies.

---

## 1. Current State

- **32+ separate Notion databases** across 30 plugins, each lazy-created independently
- **CRM Pro** (Companies, Contacts, Deals, Communications) assumed pre-installed but has no template JSON
- Most plugin DBs are isolated silos with no cross-references
- Overlapping data: client health in P10 + P20, action items in P01 + P04, briefings in P02 + P05 + P19 + P22

## 2. Target State

- **~21 consolidated databases** organized into 5 sections (including Memory added by the Memory Engine)
- All client-facing databases linked to Companies via Notion relations
- Pre-built Command Center dashboard with linked database views
- Multi-page workspace structure: `Founder OS HQ` top-level page with section sub-pages
- Plugins updated to find consolidated DBs by name; lazy creation removed

---

## 3. Workspace Structure

```
Founder OS HQ
|-- Command Center (Dashboard page)
|-- CRM
|   |-- Companies DB
|   |-- Contacts DB
|   |-- Deals DB
|   |-- Communications DB
|-- Operations
|   |-- Tasks DB
|   |-- Meetings DB
|   |-- Finance DB
|-- Intelligence
|   |-- Briefings DB
|   |-- Knowledge Base DB
|   |-- Research DB
|   |-- Reports DB
|-- Content & Deliverables
|   |-- Content DB
|   |-- Deliverables DB
|   |-- Prompts DB
|-- Growth & Meta
    |-- Goals DB
    |-- Milestones DB (linked to Goals)
    |-- Learnings DB
    |-- Weekly Insights DB (linked to Learnings)
    |-- Workflows DB
    |-- Activity Log DB
```

---

## 4. Database Consolidation Map

### 4.1 CRM Hub (The Heart)

#### Companies DB
- **Source:** CRM Pro Companies (new template) + P10 Health Scores + P20 Dossiers
- **Absorbs:** Client Health Dashboard scores become properties on Companies; Client Dossiers become a rich_text property on Companies
- **Properties:**
  - Name (title)
  - Industry (select)
  - Size (select): Startup, SMB, Mid-Market, Enterprise
  - Status (select): Active, Prospect, Churned, Partner
  - Website (url)
  - Contacts (relation -> Contacts)
  - Deals (relation -> Deals)
  - Communications (relation -> Communications)
  - **Health Score** (number, 0-100) - from P10
  - **Health Status** (select): Green, Yellow, Red - from P10
  - **Risk Flags** (multi_select) - from P10
  - **Dossier** (rich_text, JSON) - from P20
  - **Dossier Completeness** (number, 0.0-1.0) - from P20
  - **Dossier Generated At** (date) - from P20
  - **Dossier Stale** (checkbox) - from P20
  - Last Scanned (date) - health score cache TTL
  - Notes (rich_text)

#### Contacts DB
- **Source:** CRM Pro Contacts (new template)
- **Properties:**
  - Name (title)
  - Email (email)
  - Phone (phone_number)
  - Role (rich_text)
  - Company (relation -> Companies)
  - Type (select): Decision Maker, Champion, User, Influencer, Blocker
  - Last Contact (date)
  - Communications (relation -> Communications)

#### Deals DB
- **Source:** CRM Pro Deals (new template)
- **Properties:**
  - Name (title)
  - Value (number)
  - Stage (select): Lead, Qualified, Proposal, Negotiation, Closed Won, Closed Lost
  - Company (relation -> Companies)
  - Close Date (date)
  - Probability (number, 0-100)
  - Risk Level (select): Low, Medium, High
  - Deliverables (relation -> Deliverables)

#### Communications DB
- **Source:** P21 CRM Sync Hub (unchanged, just formalized as template)
- **Properties:** Title, Type, Date, Contact, Company, Summary, Sentiment, Thread ID, Participants, Direction, Source, Synced At

### 4.2 Operations

#### Tasks DB
- **Merges:** P01 Inbox Zero Action Items + P04 Action Item Extractor Tasks + P06 Follow-Up Tracker Follow-Ups
- **Properties:**
  - Title (title)
  - Description (rich_text)
  - Type (select): Action Item, Follow-Up, Email Task
  - Source Plugin (select): Inbox Zero, Action Extractor, Follow-Up Tracker
  - Owner (rich_text)
  - Status (select): To Do, In Progress, Done, Waiting
  - Priority (number, 1-5)
  - Deadline (date)
  - Company (relation -> Companies) - optional
  - Contact (relation -> Contacts) - optional
  - Source Type (select): Email, Meeting, Document, Manual
  - Source Title (rich_text)
  - Promise Type (select): Outbound, Inbound - from P06
  - Days Waiting (number) - from P06
  - Nudge Count (number) - from P06
  - Thread ID (rich_text) - deduplication key for email-sourced tasks
  - Extracted At (date)

#### Meetings DB
- **Merges:** P03 Meeting Prep Autopilot Prep Notes + P07 Meeting Intelligence Hub Analyses
- **Properties:**
  - Meeting Title (title)
  - Event ID (rich_text) - idempotent key
  - Date (date)
  - Meeting Type (select): External Client, One-on-One, Internal Sync, Ad-Hoc, Recurring, Group
  - Attendees (rich_text)
  - Company (relation -> Companies) - optional
  - Importance Score (number, 1-5) - from P03
  - Prep Notes (rich_text) - from P03 prep
  - Talking Points (rich_text) - from P03
  - Sources Used (multi_select) - from P03
  - Source Type (select): Fireflies, Otter, Gemini, Notion, Generic - from P07
  - Transcript File (rich_text) - from P07
  - Summary (rich_text) - from P07 analysis
  - Decisions (rich_text) - from P07
  - Follow-Ups (rich_text) - from P07
  - Topics (multi_select) - from P07
  - Duration (number) - from P07
  - Generated At (date)

#### Finance DB
- **Merges:** P11 Invoice Processor Invoices + P16 Expense Report Builder Reports
- **Properties:**
  - Title (title) - Invoice # or Report Title
  - Type (select): Invoice, Expense
  - Company (relation -> Companies) - vendor/client
  - Amount (number)
  - Currency (select)
  - Date (date) - invoice date or report date
  - Due Date (date) - invoices only
  - Category (select): 14 categories from P11/P16
  - Tax Deductible (select): Full, Partial, No
  - Budget Code (select): OPS, TECH, SVC, TRV, FAC, ADM, MKT, HR, GEN
  - Status (select): Pending, Approved, Rejected, Paid
  - Extraction Confidence (number) - invoices only
  - Source File (rich_text)
  - Line Items (rich_text) - invoices only
  - Date Range (rich_text) - expense reports only
  - Processed At (date)

### 4.3 Intelligence

#### Briefings DB
- **Merges:** P02 Daily Briefings + P05 Weekly Reviews + P19 Slack Digests + P22 Morning Sync
- **Properties:**
  - Title (title)
  - Type (select): Daily Briefing, Weekly Review, Slack Digest, Morning Sync
  - Date (date) - primary key with Type for idempotent upsert
  - Content (rich_text) - the briefing/review body
  - Meeting Count (number)
  - Email Count (number)
  - Task Count (number)
  - Overdue Tasks (number) - from P02
  - Slack Highlights (rich_text) - from P19/P22
  - Drive Updates (rich_text) - from P22
  - Sources Used (multi_select)
  - Time Window (rich_text) - from P19/P22
  - Week Ending (date) - from P05
  - Blockers (rich_text) - from P05
  - Carryover Items (rich_text) - from P05
  - Next Week Priorities (rich_text) - from P05
  - Generated At (date)

#### Knowledge Base DB
- **Source:** P23 Knowledge Base Q&A (Sources + Queries combined with Type column)
- **Properties:**
  - Title (title) - source title or query text
  - Type (select): Source, Query
  - URL (url) - sources only
  - Source Type (select) - sources only
  - Classification (select): Wiki, Meeting Notes, Project Docs, Process, Reference, Template, Database, Archive, Other
  - Topic Keywords (multi_select)
  - Word Count (number) - sources only
  - Freshness (select): Fresh, Current, Aging, Stale
  - Answered (checkbox) - queries only
  - Confidence (select): High, Medium, Low - queries only
  - Sources Used (number) - queries only
  - Answer Excerpt (rich_text) - queries only
  - Status (select)
  - Indexed At / Asked At (date)

#### Research DB
- **Merges:** P08 Newsletter Research + P15 Competitive Intel Research
- **Properties:**
  - Title (title) - topic or company name
  - Type (select): Newsletter Research, Competitive Analysis
  - Company (relation -> Companies) - competitive entries
  - Date Range (rich_text) - P08
  - Total Findings (number) - P08
  - Sources Searched (multi_select) - P08
  - Key Themes (rich_text) - P08
  - Domain (url) - P15
  - Pricing Model (rich_text) - P15
  - Starting Price (rich_text) - P15
  - Positioning Archetype (select) - P15
  - Review Score (number) - P15
  - Strengths (rich_text) - P15
  - Weaknesses (rich_text) - P15
  - Strategic Recommendations (rich_text) - P15
  - Report File (rich_text)
  - Researched At (date)

#### Reports DB
- **Merges:** P09 Report Generator Reports + P25 Time Savings Calculator Reports
- **Properties:**
  - Title (title) - report title
  - Type (select): Business Report, ROI Report
  - Status (select)
  - Date Range (rich_text)
  - Data Sources (multi_select) - P09
  - Template Used (rich_text) - P09
  - Executive Summary (rich_text) - P09
  - QA Notes (rich_text) - P09
  - Total Hours Saved (number) - P25
  - Dollar Value (number) - P25
  - Tasks Automated (number) - P25
  - Active Plugins (number) - P25
  - Top Category (rich_text) - P25
  - Output Path (rich_text)
  - Generated At (date)

### 4.4 Content & Deliverables

#### Content DB
- **Merges:** P08 Newsletter Drafts + P24 LinkedIn Posts + P01 Email Drafts
- **Properties:**
  - Title (title) - post topic or email subject
  - Type (select): Newsletter, LinkedIn Post, Email Draft
  - Content (rich_text) - the body
  - Status (select): Draft, To Review, Approved, Published, Sent to Gmail
  - Company (relation -> Companies) - optional, for client-related content
  - Framework (select) - P24: Story, Listicle, Contrarian, HowTo, Lesson, Insight, Question
  - Audience (select) - P24: Founder, Technical, Marketer, CXO
  - Length (select) - P24: Short, Medium, Long
  - Hashtags (rich_text) - P24
  - Style Notes (rich_text) - P24
  - Output File (rich_text)
  - Generated At (date)

#### Deliverables DB
- **Merges:** P12 Proposals + P13 Contracts + P14 SOWs
- **Properties:**
  - Title (title) - project title or contract name
  - Type (select): Proposal, Contract, SOW
  - Company (relation -> Companies)
  - Deal (relation -> Deals) - optional
  - Status (select): Draft, Sent, Under Review, Signed, Rejected, Expired
  - Amount (number) - proposal/SOW total
  - Package Selected (select) - P12: Good, Better, Best
  - Risk Level (select) - P13: Green, Yellow, Red
  - Risk Flags (rich_text) - P13 risk details
  - Contract Type (select) - P13: SaaS, Freelance, Agency, NDA, Employment, Vendor
  - Key Terms (rich_text) - P13 extracted terms
  - File Path (rich_text)
  - Brief File (rich_text) - P12/P14
  - Sources Used (multi_select)
  - Generated At (date)

#### Prompts DB
- **Source:** P26 Team Prompt Library (unchanged)
- **Properties:** Name, Content, Category, Variables, Visibility, Times Used, Author, Tags, Created At, Last Used

### 4.5 Growth & Meta

#### Goals DB
- **Source:** P30 Goal Progress Tracker (unchanged)
- **Properties:** Title, Description, Status, Progress, Target Date, Start Date, Category, RAG Status, Projected Completion, Milestone Count, Completed Milestones, Progress Snapshots, Notes, Created At

#### Milestones DB
- **Source:** P30 Goal Progress Tracker (unchanged)
- **Properties:** Title, Goal (relation -> Goals), Status, Due Date, Completed At, Order, Notes, Created At

#### Learnings DB
- **Source:** P29 Learning Log Tracker (unchanged)
- **Properties:** Title, Insight, Topics, Source Type, Context, Related IDs, Related Titles, Week, Logged At

#### Weekly Insights DB
- **Source:** P29 Learning Log Tracker (unchanged)
- **Properties:** Week, Summary, Top Themes, Learning Count, Most Active Topic, Key Connections, Learnings List, Streak Days, Vs Last Week, Source Mix, Generated At

#### Workflows DB
- **Merges:** P27 Workflow Automator Executions + P28 Workflow Documenter SOPs
- **Properties:**
  - Title (title) - workflow/SOP name or Run ID
  - Type (select): Execution, SOP
  - Status (select) - running/completed/failed for executions; draft/published for SOPs
  - Description (rich_text)
  - Steps Count (number)
  - Steps Completed (number) - executions
  - Steps Failed (number) - executions
  - Steps Skipped (number) - executions
  - Started At (date) - executions
  - Completed At (date) - executions
  - Duration (rich_text) - executions
  - Triggered By (select) - executions
  - Workflow Version (rich_text) - executions
  - Context Snapshot (rich_text) - executions
  - Error Summary (rich_text) - executions
  - Tools Used (multi_select) - SOPs
  - Handoff Points (number) - SOPs
  - Complexity (select) - SOPs: Simple, Moderate, Complex, Very Complex
  - SOP File Path (rich_text) - SOPs
  - Diagram Included (checkbox) - SOPs
  - Generated At (date)

#### Activity Log DB
- **Source:** P18 Google Drive Brain Activity (unchanged)
- **Properties:** Query, Command Type, Files Found, Top Result, File IDs, Folder Context, Sources Used, Generated At

---

## 5. Relation Map

All arrows point toward the CRM core. This means opening any Company page shows all related records across the entire workspace.

```
Companies <-- Contacts (Company)
Companies <-- Deals (Company)
Companies <-- Communications (Company)
Companies <-- Tasks (Company, optional)
Companies <-- Meetings (Company, optional)
Companies <-- Finance (Company)
Companies <-- Research (Company, for competitive)
Companies <-- Deliverables (Company)
Companies <-- Content (Company, optional)

Contacts <-- Communications (Contact)
Contacts <-- Tasks (Contact, optional)
Deals <-- Deliverables (Deal, optional)
Goals <-- Milestones (Goal)
```

---

## 6. Command Center Dashboard

The main landing page with linked database views:

| Widget | Source DB | Filter | View |
|--------|-----------|--------|------|
| Today's Priorities | Tasks | Due Today + Overdue, Status != Done | Table, sorted by Priority |
| Client Health | Companies | Health Status = Yellow OR Red | Table, sorted by Health Score asc |
| Upcoming Meetings | Meetings | Date in next 48h | Table, sorted by Date |
| Recent Activity | Communications | Last 7 days | Table, sorted by Date desc |
| Pipeline | Deals | Stage != Closed Won/Lost | Board by Stage |
| Open Follow-Ups | Tasks | Type = Follow-Up, Status = Waiting | Table, sorted by Days Waiting desc |
| Active Goals | Goals | Status = In Progress | Table with progress bars |
| Latest Briefing | Briefings | Most recent by Generated At | Single page embed |

---

## 7. Plugin Changes Required

### 7.1 High Impact (schema changes + new relations)

| Plugin | Current DB(s) | Target DB | Key Changes |
|--------|---------------|-----------|-------------|
| P01 Inbox Zero | Action Items, Drafts | Tasks, Content | Write Type="Email Task" to Tasks; Type="Email Draft" to Content |
| P04 Action Item Extractor | Tasks | Tasks | Write Type="Action Item"; add Company/Contact relation when available |
| P06 Follow-Up Tracker | Follow-Ups | Tasks | Write Type="Follow-Up"; map promise/nudge fields |
| P10 Client Health | Health Scores | Companies | Write health properties directly to Companies DB |
| P11 Invoice Processor | Invoices | Finance | Write Type="Invoice"; add Company relation for vendor |
| P12 Proposal Automator | Proposals | Deliverables | Write Type="Proposal"; add Company + Deal relations |
| P13 Contract Analyzer | Analyses | Deliverables | Write Type="Contract"; add Company relation |
| P14 SOW Generator | (Notion output) | Deliverables | Write Type="SOW"; add Company + Deal relations |
| P16 Expense Report Builder | Reports | Finance | Write Type="Expense"; reads from Finance DB (Type=Invoice) instead of P11 DB |
| P20 Client Context | Client Dossiers | Companies | Write dossier properties directly to Companies DB |

### 7.2 Medium Impact (DB name change + Type column)

| Plugin | Current DB | Target DB | Key Changes |
|--------|-----------|-----------|-------------|
| P02 Daily Briefing | Briefings | Briefings | Write Type="Daily Briefing" |
| P03 Meeting Prep | Prep Notes | Meetings | Write prep fields; share Event ID key |
| P05 Weekly Review | Reviews | Briefings | Write Type="Weekly Review" |
| P07 Meeting Intel | Analyses | Meetings | Write analysis fields; match by Event ID |
| P08 Newsletter Engine | Research | Research + Content | Research Type="Newsletter Research"; drafts to Content Type="Newsletter" |
| P15 Competitive Intel | Research | Research | Write Type="Competitive Analysis"; add Company relation |
| P19 Slack Digest | Digests | Briefings | Write Type="Slack Digest" |
| P22 Morning Sync | Briefings | Briefings | Write Type="Morning Sync" |
| P24 LinkedIn Post | Posts | Content | Write Type="LinkedIn Post" |
| P27 Workflow Automator | Executions | Workflows | Write Type="Execution" |
| P28 Workflow Documenter | SOPs | Workflows | Write Type="SOP" |

### 7.3 Low Impact (DB name standardization only)

| Plugin | Change |
|--------|--------|
| P09 Report Generator | Reports DB name unchanged, add Type="Business Report" |
| P17 Notion Command Center | No DB (operates on user workspace). No change needed. |
| P18 Google Drive Brain | Activity Log DB name unchanged |
| P21 CRM Sync Hub | Communications DB already matches. No change. |
| P23 Knowledge Base Q&A | Merge Sources + Queries into single Knowledge Base DB with Type column |
| P25 Time Savings | Write to Reports DB with Type="ROI Report" |
| P26 Team Prompt Library | Prompts DB name unchanged |
| P29 Learning Log | Learnings + Weekly Insights DBs unchanged |
| P30 Goal Progress | Goals + Milestones DBs unchanged |

### 7.4 Cross-Cutting Changes (all plugins)

1. **Remove lazy DB creation logic** - All databases pre-exist in the template. Plugin discovery should search by name and error if not found (with install instructions).
2. **Add Company relation population** - When a plugin has client context (from user input, email domain, or CRM lookup), populate the Company relation field.
3. **Add Type column writes** - Every merged DB requires the correct Type value on record creation.
4. **Update DB discovery names** - Plugins search for new consolidated DB names instead of plugin-specific names.
5. **Fallback for non-template users** - If the consolidated DB is not found, fall back to lazy creation of the plugin-specific DB (backward compatibility for users who haven't installed the template).

---

## 8. Template Distribution

### Format
- Notion template gallery item (duplicatable workspace)
- Alternative: documented Notion API script that creates the workspace programmatically

### Template Contents
1. Top-level "Founder OS HQ" page
2. 5 section sub-pages (CRM, Operations, Intelligence, Content & Deliverables, Growth & Meta)
3. 18 pre-created databases with all properties, relations, and select options
4. Command Center dashboard page with 8 linked database views
5. Welcome page with setup instructions

### Template JSON
- Single consolidated template JSON file: `_infrastructure/notion-db-templates/founder-os-hq-template.json`
- Contains all 18 database schemas, relations, dashboard view definitions
- Replaces the 32 individual template files (which remain for reference/backward compatibility)

---

## 9. Migration Path

For existing users who already have plugin-specific databases:

1. **Install the template** - Creates the consolidated workspace alongside existing DBs
2. **Run migration script** - Copies records from old plugin DBs to consolidated DBs (preserving data)
3. **Plugins auto-detect** - Updated plugins prefer consolidated DB names, fall back to old names
4. **Archive old DBs** - User manually archives old plugin DBs once satisfied

---

## 10. Open Questions

1. **Notion API limits** - Can we create all 18 DBs + relations + views programmatically, or must we use a manual template?
2. **Rollup properties** - Should Companies have rollups (e.g., "Open Tasks Count", "Total Deal Value") or keep it lean?
3. **Template versioning** - How do we handle template updates as plugins evolve?
4. **P25 Time Savings cross-plugin scanning** - Currently scans 24 separate DBs. Consolidation means fewer DBs to scan but different query logic.
