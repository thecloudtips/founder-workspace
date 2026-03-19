# 🛠️ Pillar 2: Code Without Coding - Full Plugin Specifications

> 8 pluginów tworzących dokumenty, raporty i analizy bez pisania kodu

---

## #09 Report Generator Factory ⭐ PRIORITY 5

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | Code Without Coding |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 3 |
| Agent Teams | Yes - Pipeline pattern |

### Input/Output
- **Input**: Data sources (CSV, Notion DB, API), report template/requirements
- **Output**: Polished report (PDF, DOCX, Markdown), charts, executive summary

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Data source, output | Optional |
| google-drive | Data source, output | Optional |
| filesystem | Local files | ✅ Required |

### Agent Teams Configuration
| Agent | Role | Tools |
|-------|------|-------|
| Research Agent | Gather data from sources | notion, drive |
| Analysis Agent | Process and analyze data | filesystem |
| Writing Agent | Generate report prose | - |
| Formatting Agent | Create charts, format output | filesystem |
| QA Agent | Review for accuracy, consistency | - |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/data-analysis/SKILL.md`
- [ ] `skills/report-writing/SKILL.md`
- [ ] `skills/chart-generation/SKILL.md`
- [ ] `commands/report.md`
- [ ] `commands/report-from-template.md`
- [ ] `teams/config.json`
- [ ] `agents/research-agent.md`
- [ ] `agents/analysis-agent.md`
- [ ] `agents/writing-agent.md`
- [ ] `agents/formatting-agent.md`
- [ ] `agents/qa-agent.md`
- [ ] `templates/report-templates/`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: None
- **Enhances**: #10 Client Health Dashboard (can generate reports from)
- **Data from**: Multiple sources

### Acceptance Criteria
1. [ ] `/report:generate [spec]` creates full report
2. [ ] Supports CSV, JSON, Notion DB as input
3. [ ] Generates charts from numerical data
4. [ ] Outputs PDF, DOCX, or Markdown
5. [ ] Agent Teams: 50+ page reports in single run (128K output)
6. [ ] Includes executive summary

### Blog Angle
"Generate 50-Page Reports in Minutes: The AI Report Factory"

---

## #10 Client Health Dashboard

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | Code Without Coding |
| Type | Standalone |
| Difficulty | Advanced |
| Week | 13 |

### Input/Output
- **Input**: Email history, calendar, Notion CRM, payment data
- **Output**: Notion database with health scores per client

### Health Metrics (per user decision)
1. **Last Contact**: Days since last email/call (0-100 score)
2. **Response Time**: How quickly they reply (0-100 score)
3. **Open Tasks**: Number of unresolved items (0-100 score)
4. **Payment Status**: Invoice status (0-100 score)
5. **Sentiment**: AI analysis of recent communications (0-100 score)

**Overall Health Score**: Weighted average → Green (80+), Yellow (50-79), Red (<50)

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| gmail | Communication history | ✅ Required |
| notion | CRM data, output DB | ✅ Required |
| google-calendar | Meeting frequency | Optional |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/client-health-scoring/SKILL.md`
- [ ] `skills/sentiment-analysis/SKILL.md`
- [ ] `commands/health-scan.md`
- [ ] `commands/health-report.md`
- [ ] `notion-templates/client-health-db.json`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Notion CRM setup
- **Enhances**: #21 CRM Sync Hub
- **Data from**: Gmail, Notion, Calendar MCPs

### Acceptance Criteria
1. [ ] `/client:health-scan` analyzes all clients
2. [ ] Creates/updates Notion DB with scores
3. [ ] Each metric scored 0-100
4. [ ] Overall score with RAG status
5. [ ] `/client:health-report [client]` generates detailed report
6. [ ] Identifies at-risk clients automatically

### Blog Angle
"Know Which Clients Need Attention Before They Churn"

---

## #11 Invoice Processor ⭐ PRIORITY 5

### Overview
| Field | Value |
|-------|-------|
| Platform | Cowork |
| Pillar | Code Without Coding |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 4 |
| Agent Teams | Yes - Pipeline + Batch |

### Input/Output
- **Input**: Invoice PDFs/images from email or folder
- **Output**: Extracted data in Notion/spreadsheet, categorized, ready for accounting

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| gmail | Invoice attachments | Optional |
| google-drive | Invoice folder | Optional |
| notion | Output database | ✅ Required |
| filesystem | Local processing | ✅ Required |

### Agent Teams Configuration
| Agent | Role | Tools |
|-------|------|-------|
| Extraction Agent | OCR and data extraction | filesystem |
| Validation Agent | Verify amounts, dates, vendors | - |
| Categorization Agent | Expense category assignment | - |
| Approval Agent | Flag anomalies, route for approval | notion |
| Integration Agent | Update accounting system | notion |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/invoice-extraction/SKILL.md`
- [ ] `skills/expense-categorization/SKILL.md`
- [ ] `commands/process-invoice.md`
- [ ] `commands/process-folder.md`
- [ ] `teams/config.json`
- [ ] `agents/*.md` (5 agents)
- [ ] `notion-templates/invoice-db.json`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: None
- **Enhances**: #16 Expense Report Builder
- **Data from**: Gmail, Drive, local filesystem

### Acceptance Criteria
1. [ ] `/invoice:process [file]` extracts single invoice
2. [ ] `/invoice:batch [folder]` processes multiple
3. [ ] Extracts: vendor, amount, date, line items
4. [ ] Auto-categorizes expenses
5. [ ] Agent Teams: Process year's invoices in one run (1M context)
6. [ ] Flags duplicates and anomalies

### Blog Angle
"Process a Year of Invoices in 10 Minutes with AI"

---

## #12 Proposal Automator

### Overview
| Field | Value |
|-------|-------|
| Platform | Cowork |
| Pillar | Code Without Coding |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 14 |

### Input/Output
- **Input**: Client brief, scope notes, pricing parameters
- **Output**: Professional proposal document (DOCX/PDF)

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Client data, templates | Optional |
| google-drive | Output storage | Optional |
| filesystem | Generate document | ✅ Required |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/proposal-writing/SKILL.md`
- [ ] `skills/pricing-strategy/SKILL.md`
- [ ] `commands/proposal.md`
- [ ] `commands/proposal-from-brief.md`
- [ ] `templates/proposal-template.docx`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: None
- **Enhances**: #14 SOW Generator (often follows proposal)
- **Data from**: Notion CRM, user input

### Acceptance Criteria
1. [ ] `/proposal:create [client]` generates proposal
2. [ ] Pulls client context from CRM
3. [ ] Includes: exec summary, scope, timeline, pricing, terms
4. [ ] Outputs professional DOCX or PDF
5. [ ] Supports multiple pricing tiers

### Blog Angle
"From Discovery Call to Proposal in 15 Minutes"

---

## #13 Contract Analyzer

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | Code Without Coding |
| Type | Standalone |
| Difficulty | Advanced |
| Week | 15 |

### Input/Output
- **Input**: Contract PDF/DOCX
- **Output**: Summary, risk flags, key terms extraction, comparison to standard

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| filesystem | Read contracts | ✅ Required |
| notion | Store analysis | Optional |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/contract-analysis/SKILL.md`
- [ ] `skills/legal-risk-detection/SKILL.md`
- [ ] `commands/analyze-contract.md`
- [ ] `commands/compare-contracts.md`
- [ ] `templates/contract-checklist.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: None
- **Enhances**: #14 SOW Generator
- **Data from**: Local files

### Acceptance Criteria
1. [ ] `/contract:analyze [file]` generates summary
2. [ ] Extracts key terms: duration, payment, termination, IP
3. [ ] Flags unusual or risky clauses
4. [ ] Compares to your standard terms
5. [ ] Outputs structured report

### Blog Angle
"Read Any Contract in 2 Minutes: AI-Powered Contract Review"

---

## #14 SOW Generator ⭐ PRIORITY 5

### Overview
| Field | Value |
|-------|-------|
| Platform | Cowork |
| Pillar | Code Without Coding |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 5 |
| Agent Teams | Yes - Competing Hypotheses |

### Input/Output
- **Input**: Project brief, requirements, constraints
- **Output**: 3 SOW options (conservative, balanced, ambitious)

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Brief input, historical SOWs | Optional |
| google-drive | Output storage | Optional |
| filesystem | Generate document | ✅ Required |

### Agent Teams Configuration
| Agent | Role | Pattern |
|-------|------|---------|
| Scope Agent A | Conservative interpretation | Competing |
| Scope Agent B | Balanced interpretation | Competing |
| Scope Agent C | Ambitious interpretation | Competing |
| Risk Agent | Identify risks per option | Analysis |
| Pricing Agent | Cost each option | Analysis |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/scope-definition/SKILL.md`
- [ ] `skills/sow-writing/SKILL.md`
- [ ] `skills/risk-assessment/SKILL.md`
- [ ] `commands/sow.md`
- [ ] `commands/sow-from-brief.md`
- [ ] `teams/config.json`
- [ ] `agents/scope-agent-a.md`
- [ ] `agents/scope-agent-b.md`
- [ ] `agents/scope-agent-c.md`
- [ ] `agents/risk-agent.md`
- [ ] `agents/pricing-agent.md`
- [ ] `templates/sow-template.docx`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: None
- **Follows**: #12 Proposal Automator
- **Data from**: User input, Notion briefs

### Acceptance Criteria
1. [ ] `/sow:generate [brief]` creates 3 options
2. [ ] Each option: scope, timeline, deliverables, price
3. [ ] Risk assessment per option
4. [ ] Comparison table across options
5. [ ] Agent Teams: Learn from historical SOWs (context compaction)
6. [ ] Outputs DOCX ready for client

### Blog Angle
"3 Scope Options from 1 Brief: Never Undersell or Overcommit Again"

---

## #15 Competitive Intel Compiler

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | Code Without Coding |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 16 |

### Input/Output
- **Input**: Competitor names/URLs, research questions
- **Output**: Competitive analysis report, comparison matrix

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| web-search | Research competitors | ✅ Required |
| notion | Store findings | Optional |
| filesystem | Output report | ✅ Required |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/competitive-research/SKILL.md`
- [ ] `skills/market-analysis/SKILL.md`
- [ ] `commands/research-competitor.md`
- [ ] `commands/comparison-matrix.md`
- [ ] `templates/competitive-report.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Web search capability
- **Enhances**: Sales preparation
- **Data from**: Web, existing research

### Acceptance Criteria
1. [ ] `/compete:research [company]` gathers intel
2. [ ] Extracts: pricing, features, positioning, reviews
3. [ ] `/compete:matrix [companies...]` creates comparison
4. [ ] Identifies strengths/weaknesses vs you
5. [ ] Outputs structured report

### Blog Angle
"Know Your Competition Better Than They Know Themselves"

---

## #16 Expense Report Builder

### Overview
| Field | Value |
|-------|-------|
| Platform | Cowork |
| Pillar | Code Without Coding |
| Type | Chained |
| Difficulty | Beginner |
| Week | 17 |

### Input/Output
- **Input**: Receipts, processed invoices, date range
- **Output**: Expense report (PDF/spreadsheet) with categories and totals

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Invoice data (from #11) | Optional |
| google-drive | Receipts folder | Optional |
| filesystem | Process files, output | ✅ Required |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/expense-reporting/SKILL.md`
- [ ] `commands/expense-report.md`
- [ ] `templates/expense-template.xlsx`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: None (but better with #11)
- **Chains with**: #11 Invoice Processor (uses processed data)
- **Data from**: Notion, receipts, invoices

### Acceptance Criteria
1. [ ] `/expense:report [date-range]` generates report
2. [ ] Pulls from processed invoices if available
3. [ ] Categorizes by expense type
4. [ ] Calculates totals and subtotals
5. [ ] Outputs PDF or Excel

### Blog Angle
"Expense Reports in 5 Minutes: From Chaos to Clarity"

---

## Summary: Code Without Coding Pillar

| # | Plugin | Platform | Type | MCP Required | Week |
|---|--------|----------|------|--------------|------|
| 09 | Report Generator Factory ⭐ | Claude Code | Standalone | Filesystem | 3 |
| 10 | Client Health Dashboard | Claude Code | Standalone | Gmail, Notion | 13 |
| 11 | Invoice Processor ⭐ | Cowork | Standalone | Notion, Filesystem | 4 |
| 12 | Proposal Automator | Cowork | Standalone | Filesystem | 14 |
| 13 | Contract Analyzer | Claude Code | Standalone | Filesystem | 15 |
| 14 | SOW Generator ⭐ | Cowork | Standalone | Filesystem | 5 |
| 15 | Competitive Intel Compiler | Claude Code | Standalone | Web, Filesystem | 16 |
| 16 | Expense Report Builder | Cowork | Chained | Filesystem | 17 |

### Chain Dependencies
```
#11 Invoice Processor
    └──► #16 Expense Report Builder (uses invoice data)

#12 Proposal Automator
    └──► #14 SOW Generator (proposal → SOW flow)
```

### Agent Teams Plugins in This Pillar
- #09 Report Generator Factory (Pipeline: 5 agents)
- #11 Invoice Processor (Pipeline + Batch: 5 agents)
- #14 SOW Generator (Competing Hypotheses: 5 agents)