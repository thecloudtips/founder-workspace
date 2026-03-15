# Founder OS HQ Test Data Preparation Plan

> **Status**: COMPLETED 2026-03-07 — All 224 records populated across 20 databases.

> **Goal**: Populate the deployed [FOS] Founder OS HQ Notion workspace with comprehensive mock data that enables heavy integration testing across all 30 plugins. The data must be internally consistent, cross-referenced, and cover normal, edge-case, and cross-plugin chain scenarios.

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Mock Universe: Entities & Relationships](#2-mock-universe-entities--relationships)
3. [Phase 1: CRM Core (Companies, Contacts, Deals)](#phase-1-crm-core)
4. [Phase 2: Communications & Activity History](#phase-2-communications--activity-history)
5. [Phase 3: Tasks & Follow-Ups](#phase-3-tasks--follow-ups)
6. [Phase 4: Meetings (Prep + Intelligence)](#phase-4-meetings)
7. [Phase 5: Finance (Invoices + Expenses)](#phase-5-finance)
8. [Phase 6: Deliverables (Proposals, Contracts, SOWs)](#phase-6-deliverables)
9. [Phase 7: Briefings & Reports](#phase-7-briefings--reports)
10. [Phase 8: Content & Research](#phase-8-content--research)
11. [Phase 9: Knowledge Base & Prompts](#phase-9-knowledge-base--prompts)
12. [Phase 10: Goals, Milestones, & Learnings](#phase-10-goals-milestones--learnings)
13. [Phase 11: Workflows & Activity Log](#phase-11-workflows--activity-log)
14. [Phase 12: Cross-Plugin Chain Validation Data](#phase-12-cross-plugin-chains)
15. [Test Plan Improvements](#13-test-plan-improvements)
16. [Execution Order & Dependencies](#14-execution-order--dependencies)

---

## 1. Design Principles

1. **Single consistent universe** -- all mock data shares the same company names, contact emails, deal values, and timelines so cross-plugin lookups succeed naturally.
2. **RAG coverage** -- every scored/classified entity includes Green, Yellow, AND Red examples to test all tiers.
3. **Edge case seeding** -- include deliberately broken, empty, stale, or extreme records to test graceful degradation.
4. **Temporal realism** -- dates span 90 days back from "today" (test execution date), with some records in the future for upcoming/scheduled scenarios.
5. **Relation integrity** -- every Company relation, Contact relation, Deal relation, and Goal relation must point to real pages in the HQ workspace. No orphan references.
6. **Type column discipline** -- every record in a shared database MUST have its Type column set correctly (e.g., "Action Item", "Follow-Up", "Invoice", "Expense").
7. **Idempotent seeding** -- the data population script must be re-runnable without creating duplicates (match by title/name + type).

---

## 2. Mock Universe: Entities & Relationships

### 2.1 Companies (8 total)

| # | Company Name | Industry | Size | Status | Health Tier | Purpose |
|---|-------------|----------|------|--------|-------------|---------|
| C1 | Acme Corp | Technology | 51-200 | Active | Green (85+) | Happy client, all data present, fast responses |
| C2 | Meridian Financial | Finance | 201-1000 | Active | Yellow (55-65) | Needs attention, slow responses, some overdue tasks |
| C3 | RetailCo | Retail | 11-50 | Active | Red (<40) | At-risk client, 30+ days no contact, overdue invoices |
| C4 | StartupXYZ | Technology | 1-10 | Prospect | Yellow (new) | New client (<30 days in CRM), limited data, new-client floor test |
| C5 | GreenLeaf Organics | Agriculture | 11-50 | Active | Green (90+) | Perfect client, all invoices paid, positive sentiment |
| C6 | Dormant Industries | Manufacturing | 201-1000 | Churned | N/A | Churned client, excluded from default scans, included with --all |
| C7 | NaluForge | Technology | 1-10 | Active | Green (80) | Self-referential (the user's own company), for content/newsletter testing |
| C8 | Partner Agency | Professional Services | 11-50 | Partner | N/A | Partner status, excluded from health scans, tests status filtering |

### 2.2 Contacts (15 total)

| # | Name | Email | Company | Type | Role |
|---|------|-------|---------|------|------|
| K1 | Sarah Chen | sarah@acmecorp.com | C1 | Decision Maker | VP Engineering |
| K2 | Mike Torres | mike@acmecorp.com | C1 | Champion | Product Manager |
| K3 | James Wright | james@meridianfin.com | C2 | Decision Maker | CFO |
| K4 | Priya Patel | priya@meridianfin.com | C2 | User | Account Manager |
| K5 | David Kim | david@retailco.com | C3 | Blocker | Procurement Director |
| K6 | Lisa Wang | lisa@retailco.com | C3 | Champion | Operations Manager |
| K7 | Alex Novak | alex@startupxyz.io | C4 | Decision Maker | CEO |
| K8 | Jordan Rivera | jordan@greenleaf.com | C5 | Decision Maker | Founder |
| K9 | Emma Thompson | emma@greenleaf.com | C5 | User | Office Manager |
| K10 | Robert Foster | robert@dormant-ind.com | C6 | Decision Maker | CEO |
| K11 | Taylor Brooks | taylor@naluforge.com | C7 | Champion | CTO |
| K12 | Sam Peters | sam@partneragency.com | C8 | Influencer | Partner Lead |
| K13 | No Reply Bot | noreply@acmecorp.com | C1 | User | System (exclusion test) |
| K14 | Newsletter Sender | newsletter@techdigest.com | -- | -- | -- (exclusion test) |
| K15 | Billing System | billing@retailco.com | C3 | User | System (exclusion test) |

### 2.3 Deals (6 total)

| # | Name | Company | Stage | Value | Probability | Risk | Close Date |
|---|------|---------|-------|-------|-------------|------|------------|
| D1 | Acme Portal Build | C1 | Closed Won | $85,000 | 100% | Low | -45 days |
| D2 | Meridian Audit System | C2 | Negotiation | $120,000 | 60% | Medium | +30 days |
| D3 | RetailCo Inventory App | C3 | Proposal | $45,000 | 30% | High | +60 days |
| D4 | StartupXYZ MVP | C4 | Qualified | $25,000 | 50% | Medium | +90 days |
| D5 | GreenLeaf CRM Setup | C5 | Closed Won | $15,000 | 100% | Low | -30 days |
| D6 | Acme Phase 2 | C1 | Lead | $150,000 | 20% | Low | +120 days |

> All dates are relative to test execution date. "-45 days" means 45 days in the past.

---

## Phase 1: CRM Core

**Target databases**: [FOS] Companies, [FOS] Contacts, [FOS] Deals
**Record count**: 8 companies + 15 contacts + 6 deals = 29 records
**Plugins tested**: P10, P15, P20, P21, P03, P12, P14

### Data to populate:

**Companies** -- Create all 8 companies from table 2.1 with:
- All basic properties (Name, Industry, Size, Status, Website)
- Health properties pre-populated for C1, C2, C3, C5 (to test cache reads):
  - C1: Health Score=87, Health Status=Green, Last Scanned=today-2h, Risk Flags=[]
  - C2: Health Score=62, Health Status=Yellow, Last Scanned=today-25h (stale, triggers rescan), Risk Flags=["Slow Response"]
  - C3: Health Score=35, Health Status=Red, Last Scanned=today-2h, Risk Flags=["No Recent Contact", "Payment Issues", "Overdue Tasks"]
  - C5: Health Score=95, Health Status=Green, Last Scanned=today-2h, Risk Flags=[]
- C4 (StartupXYZ): No health properties yet (new client, first scan test)
- C6, C7, C8: No health properties (excluded statuses or self)
- Dossier properties for C1 and C5 (to test P20 cache):
  - C1: Dossier=JSON blob, Completeness=0.85, Generated At=today-12h, Stale=false
  - C5: Dossier=JSON blob, Completeness=0.90, Generated At=today-30h, Stale=true (triggers refresh)

**Contacts** -- Create all 15 contacts from table 2.2 with:
- Company relation linked to correct company page
- K13-K15 exist to test follow-up exclusion rules (no-reply, newsletter, billing)

**Deals** -- Create all 6 deals with:
- Company relation linked to correct company page
- D1 and D5 as Closed Won (historical context for proposals/SOWs)
- D2 in Negotiation (active deal context for meeting prep)
- D3 in Proposal stage (P12 proposal test target)

### Validation checks:
- [ ] All Company ↔ Contact bidirectional relations resolve
- [ ] All Company ↔ Deal bidirectional relations resolve
- [ ] Health Score/Status on C1-C3, C5 are queryable
- [ ] Churned (C6) and Partner (C8) are filterable by Status

---

## Phase 2: Communications & Activity History

**Target database**: [FOS] Communications
**Record count**: 25 records
**Plugins tested**: P21 (writer), P10, P20 (readers)

### Data to populate:

| # | Title | Type | Company | Contact | Date | Direction | Sentiment | Source |
|---|-------|------|---------|---------|------|-----------|-----------|--------|
| COM1 | Re: Portal Requirements | Email Sent | C1 | K1 | -2 days | Outbound | Positive | Gmail |
| COM2 | Re: Portal Requirements | Email Received | C1 | K1 | -3 days | Inbound | Positive | Gmail |
| COM3 | Sprint Planning | Meeting Held | C1 | K2 | -5 days | -- | Positive | Google Calendar |
| COM4 | Re: Invoice #1042 | Email Sent | C1 | K2 | -7 days | Outbound | Neutral | Gmail |
| COM5 | Quarterly Review | Meeting Held | C1 | K1 | -14 days | -- | Positive | Google Calendar |
| COM6 | Re: Audit Timeline | Email Sent | C2 | K3 | -8 days | Outbound | Neutral | Gmail |
| COM7 | Re: Audit Timeline | Email Received | C2 | K3 | -12 days | Inbound | Neutral | Gmail |
| COM8 | Budget Review Call | Meeting Held | C2 | K3 | -20 days | -- | Neutral | Google Calendar |
| COM9 | Re: Scope Change | Email Received | C2 | K4 | -15 days | Inbound | Negative | Gmail |
| COM10 | Re: Deliverable Delay | Email Sent | C2 | K3 | -25 days | Outbound | Neutral | Gmail |
| COM11 | Re: Contract Renewal | Email Sent | C3 | K5 | -35 days | Outbound | Neutral | Gmail |
| COM12 | Re: Contract Renewal | Email Received | C3 | K5 | -40 days | Inbound | Negative | Gmail |
| COM13 | Inventory Demo | Meeting Scheduled | C3 | K6 | +5 days | -- | Neutral | Google Calendar |
| COM14 | Intro Call | Meeting Held | C4 | K7 | -10 days | -- | Positive | Google Calendar |
| COM15 | Re: Proposal Follow-up | Email Sent | C4 | K7 | -5 days | Outbound | Positive | Gmail |
| COM16 | CRM Setup Kickoff | Meeting Held | C5 | K8 | -3 days | -- | Positive | Google Calendar |
| COM17 | Re: Training Schedule | Email Received | C5 | K8 | -1 day | Inbound | Positive | Gmail |
| COM18 | Re: Training Schedule | Email Sent | C5 | K9 | -1 day | Outbound | Positive | Gmail |
| COM19-25 | (7 additional older records) | Mixed | C1-C5 | Various | -30 to -60 days | Mixed | Mixed | Mixed |

### Key design choices:
- **C1 (Acme)**: 5 comms, most recent 2 days ago -> high Last Contact score
- **C2 (Meridian)**: 5 comms, most recent 8 days ago, includes negative sentiment -> Yellow health
- **C3 (RetailCo)**: 2 comms, most recent 35 days ago -> triggers "No Recent Contact" risk flag
- **C4 (StartupXYZ)**: 2 comms, new client -> tests new client floor
- **C5 (GreenLeaf)**: 3 comms, most recent 1 day ago, all positive -> Green health
- Thread IDs set on email records for P06 follow-up thread matching
- COM13 is a future meeting (Meeting Scheduled) for P03 prep testing

### Validation checks:
- [ ] Company and Contact relations all resolve
- [ ] Thread IDs are unique per email thread
- [ ] Date spread covers 1-60 days for decay curve testing
- [ ] At least one Negative sentiment record exists

---

## Phase 3: Tasks & Follow-Ups

**Target database**: [FOS] Tasks
**Record count**: 30 records
**Plugins tested**: P01 (Email Task), P04 (Action Item), P06 (Follow-Up)

### Distribution by Type:

**Action Items (Type="Action Item", Source Plugin="Action Extractor")** -- 12 records

| # | Title | Company | Status | Priority | Deadline | Owner |
|---|-------|---------|--------|----------|----------|-------|
| T1 | Update portal wireframes | C1 | To Do | 2 | +2 days | Sarah Chen |
| T2 | Send revised scope document | C1 | In Progress | 1 | today | Mike Torres |
| T3 | Review audit compliance checklist | C2 | To Do | 2 | +5 days | James Wright |
| T4 | Follow up on budget approval | C2 | To Do | 3 | -3 days (overdue) | -- |
| T5 | Prepare inventory demo materials | C3 | To Do | 1 | +4 days | Lisa Wang |
| T6 | Draft client onboarding doc | C4 | Done | 3 | -2 days | -- |
| T7 | Schedule training sessions | C5 | Done | 2 | -1 day | Jordan Rivera |
| T8 | Fix login bug on staging | C1 | To Do | 1 | -5 days (overdue) | -- |
| T9 | Update project timeline | C2 | To Do | 2 | -1 day (overdue) | Priya Patel |
| T10 | Send meeting summary | C3 | To Do | 3 | -10 days (overdue) | David Kim |
| T11 | Review NDA terms | C4 | To Do | 2 | +7 days | Alex Novak |
| T12 | Archive old project files | C1 | Done | 4 | -7 days | -- |

**Follow-Ups (Type="Follow-Up", Source Plugin="Follow-Up Tracker")** -- 10 records

| # | Title | Company | Contact | Status | Priority | Days Waiting | Promise Type | Thread ID |
|---|-------|---------|---------|--------|----------|-------------|--------------|-----------|
| T13 | Re: Portal API specs | C1 | K1 | Waiting | 2 | 3 | Awaiting Response | thread_001 |
| T14 | Re: Budget approval | C2 | K3 | Waiting | 4 | 18 | Promise Received | thread_002 |
| T15 | Re: Contract renewal terms | C3 | K5 | Waiting | 5 | 35 | Awaiting Response | thread_003 |
| T16 | Re: Onboarding schedule | C4 | K7 | Waiting | 1 | 2 | Awaiting Response | thread_004 |
| T17 | Re: Invoice dispute | C3 | K5 | Waiting | 4 | 21 | Promise Made | thread_005 |
| T18 | Re: Feature request | C1 | K2 | Done | 2 | 0 | Awaiting Response | thread_006 |
| T19 | Re: Partnership proposal | C8 | K12 | Waiting | 3 | 10 | Awaiting Response | thread_007 |
| T20 | Re: Training materials | C5 | K8 | Done | 1 | 0 | Promise Made | thread_008 |
| T21 | Re: Quarterly review prep | C2 | K4 | Waiting | 3 | 8 | Promise Received | thread_009 |
| T22 | Re: Demo feedback | C3 | K6 | Waiting | 3 | 12 | Awaiting Response | thread_010 |

**Email Tasks (Type="Email Task", Source Plugin="Inbox Zero")** -- 8 records

| # | Title | Status | Priority | Source Type |
|---|-------|--------|----------|-------------|
| T23 | Reply to Sarah re: timeline update | To Do | 2 | Email |
| T24 | Forward compliance report to James | To Do | 1 | Email |
| T25 | Schedule call with Alex re: MVP | To Do | 3 | Email |
| T26 | Review attached contract from David | Waiting | 2 | Email |
| T27 | Send project update to all stakeholders | In Progress | 1 | Email |
| T28 | Archive newsletter from TechDigest | Done | 5 | Email |
| T29 | Respond to Jordan re: CRM feedback | Done | 2 | Email |
| T30 | Flag invoice email for processing | To Do | 3 | Email |

### Key design choices:
- **Overdue tasks**: T4, T8, T9, T10 are overdue (tests daily briefing overdue count, health scoring)
- **C3 (RetailCo)**: 4 overdue tasks total -> Open Tasks score < 50 -> "Overdue Tasks" risk flag
- **C1 (Acme)**: 1 overdue task out of 5 active -> manageable ratio
- **Follow-up priority tiers**: Fresh (T16), Gentle (T13), Firm (T19, T21, T22), Urgent (T14), Critical (T15, T17)
- **Done items**: T6, T7, T12, T18, T20, T28, T29 -> weekly review "wins" and time savings
- **Company/Contact relations**: Set on all records where applicable
- **Thread IDs**: Unique per follow-up for deduplication testing

### Validation checks:
- [ ] Type column correctly set on every record
- [ ] Source Plugin correctly set on every record
- [ ] Overdue detection: 4 items with Deadline < today and Status != Done
- [ ] Follow-up priority scoring: at least one record per tier (1-5)
- [ ] Company relations resolve for all client-linked tasks

---

## Phase 4: Meetings

**Target database**: [FOS] Meetings
**Record count**: 12 records
**Plugins tested**: P03 (prep fields), P07 (analysis fields)

### Data to populate:

| # | Meeting Title | Event ID | Date | Type | Company | Importance | Has Prep | Has Analysis |
|---|-------------|----------|------|------|---------|------------|----------|--------------|
| M1 | Acme Portal Sprint Review | evt_001 | -5 days | External Client | C1 | 4 | Yes | Yes |
| M2 | Meridian Budget Discussion | evt_002 | -20 days | External Client | C2 | 5 | Yes | Yes |
| M3 | RetailCo Inventory Demo | evt_003 | +5 days | External Client | C3 | 5 | Yes | No (future) |
| M4 | StartupXYZ Intro Call | evt_004 | -10 days | Ad-Hoc | C4 | 3 | No | Yes |
| M5 | GreenLeaf CRM Kickoff | evt_005 | -3 days | External Client | C5 | 4 | Yes | Yes |
| M6 | Weekly Team Standup | evt_006 | -1 day | Recurring | -- | 2 | No | No |
| M7 | 1:1 with Taylor | evt_007 | -2 days | One-on-One | C7 | 3 | Yes | No |
| M8 | Q1 Strategy Review | evt_008 | -30 days | Group | -- | 4 | Yes | Yes |
| M9 | Cancelled: Meridian Follow-up | evt_009 | -7 days | External Client | C2 | 3 | No | No |
| M10 | Cancelled: RetailCo Check-in | evt_010 | -14 days | External Client | C3 | 3 | No | No |
| M11 | Focus Block: Deep Work | evt_011 | today | -- | -- | 1 | No | No |
| M12 | Partner Sync with Sam | evt_012 | -4 days | One-on-One | C8 | 2 | No | Yes |

### Field population strategy:
- **P03-owned fields** (Prep Notes, Talking Points, Sources Used, Importance Score): Populated on M1, M2, M3, M5, M7, M8
- **P07-owned fields** (Summary, Decisions, Follow-Ups, Topics, Source Type, Transcript File, Duration): Populated on M1, M2, M4, M5, M8, M12
- **Both populated** (M1, M2, M5, M8): Tests cross-plugin coexistence on same record via Event ID
- **M3 (future)**: Only prep, no analysis yet -> tests prep-today batch
- **M9, M10 (cancelled)**: Tests "Meeting Cancellations" risk flag for C2 and C3 (2+ cancellations = flag)
- **M11 (focus block)**: Should be filtered out by prep-today --skip-internal
- **Topics multi_select**: Use values like "Product", "Budget", "Timeline", "Onboarding", "Strategy"

### Validation checks:
- [ ] Event IDs are unique
- [ ] P03 and P07 fields coexist on shared records without overwriting each other
- [ ] Company relations resolve for client meetings
- [ ] Cancelled meetings are distinguishable (no Decisions/Summary)
- [ ] Future meeting (M3) has prep but no analysis

---

## Phase 5: Finance

**Target database**: [FOS] Finance
**Record count**: 25 records (18 invoices + 7 expenses)
**Plugins tested**: P11 (invoices), P16 (expenses), P10 (payment scoring)

### Invoices (Type="Invoice") -- 18 records

| # | Title | Company | Amount | Status | Due Date | Category |
|---|-------|---------|--------|--------|----------|----------|
| F1 | INV-1001 | C1 | $15,000 | Paid | -60 days | Professional Services |
| F2 | INV-1002 | C1 | $25,000 | Paid | -30 days | Professional Services |
| F3 | INV-1003 | C1 | $20,000 | Approved | -5 days | Professional Services |
| F4 | INV-1004 | C1 | $25,000 | Pending | +15 days | Professional Services |
| F5 | INV-2001 | C2 | $30,000 | Paid | -45 days | Professional Services |
| F6 | INV-2002 | C2 | $30,000 | Pending | -10 days (overdue) | Professional Services |
| F7 | INV-2003 | C2 | $30,000 | Pending | -3 days (overdue) | Professional Services |
| F8 | INV-3001 | C3 | $10,000 | Paid | -50 days | Professional Services |
| F9 | INV-3002 | C3 | $10,000 | Rejected | -20 days | Professional Services |
| F10 | INV-3003 | C3 | $15,000 | Pending | -30 days (overdue) | Professional Services |
| F11 | INV-3004 | C3 | $10,000 | Pending | -15 days (overdue) | Professional Services |
| F12 | INV-5001 | C5 | $5,000 | Paid | -45 days | Professional Services |
| F13 | INV-5002 | C5 | $5,000 | Paid | -20 days | Professional Services |
| F14 | INV-5003 | C5 | $5,000 | Paid | -5 days | Professional Services |
| F15 | INV-6001 | -- | $450 | Approved | -10 days | Software & SaaS |
| F16 | INV-6002 | -- | $6,500 | Pending | +5 days | Equipment & Hardware |
| F17 | INV-6003 | -- | $200 | Paid | -7 days | Office Supplies |
| F18 | INV-6004 | -- | $1,200 | Approved | -3 days | Contractor Fees |

### Payment health by company (for P10 scoring):
- **C1**: 3/3 past-due paid, 0 overdue -> Payment Score ~100
- **C2**: 1/2 past-due paid, 2 overdue -> Payment Score ~0 (base 50 - penalty 40)
- **C3**: 1/3 past-due paid, 2 overdue -> Payment Score ~0 (base 33 - penalty 40)
- **C5**: 3/3 past-due paid, 0 overdue -> Payment Score = 100
- **C4**: No invoices -> Payment Score = 75 (neutral default)

### Expenses (Type="Expense") -- 7 records

| # | Title | Amount | Category | Tax Deductible | Budget Code | Date |
|---|-------|--------|----------|---------------|-------------|------|
| F19 | Figma Annual License | $600 | Software & SaaS | Full | TECH | -15 days |
| F20 | Client Lunch - Acme | $185 | Meals & Entertainment | Partial | SVC | -5 days |
| F21 | AWS Hosting - Feb | $2,400 | Software & SaaS | Full | TECH | -30 days |
| F22 | Coworking Space - Mar | $500 | Rent & Facilities | Full | FAC | -2 days |
| F23 | Conference Tickets x2 | $1,800 | Training & Education | Full | HR | -20 days |
| F24 | Office Chair | $450 | Equipment & Hardware | Full | OPS | -10 days |
| F25 | Team Dinner | $320 | Meals & Entertainment | Partial | HR | -8 days |

### Validation checks:
- [ ] Type="Invoice" on F1-F18, Type="Expense" on F19-F25
- [ ] Company relations set on F1-F14 (client invoices)
- [ ] F15-F18 have no Company relation (vendor/operational invoices)
- [ ] Overdue invoices: F6, F7, F10, F11 have Due Date < today and Status != Paid/Approved
- [ ] F16 amount > $5k triggers P11 anomaly detection
- [ ] Tax Deductible and Budget Code set on all expenses
- [ ] 14-category coverage: at least 6 distinct categories present

---

## Phase 6: Deliverables

**Target database**: [FOS] Deliverables
**Record count**: 8 records
**Plugins tested**: P12 (proposals), P13 (contracts), P14 (SOWs)

| # | Title | Type | Company | Deal | Status | Amount | Risk Level |
|---|-------|------|---------|------|--------|--------|------------|
| DV1 | Acme Portal Proposal | Proposal | C1 | D1 | Signed | $85,000 | Green |
| DV2 | Acme Portal SOW | SOW | C1 | D1 | Signed | $85,000 | Green |
| DV3 | Acme Master Services Agreement | Contract | C1 | D1 | Signed | -- | Green |
| DV4 | Meridian Audit Proposal | Proposal | C2 | D2 | Sent | $120,000 | Yellow |
| DV5 | RetailCo Inventory Proposal | Proposal | C3 | D3 | Draft | $45,000 | Red |
| DV6 | StartupXYZ MVP Proposal | Proposal | C4 | D4 | Under Review | $25,000 | Yellow |
| DV7 | GreenLeaf CRM SOW | SOW | C5 | D5 | Signed | $15,000 | Green |
| DV8 | GreenLeaf NDA | Contract | C5 | -- | Signed | -- | Green |

### Key design choices:
- **DV1-DV3**: Full lifecycle for Acme (Proposal -> SOW -> Contract, all Signed) -> tests P12->P14 chain
- **DV4**: Sent but pending -> tests active proposal tracking
- **DV5**: Draft with Red risk -> tests risk flag detection
- **DV8**: Contract without Deal relation -> tests optional relation handling
- Company AND Deal relations set where applicable
- Contract Type set on DV3 ("Agency") and DV8 ("NDA")
- Package Selected on proposals (DV1: "Best", DV4: "Better", DV5: "Good", DV6: "Better")

### Validation checks:
- [ ] Type column correctly set (Proposal/Contract/SOW)
- [ ] Company and Deal relations resolve
- [ ] All 6 Status values represented across records
- [ ] Risk Level covers Green, Yellow, Red

---

## Phase 7: Briefings & Reports

**Target database**: [FOS] Briefings (8 records), [FOS] Reports (5 records)
**Plugins tested**: P02, P05, P09, P16, P19, P22, P25

### Briefings -- 8 records

| # | Title | Type | Date | Key Metrics |
|---|-------|------|------|-------------|
| B1 | Daily Briefing 2026-03-07 | Daily Briefing | today | 5 meetings, 12 emails, 8 tasks, 3 overdue |
| B2 | Daily Briefing 2026-03-06 | Daily Briefing | -1 day | 3 meetings, 8 emails, 6 tasks, 2 overdue |
| B3 | Daily Briefing 2026-03-05 | Daily Briefing | -2 days | 4 meetings, 10 emails, 7 tasks, 4 overdue |
| B4 | Weekly Review W09 | Weekly Review | -3 days | Content: full review text |
| B5 | Weekly Review W08 | Weekly Review | -10 days | Content: full review text |
| B6 | Slack Digest 2026-03-07 | Slack Digest | today | 3 channels, 45 messages, 2 decisions |
| B7 | Morning Sync 2026-03-07 | Morning Sync | today | 5 sources, overnight window 12h |
| B8 | Morning Sync 2026-03-06 | Morning Sync | -1 day | 4 sources (Slack unavailable) |

### Reports -- 5 records

| # | Title | Type | Date Range | Key Data |
|---|-------|------|------------|----------|
| R1 | Q1 Business Review | Business Report | Q1 2026 | Template: full-business-report |
| R2 | March Expense Report | Expense Report | 2026-03 | Total: $6,255, 7 invoices |
| R3 | February Expense Report | Expense Report | 2026-02 | Total: $4,800 (trend comparison) |
| R4 | Weekly ROI - W09 | ROI Report | W09 2026 | 45 tasks, 12.5 hrs saved |
| R5 | Monthly ROI - Feb 2026 | ROI Report | 2026-02 | 180 tasks, 52 hrs saved |

### Validation checks:
- [ ] Type column set on all briefings and reports
- [ ] Idempotent keys work (Date + Type for briefings, Title + Date Range for reports)
- [ ] Sources Used multi_select populated
- [ ] B8 demonstrates partial source availability

---

## Phase 8: Content & Research

**Target database**: [FOS] Content (6 records), [FOS] Research (4 records)
**Plugins tested**: P01 (drafts), P08 (newsletters), P15 (competitive intel), P24 (LinkedIn)

### Content -- 6 records

| # | Title | Type | Status | Company | Framework |
|---|-------|------|--------|---------|-----------|
| CT1 | Re: Portal timeline update | Email Draft | To Review | C1 | -- |
| CT2 | Re: Budget discussion follow-up | Email Draft | Approved | C2 | -- |
| CT3 | Re: Partnership opportunity | Email Draft | Sent to Gmail | C8 | -- |
| CT4 | AI Automation for SMBs | Newsletter | Draft | -- | -- |
| CT5 | Why Most Founders Ignore Ops | LinkedIn Post | Published | -- | Contrarian |
| CT6 | 5 Tools Every Solo Founder Needs | LinkedIn Post | Draft | -- | Listicle |

### Research -- 4 records

| # | Title | Type | Company | Key Data |
|---|-------|------|---------|----------|
| RS1 | AI Automation Trends | Newsletter Research | -- | 12 findings, Web+GitHub+Reddit |
| RS2 | Notion Competitive Analysis | Competitive Analysis | -- | Review Score 4.2/5 |
| RS3 | Linear Competitive Analysis | Competitive Analysis | -- | Review Score 4.5/5 |
| RS4 | Asana Competitive Analysis | Competitive Analysis | -- | Review Score 3.8/5 |

### Validation checks:
- [ ] Email Drafts have Company relation (CT1-CT3)
- [ ] Draft lifecycle: To Review -> Approved -> Sent to Gmail represented
- [ ] LinkedIn posts have Framework and Audience set
- [ ] Research entries have Sources Searched multi_select

---

## Phase 9: Knowledge Base & Prompts

**Target database**: [FOS] Knowledge Base (8 records), [FOS] Prompts (6 records)
**Plugins tested**: P23, P26

### Knowledge Base -- 8 records

| # | Title | Type | Classification | Freshness |
|---|-------|------|----------------|-----------|
| KB1 | Company Wiki: Processes | Source | wiki | Fresh |
| KB2 | Onboarding Guide | Source | process | Fresh |
| KB3 | API Documentation | Source | reference | Current |
| KB4 | Q4 2025 Meeting Notes | Source | meeting-notes | Aging |
| KB5 | Old Project Templates | Source | template | Stale |
| KB6 | What is our refund policy? | Query | -- | -- |
| KB7 | How do we handle client escalations? | Query | -- | -- |
| KB8 | What tools do we use for CI/CD? | Query | -- | -- |

### Prompts -- 6 records

| # | Name | Category | Visibility | Times Used | Variables |
|---|------|----------|------------|------------|-----------|
| PR1 | Client Intro Email | Sales | Shared | 15 | {{client_name}}, {{project}} |
| PR2 | Meeting Summary Template | Productivity | Shared | 8 | {{meeting_title}}, {{date}} |
| PR3 | Bug Report Format | Engineering | Personal | 3 | {{component}}, {{severity}} |
| PR4 | Weekly Status Update | Communication | Shared | 22 | {{week}}, {{highlights}} |
| PR5 | Code Review Checklist | Engineering | Personal | 5 | {{pr_url}} |
| PR6 | Proposal Opening Paragraph | Sales | Shared | 12 | {{client_name}}, {{pain_point}} |

### Validation checks:
- [ ] Type="Source" vs Type="Query" correctly set in KB
- [ ] Freshness tiers cover all 4 values (Fresh/Current/Aging/Stale)
- [ ] Prompts have Variables as comma-separated {{}} syntax in rich_text
- [ ] Times Used > 0 for usage tracking tests

---

## Phase 10: Goals, Milestones, & Learnings

**Target databases**: [FOS] Goals (4), [FOS] Milestones (12), [FOS] Learnings (10), [FOS] Weekly Insights (3)
**Plugins tested**: P29, P30

### Goals -- 4 records

| # | Title | Category | Status | Progress | Target Date | RAG |
|---|-------|----------|--------|----------|-------------|-----|
| G1 | Launch MVP by Q2 | Product | In Progress | 60% | +75 days | Green |
| G2 | Close 5 new clients | Revenue | In Progress | 40% | +45 days | Yellow |
| G3 | Reduce churn to <5% | Customer Success | In Progress | 20% | +30 days | Red |
| G4 | Build team to 10 | Hiring | Not Started | 0% | +120 days | Green |

### Milestones (linked to Goals) -- 12 records

| # | Title | Goal | Status | Due Date | Order |
|---|-------|------|--------|----------|-------|
| MS1 | Design mockups | G1 | Done | -20 days | 1 |
| MS2 | Build prototype | G1 | Done | -5 days | 2 |
| MS3 | User testing | G1 | In Progress | +10 days | 3 |
| MS4 | Launch beta | G1 | Not Started | +45 days | 4 |
| MS5 | Production deploy | G1 | Not Started | +70 days | 5 |
| MS6 | Close Acme Phase 2 | G2 | Not Started | +30 days | 1 |
| MS7 | Close StartupXYZ | G2 | In Progress | +15 days | 2 |
| MS8 | Close 3 more leads | G2 | Not Started | +40 days | 3 |
| MS9 | Implement health dashboard | G3 | Done | -10 days | 1 |
| MS10 | Run client outreach campaign | G3 | In Progress | +5 days | 2 |
| MS11 | Achieve <5% monthly churn | G3 | Not Started | +25 days | 3 |
| MS12 | Post job listings | G4 | Not Started | +30 days | 1 |

### Learnings -- 10 records

| # | Title | Topics | Source Type | Week |
|---|-------|--------|------------|------|
| L1 | Batch processing reduces API rate limits | Technical, Tool | experiment | 2026-W09 |
| L2 | Client demos work better with live data | Business, Strategy | experience | 2026-W09 |
| L3 | Notion relations simplify cross-referencing | Technical, Tool | observation | 2026-W09 |
| L4 | Always confirm scope changes in writing | Process, Mistake | experience | 2026-W09 |
| L5 | Weekly reviews catch blockers earlier | Process, Win | observation | 2026-W08 |
| L6 | Automated follow-ups save 2hrs/week | Business, Win | experiment | 2026-W08 |
| L7 | CRM data quality affects all downstream plugins | Technical, Process | observation | 2026-W08 |
| L8 | Client health scores predict churn risk | Business, Strategy | reading | 2026-W07 |
| L9 | SOW options reduce negotiation cycles | Business, Win | experience | 2026-W07 |
| L10 | Never skip the QA agent in report generation | Process, Mistake | experience | 2026-W06 |

### Weekly Insights -- 3 records

| # | Week | Learning Count | Most Active Topic | Streak | Vs Last Week |
|---|------|---------------|-------------------|--------|--------------|
| WI1 | 2026-W09 | 4 | Technical | 4 | More active |
| WI2 | 2026-W08 | 3 | Business | 3 | Same pace |
| WI3 | 2026-W07 | 2 | Business | 2 | More active |

### Validation checks:
- [ ] Milestone -> Goal relations all resolve
- [ ] Goal progress matches milestone completion formula
- [ ] RAG status covers Green, Yellow, Red
- [ ] Learnings Week field matches ISO week format
- [ ] Weekly Insights streak is consecutive (W07, W08, W09)
- [ ] Topics multi_select uses the 10-category taxonomy

---

## Phase 11: Workflows & Activity Log

**Target databases**: [FOS] Workflows (4), [FOS] Activity Log (5)
**Plugins tested**: P27, P28, P18

### Workflows -- 4 records

| # | Title | Type | Status | Steps | Triggered By |
|---|-------|------|--------|-------|--------------|
| WF1 | Morning Routine | Execution | Completed | 5/5/0/0 | Schedule |
| WF2 | Client Onboarding | Execution | In Progress | 3/2/0/1 | Manual |
| WF3 | Client Onboarding SOP | SOP | -- | 8 steps | Manual |
| WF4 | Invoice Processing SOP | SOP | -- | 6 steps | Manual |

### Activity Log -- 5 records

| # | Query | Command Type | Files Found |
|---|-------|-------------|-------------|
| AL1 | Q1 revenue report | Search | 3 |
| AL2 | Client Projects/Acme | Search | 5 |
| AL3 | What was Q4 revenue? | Ask | 2 |
| AL4 | Summarize project plan | Summarize | 1 |
| AL5 | Organize client-projects | Organize | 15 |

---

## Phase 12: Cross-Plugin Chain Validation Data

These are specific data configurations that ensure cross-plugin workflows can be tested end-to-end.

### Chain 1: P01 -> P06 (Inbox Zero -> Follow-Up Tracker)
- Email Task T23-T30 in [FOS] Tasks with Source Plugin="Inbox Zero"
- Follow-up T13-T22 with Thread IDs matching hypothetical Gmail threads
- **Test**: P06 scan should find threads where user sent last message; P01 email tasks should not collide with P06 follow-ups (Type filtering)

### Chain 2: P11 -> P16 -> P25 (Invoice -> Expense Report -> ROI)
- Invoices F1-F18 with Type="Invoice" in [FOS] Finance
- Expenses F19-F25 with Type="Expense" in same DB
- Report R2 (March Expense Report) in [FOS] Reports references Finance data
- Report R4-R5 (ROI Reports) in [FOS] Reports references task counts from [FOS] Tasks
- **Test**: P16 reads Finance DB filtered by Type="Invoice" + Status="Approved"/"Paid"; P25 counts completed tasks across all Type values in [FOS] Tasks

### Chain 3: P03 + P07 (Meeting Prep + Meeting Intelligence)
- Meetings M1, M2, M5, M8 have BOTH prep and analysis fields populated
- **Test**: P03 writes prep fields; P07 writes analysis fields; neither overwrites the other; both use Event ID as idempotent key

### Chain 4: P20 <-> P21 <-> P10 (Client Context <-> CRM Sync <-> Health Dashboard)
- Companies C1-C5 with health properties and dossier properties
- Communications COM1-COM25 linked to companies and contacts
- **Test**: P21 writes Communications; P20 reads Communications + Health Score from Companies; P10 reads Communications for Last Contact metric and Finance for Payment metric

### Chain 5: P12 -> P14 (Proposal -> SOW)
- DV1 (Acme Proposal, Signed) + DV2 (Acme SOW, Signed) linked to same Deal D1
- **Test**: P12 generates proposal with brief file; P14 consumes brief file to generate SOW; both write to [FOS] Deliverables with different Type values

### Chain 6: P02 + P05 + P19 + P22 (Briefings consolidation)
- Briefings B1-B8 with 4 different Type values in same DB
- **Test**: Each plugin reads/writes only its own Type; idempotent by Date+Type; no cross-contamination

---

## 13. Test Plan Improvements

Based on analysis of all 29 existing test plans, the following improvements are recommended:

### 13.1 Missing Test Plan
- **P22 Multi-Tool Morning Sync**: No `tests/integration-test-plan.md` exists. Create one covering: 5-source gathering, overnight window calculation, 3-tier degradation, Source status tracking, Notion DB discovery ("Founder OS HQ - Briefings" with Type="Morning Sync"), idempotent upsert by Date+Type.

### 13.2 Cross-Plugin Test Scenarios to Add (all plugins)

Add a "Cross-Plugin Integration" section to each test plan:

| Plugin | Add Test |
|--------|----------|
| P01 | Verify Email Tasks don't collide with P04 Action Items or P06 Follow-Ups in shared [FOS] Tasks DB (Type filtering) |
| P02 | Verify Daily Briefing reads task counts from [FOS] Tasks across all Type values |
| P04 | Verify extracted Action Items include Company/Contact relations when CRM data exists |
| P06 | Verify follow-ups filtered by Type="Follow-Up" AND Source Plugin="Follow-Up Tracker" |
| P10 | End-to-end: seed CRM + Communications + Finance + Tasks, run health scan, verify all 5 metric scores |
| P11 | Verify approved invoices are readable by P16 via Type="Invoice" filter |
| P16 | Verify expense report reads Finance DB with Type="Invoice" filter (not Type="Expense") |
| P20 | Verify dossier reads Health Score from Companies page (written by P10) |
| P21 | Verify Communications records don't duplicate when re-synced (Thread ID dedup) |
| P25 | Verify cross-plugin discovery scans [FOS] Tasks (all Types), [FOS] Finance, [FOS] Meetings, etc. |

### 13.3 HQ Database Discovery Consistency

All test plans should include these 3 standard scenarios:
1. **HQ DB exists**: Plugin finds "[FOS] <name>" or "Founder OS HQ - <name>" and uses it
2. **Legacy DB exists**: Plugin falls back to plugin-specific DB name
3. **No DB exists**: Plugin either lazy-creates (if specified) or degrades gracefully

**Plugins missing explicit discovery tests**: P17 (Notion Command Center -- operates on user DBs, not its own), P22 (no test plan at all).

### 13.4 Scale Testing Recommendations

Add a "Load Testing" section to test plans for high-volume plugins:

| Plugin | Scale Test |
|--------|-----------|
| P01 | 200+ unread emails in single triage run |
| P06 | 100+ sent threads in 30-day window |
| P10 | 20+ active clients in single health scan |
| P11 | 50+ invoices in batch processing |
| P25 | All 20 HQ databases with 50+ records each |

### 13.5 Temporal Edge Cases

Add to all date-sensitive plugins:
- Timezone handling (user in UTC+1, events in UTC-5)
- Year boundary (Dec 31 -> Jan 1 week calculations)
- Daylight saving time transitions
- "Today" boundary (event at 23:59 vs 00:01)

---

## 14. Execution Order & Dependencies

### Dependency graph (must execute in order):

```
Phase 1: CRM Core (Companies, Contacts, Deals)
    |
    v
Phase 2: Communications (requires Company + Contact relations)
    |
    v
Phase 3: Tasks & Follow-Ups (requires Company + Contact relations)
    |
    v
Phase 4: Meetings (requires Company relations)
    |
    v
Phase 5: Finance (requires Company relations)
    |
    v
Phase 6: Deliverables (requires Company + Deal relations)
    |
    +---> Phase 7: Briefings & Reports (standalone, can parallel with 8-11)
    +---> Phase 8: Content & Research (requires Company relations for some)
    +---> Phase 9: Knowledge Base & Prompts (standalone)
    +---> Phase 10: Goals & Learnings (standalone, internal Goal relation only)
    +---> Phase 11: Workflows & Activity Log (standalone)
    |
    v
Phase 12: Cross-Plugin Validation (verify all relations resolve)
```

### Parallelization opportunities:
- Phases 7, 9, 10, 11 have no inter-dependencies and can run in parallel
- Phase 8 can partially parallel (Research records are standalone; Content with Company relations needs Phase 1)

### Total record count:

| Database | Records |
|----------|---------|
| Companies | 8 |
| Contacts | 15 |
| Deals | 6 |
| Communications | 25 |
| Tasks | 30 |
| Meetings | 12 |
| Finance | 25 |
| Deliverables | 8 |
| Briefings | 8 |
| Reports | 5 |
| Content | 6 |
| Research | 4 |
| Knowledge Base | 8 |
| Prompts | 6 |
| Goals | 4 |
| Milestones | 12 |
| Learnings | 10 |
| Weekly Insights | 3 |
| Workflows | 4 |
| Activity Log | 5 |
| **TOTAL** | **224 records** |

### Estimated execution:
- Phase 1-6 (sequential): ~120 Notion API calls (creates + relation updates)
- Phase 7-11 (parallel): ~50 Notion API calls
- Phase 12 (validation): ~40 Notion API reads
- **Total**: ~210 Notion API calls across all phases

### Implementation approach:
- Use `mcp__plugin_Notion_notion__notion-create-pages` for batch page creation (up to 20 pages per call)
- Use `mcp__plugin_Notion_notion__notion-update-page` for relation wiring that requires page IDs from prior creates
- Collect page IDs from each phase to wire relations in subsequent phases
- Run validation queries after each phase to confirm data integrity
