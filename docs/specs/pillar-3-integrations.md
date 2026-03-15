# 🔌 Pillar 3: MCP & Integrations - Full Plugin Specifications

> 8 pluginów łączących różne narzędzia i źródła danych

---

## #17 Notion Command Center

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | MCP & Integrations |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 18 |

### Input/Output
- **Input**: Natural language commands for Notion operations
- **Output**: Notion pages, databases, updates, queries

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Full Notion API access | ✅ Required |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/notion-operations/SKILL.md`
- [ ] `skills/notion-database-design/SKILL.md`
- [ ] `commands/notion-create.md`
- [ ] `commands/notion-query.md`
- [ ] `commands/notion-update.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Notion MCP
- **Enhances**: All Notion-based plugins
- **Data from**: Notion workspace

### Acceptance Criteria
1. [ ] `/notion:create [description]` creates page/DB
2. [ ] `/notion:query [question]` searches and answers
3. [ ] `/notion:update [page] [changes]` modifies content
4. [ ] Natural language → Notion API translation
5. [ ] Handles databases, pages, blocks

### Blog Angle
"Control Your Entire Notion Workspace with Plain English"

---

## #18 Google Drive Brain

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | MCP & Integrations |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 19 |

### Input/Output
- **Input**: Questions about Drive content, file operations
- **Output**: Answers from docs, file organization, summaries

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| google-drive | Full Drive access | ✅ Required |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/drive-navigation/SKILL.md`
- [ ] `skills/document-qa/SKILL.md`
- [ ] `commands/drive-search.md`
- [ ] `commands/drive-summarize.md`
- [ ] `commands/drive-organize.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Google Drive MCP
- **Enhances**: Document-based workflows
- **Data from**: Google Drive

### Acceptance Criteria
1. [ ] `/drive:search [query]` finds relevant files
2. [ ] `/drive:summarize [file]` creates summary
3. [ ] `/drive:ask [question]` answers from docs
4. [ ] `/drive:organize [folder]` suggests structure
5. [ ] Handles Docs, Sheets, PDFs

### Blog Angle
"Ask Questions, Get Answers: Your Google Drive as a Knowledge Base"

---

## #19 Slack Digest Engine

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | MCP & Integrations |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 20 |

### Input/Output
- **Input**: Slack channels/DMs, time range
- **Output**: Digest of important messages, decisions, action items

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| slack | Read channels, DMs | ✅ Required |
| notion | Store digests | Optional |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/slack-analysis/SKILL.md`
- [ ] `skills/message-prioritization/SKILL.md`
- [ ] `commands/slack-digest.md`
- [ ] `commands/slack-catch-up.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Slack MCP
- **Enhances**: #22 Multi-Tool Morning Sync
- **Data from**: Slack workspace

### Acceptance Criteria
1. [ ] `/slack:digest [channels] [timeframe]` creates summary
2. [ ] Identifies decisions made
3. [ ] Extracts action items with owners
4. [ ] Highlights @mentions of you
5. [ ] Filters noise from signal

### Blog Angle
"Never Miss What Matters: AI-Powered Slack Catch-Up"

---

## #20 Client Context Loader ⭐ PRIORITY 5

### Overview
| Field | Value |
|-------|-------|
| Platform | Cowork |
| Pillar | MCP & Integrations |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 2 |
| Agent Teams | Yes - Parallel Gathering |

### Input/Output
- **Input**: Client name/ID
- **Output**: Complete client dossier from all sources

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | CRM data | ✅ Required |
| gmail | Email history | ✅ Required |
| google-drive | Related docs | Optional |
| google-calendar | Meeting history | Optional |

### Agent Teams Configuration
| Agent | Role | Tools |
|-------|------|-------|
| CRM Agent | Pull Notion CRM data | notion |
| Email Agent | Gather email history | gmail |
| Docs Agent | Find related documents | google-drive |
| Calendar Agent | Meeting history | google-calendar |
| Notes Agent | Pull meeting notes | notion |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/client-context/SKILL.md`
- [ ] `skills/relationship-summary/SKILL.md`
- [ ] `commands/load-client.md`
- [ ] `commands/client-brief.md`
- [ ] `teams/config.json`
- [ ] `agents/crm-agent.md`
- [ ] `agents/email-agent.md`
- [ ] `agents/docs-agent.md`
- [ ] `agents/calendar-agent.md`
- [ ] `agents/notes-agent.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Notion CRM
- **Enhances**: #03 Meeting Prep Autopilot
- **Data from**: Multiple MCPs (parallel gathering)

### Acceptance Criteria
1. [ ] `/client:load [name]` creates full context
2. [ ] Pulls from 5 sources in parallel
3. [ ] Merges into unified dossier
4. [ ] Includes: profile, history, open items, sentiment
5. [ ] Agent Teams: Complete dossier in <30 seconds
6. [ ] `/client:brief [name]` creates 1-page summary

### Blog Angle
"Know Everything About Your Client in 30 Seconds"

---

## #21 CRM Sync Hub

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | MCP & Integrations |
| Type | Standalone |
| Difficulty | Advanced |
| Week | 21 |

### Input/Output
- **Input**: Trigger events (email sent, meeting held, etc.)
- **Output**: CRM records updated, context loaded

### Sync Directions (per user decision)
1. **Email → CRM**: Log email conversations to client records
2. **CRM → Context**: Load client data before calls
3. **Calendar → CRM**: Log meetings as activities

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | CRM database | ✅ Required |
| gmail | Email tracking | ✅ Required |
| google-calendar | Meeting tracking | ✅ Required |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/crm-sync/SKILL.md`
- [ ] `skills/activity-logging/SKILL.md`
- [ ] `commands/sync-email.md`
- [ ] `commands/sync-meeting.md`
- [ ] `commands/load-context.md`
- [ ] `notion-templates/crm-database.json`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Notion CRM setup
- **Enhances**: #10 Client Health Dashboard, #20 Client Context Loader
- **Data from**: Gmail, Calendar, Notion

### Acceptance Criteria
1. [ ] `/crm:sync-email [thread_id]` logs to client record
2. [ ] `/crm:sync-meeting [event_id]` logs meeting
3. [ ] `/crm:context [client]` loads for call prep
4. [ ] Auto-matches emails to clients
5. [ ] Deduplicates activities

### Blog Angle
"Notion as Your CRM: Automatic Email and Meeting Logging"

---

## #22 Multi-Tool Morning Sync

### Overview
| Field | Value |
|-------|-------|
| Platform | Cowork |
| Pillar | MCP & Integrations |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 22 |

### Input/Output (per user decision)
- **Input**: Overnight updates from Gmail, Calendar, Notion, Slack, Google Drive
- **Output**: Notion Daily Briefing page

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| gmail | New emails overnight | ✅ Required |
| google-calendar | Today's meetings | ✅ Required |
| notion | Task changes, output | ✅ Required |
| slack | Unread messages | ✅ Required |
| google-drive | Recent edits | Optional |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/morning-briefing/SKILL.md`
- [ ] `skills/priority-synthesis/SKILL.md`
- [ ] `commands/morning-sync.md`
- [ ] `commands/quick-sync.md`
- [ ] `notion-templates/daily-briefing.json`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: All 5 MCPs for full experience
- **Enhances**: #02 Daily Briefing Generator (more comprehensive)
- **Data from**: Gmail, Calendar, Notion, Slack, Drive

### Acceptance Criteria
1. [ ] `/morning:sync` pulls from all 5 tools
2. [ ] Creates Notion page with sections per tool
3. [ ] Highlights urgent items
4. [ ] Shows today's schedule
5. [ ] Lists priority tasks
6. [ ] Completes in <60 seconds

### Blog Angle
"One Command to Rule Them All: The Ultimate Morning Briefing"

---

## #23 Knowledge Base Q&A

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | MCP & Integrations |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 23 |

### Input/Output
- **Input**: Question about company knowledge
- **Output**: Answer sourced from Notion, Drive, previous conversations

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Knowledge base | ✅ Required |
| google-drive | Documentation | Optional |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/knowledge-retrieval/SKILL.md`
- [ ] `skills/answer-synthesis/SKILL.md`
- [ ] `commands/ask.md`
- [ ] `commands/find-doc.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Notion with organized knowledge
- **Enhances**: Team onboarding, self-service
- **Data from**: Notion, Drive

### Acceptance Criteria
1. [ ] `/kb:ask [question]` returns sourced answer
2. [ ] Cites source documents
3. [ ] Handles "I don't know" gracefully
4. [ ] `/kb:find [topic]` lists relevant docs
5. [ ] Works with Notion and Drive

### Blog Angle
"Turn Your Notion into a Searchable Knowledge Base"

---

## #24 LinkedIn Post Generator

### Overview
| Field | Value |
|-------|-------|
| Platform | Cowork |
| Pillar | MCP & Integrations |
| Type | Standalone |
| Difficulty | Beginner |
| Week | 24 |

### Input/Output
- **Input**: Topic, key points, tone preference
- **Output**: LinkedIn post draft, multiple variations

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Content ideas, past posts | Optional |
| filesystem | Output drafts | ✅ Required |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/linkedin-writing/SKILL.md`
- [ ] `skills/hook-creation/SKILL.md`
- [ ] `commands/linkedin-post.md`
- [ ] `commands/linkedin-variations.md`
- [ ] `templates/post-frameworks.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: None
- **Enhances**: Content marketing workflow
- **Data from**: User input, Notion ideas

### Acceptance Criteria
1. [ ] `/linkedin:post [topic]` generates draft
2. [ ] Creates strong hook
3. [ ] `/linkedin:variations [draft]` creates 3 versions
4. [ ] Follows LinkedIn best practices
5. [ ] Outputs formatted for copy/paste

### Blog Angle
"Write a Week of LinkedIn Posts in 30 Minutes"

---

## Summary: MCP & Integrations Pillar

| # | Plugin | Platform | Type | MCP Required | Week |
|---|--------|----------|------|--------------|------|
| 17 | Notion Command Center | Claude Code | Standalone | Notion | 18 |
| 18 | Google Drive Brain | Claude Code | Standalone | Google Drive | 19 |
| 19 | Slack Digest Engine | Claude Code | Standalone | Slack | 20 |
| 20 | Client Context Loader ⭐ | Cowork | Standalone | Notion, Gmail, Drive, Calendar | 2 |
| 21 | CRM Sync Hub | Claude Code | Standalone | Notion, Gmail, Calendar | 21 |
| 22 | Multi-Tool Morning Sync | Cowork | Standalone | Gmail, Calendar, Notion, Slack, Drive | 22 |
| 23 | Knowledge Base Q&A | Claude Code | Standalone | Notion, Drive | 23 |
| 24 | LinkedIn Post Generator | Cowork | Standalone | Filesystem | 24 |

### MCP Server Usage Across Pillar
- **Notion**: 7 plugins
- **Gmail**: 3 plugins
- **Google Drive**: 4 plugins
- **Google Calendar**: 3 plugins
- **Slack**: 2 plugins

### Agent Teams Plugins in This Pillar
- #20 Client Context Loader (Parallel Gathering: 5 agents)