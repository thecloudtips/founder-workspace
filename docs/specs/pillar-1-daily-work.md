# 📧 Pillar 1: Daily Work - Full Plugin Specifications

> 8 pluginów automatyzujących codzienne zadania foundera

---

## #01 Inbox Zero Commander ⭐ PRIORITY 5

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | Daily Work |
| Type | Standalone |
| Difficulty | Beginner |
| Week | 1 |
| Status | Template ready (Migration Kit) |

### Input/Output
- **Input**: Gmail inbox (last N hours), user preferences
- **Output**: Categorized email list, action items, draft responses, archive candidates

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| gmail | Email access | ✅ Required |
| notion | Task extraction | Optional |
| google-calendar | Meeting detection | Optional |

### Deliverables Checklist
- [x] `.claude-plugin/plugin.json`
- [x] `.mcp.json`
- [x] `skills/email-triage/SKILL.md`
- [x] `commands/triage.md`
- [x] `teams/config.json` (Agent Teams)
- [x] `agents/triage-agent.md`
- [ ] `agents/action-agent.md`
- [ ] `agents/response-agent.md`
- [ ] `agents/archive-agent.md`
- [x] `README.md`

### Dependencies
- **Requires**: None (standalone)
- **Enhances**: #06 Smart Follow-Up Tracker
- **Data from**: Gmail MCP

### Acceptance Criteria
1. [ ] `/inbox:triage` returns categorized email summary
2. [ ] Priority scoring (1-5) matches Eisenhower matrix
3. [ ] Action items extracted to list format
4. [ ] `--team` flag activates Agent Teams mode
5. [ ] Processes 100+ emails in <2 minutes (Agent Teams)

### Blog Angle
"I Just Built: An AI Email Assistant That Actually Gets Inbox Zero"

---

## #02 Daily Briefing Generator

### Overview
| Field | Value |
|-------|-------|
| Platform | Cowork |
| Pillar | Daily Work |
| Type | Standalone |
| Difficulty | Beginner |
| Week | 6 |

### Input/Output
- **Input**: Calendar events, email highlights, Notion tasks, Slack mentions
- **Output**: Notion page with structured daily briefing

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| google-calendar | Today's meetings | ✅ Required |
| gmail | Unread highlights | ✅ Required |
| notion | Tasks due today | ✅ Required |
| slack | Overnight mentions | Optional |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/daily-planning/SKILL.md`
- [ ] `commands/briefing.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: None
- **Enhances**: #22 Multi-Tool Morning Sync (similar, more comprehensive)
- **Data from**: Calendar, Gmail, Notion, Slack MCPs

### Acceptance Criteria
1. [ ] `/daily:briefing` generates Notion page
2. [ ] Shows today's meetings with prep notes
3. [ ] Lists priority emails requiring response
4. [ ] Shows tasks due today from Notion
5. [ ] Generates in <30 seconds

### Blog Angle
"Start Every Day with AI: Your Personal Chief of Staff"

---

## #03 Meeting Prep Autopilot

### Overview
| Field | Value |
|-------|-------|
| Platform | Cowork |
| Pillar | Daily Work |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 7 |

### Input/Output
- **Input**: Calendar event (meeting), attendee info, past communications
- **Output**: Meeting prep doc with context, talking points, open items

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| google-calendar | Meeting details | ✅ Required |
| gmail | Past emails with attendees | ✅ Required |
| notion | CRM data, past meeting notes | ✅ Required |
| google-drive | Relevant docs | Optional |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/meeting-context/SKILL.md`
- [ ] `skills/talking-points/SKILL.md`
- [ ] `commands/prep.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Notion CRM setup (from #21 CRM Sync Hub)
- **Enhances**: #20 Client Context Loader
- **Data from**: Calendar, Gmail, Notion, Drive MCPs

### Acceptance Criteria
1. [ ] `/meeting:prep [event_id]` generates prep doc
2. [ ] Pulls attendee context from CRM/email history
3. [ ] Lists open items from previous meetings
4. [ ] Suggests talking points based on context
5. [ ] Works for both internal and external meetings

### Blog Angle
"Never Walk Into a Meeting Unprepared Again"

---

## #04 Action Item Extractor

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | Daily Work |
| Type | Standalone |
| Difficulty | Beginner |
| Week | 8 |

### Input/Output
- **Input**: Meeting transcript, email thread, or document
- **Output**: Structured action items with owner, deadline, context

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Create tasks | ✅ Required |
| google-drive | Read transcripts/docs | Optional |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/action-extraction/SKILL.md`
- [ ] `commands/extract.md`
- [ ] `commands/extract-from-file.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: None
- **Enhances**: #07 Voice Note Processor (provides input)
- **Data from**: Local files, Drive, Notion MCPs

### Acceptance Criteria
1. [ ] `/actions:extract` processes pasted text
2. [ ] `/actions:extract-file [path]` processes file
3. [ ] Identifies owner (from mentions or context)
4. [ ] Detects deadlines (explicit or implied)
5. [ ] Creates tasks in Notion with metadata

### Blog Angle
"Extract Every Action Item from Any Meeting in Seconds"

---

## #05 Weekly Review Compiler

### Overview
| Field | Value |
|-------|-------|
| Platform | Cowork |
| Pillar | Daily Work |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 9 |

### Input/Output
- **Input**: Week's completed tasks, meetings, emails, calendar
- **Output**: Weekly review document (wins, blockers, next week priorities)

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Completed tasks, notes | ✅ Required |
| google-calendar | Meeting summary | ✅ Required |
| gmail | Key communications | Optional |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/weekly-reflection/SKILL.md`
- [ ] `commands/review.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Notion task tracking
- **Enhances**: Pairs with #02 Daily Briefing
- **Data from**: Notion, Calendar MCPs

### Acceptance Criteria
1. [ ] `/weekly:review` generates Notion page
2. [ ] Summarizes completed tasks by project
3. [ ] Lists meetings held and outcomes
4. [ ] Identifies blockers and carryover items
5. [ ] Suggests priorities for next week

### Blog Angle
"Automate Your Weekly Review: 30 Minutes to 3 Minutes"

---

## #06 Smart Follow-Up Tracker

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | Daily Work |
| Type | Chained |
| Difficulty | Intermediate |
| Week | 10 |

### Input/Output
- **Input**: Sent emails awaiting response, promised follow-ups
- **Output**: Follow-up reminders, draft nudge emails

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| gmail | Sent mail, track responses | ✅ Required |
| notion | Follow-up task list | Optional |
| google-calendar | Deadline reminders | Optional |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/follow-up-detection/SKILL.md`
- [ ] `skills/nudge-writing/SKILL.md`
- [ ] `commands/followups.md`
- [ ] `commands/nudge.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Gmail MCP
- **Chains with**: #01 Inbox Zero Commander (uses triage data)
- **Data from**: Gmail sent folder

### Acceptance Criteria
1. [ ] `/followup:check` lists emails awaiting response
2. [ ] Filters by age (3+ days, 7+ days, etc.)
3. [ ] `/followup:nudge [email_id]` drafts follow-up
4. [ ] Tracks "I'll get back to you" promises
5. [ ] Optional: Creates Notion reminders

### Blog Angle
"Never Let an Important Email Fall Through the Cracks"

---

## #07 Voice Note Processor

### Overview
| Field | Value |
|-------|-------|
| Platform | Cowork |
| Pillar | Daily Work |
| Type | Standalone |
| Difficulty | Advanced |
| Week | 11 |

### Input/Output
- **Input**: Audio files from Notion meeting notes, Fireflies recordings
- **Output**: Clean transcript, action items in Notion, calendar events, email drafts

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Meeting notes source, task output | ✅ Required |
| google-calendar | Create events | ✅ Required |
| gmail | Draft emails | ✅ Required |
| filesystem | Local audio processing | ✅ Required |

### Technical Requirements
- **Transcription**: Whisper (local) - requires GPU or CPU with patience
- **Audio formats**: .mp3, .m4a, .wav, .webm
- **Fireflies integration**: Export audio or use API

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/transcription/SKILL.md`
- [ ] `skills/voice-action-extraction/SKILL.md`
- [ ] `commands/process-voice.md`
- [ ] `commands/transcribe.md`
- [ ] `scripts/whisper-setup.sh`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Whisper installation, Notion MCP
- **Enhances**: #04 Action Item Extractor (provides transcript)
- **Data from**: Notion, Fireflies, local files

### Acceptance Criteria
1. [ ] `/voice:process [file]` transcribes and extracts
2. [ ] Transcript saved to Notion
3. [ ] Action items created as Notion tasks
4. [ ] Meetings detected → Calendar events created
5. [ ] Email commitments → Gmail drafts created
6. [ ] Handles 30+ minute recordings

### Blog Angle
"Turn Voice Notes into Done Tasks: The AI Transcription Workflow"

---

## #08 Newsletter Draft Engine

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | Daily Work |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 12 |

### Input/Output
- **Input**: Topic/theme, notes, links, previous newsletters
- **Output**: Newsletter draft in markdown, ready for Substack

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Notes, content ideas | Optional |
| google-drive | Research docs | Optional |
| filesystem | Output markdown | ✅ Required |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/newsletter-writing/SKILL.md`
- [ ] `skills/build-method-voice/SKILL.md`
- [ ] `commands/draft.md`
- [ ] `commands/outline.md`
- [ ] `templates/newsletter-template.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: None
- **Enhances**: Content workflow
- **Data from**: Notion notes, previous issues

### Acceptance Criteria
1. [ ] `/newsletter:outline [topic]` creates structure
2. [ ] `/newsletter:draft` generates full draft
3. [ ] Follows BUILD Method voice/style
4. [ ] Includes sections: Hook, Main content, CTA
5. [ ] Outputs markdown compatible with Substack

### Blog Angle
"How I Draft My Newsletter in 15 Minutes with AI"

---

## Summary: Daily Work Pillar

| # | Plugin | Platform | Type | MCP Required | Week |
|---|--------|----------|------|--------------|------|
| 01 | Inbox Zero Commander ⭐ | Claude Code | Standalone | Gmail | 1 |
| 02 | Daily Briefing Generator | Cowork | Standalone | Calendar, Gmail, Notion | 6 |
| 03 | Meeting Prep Autopilot | Cowork | Standalone | Calendar, Gmail, Notion | 7 |
| 04 | Action Item Extractor | Claude Code | Standalone | Notion | 8 |
| 05 | Weekly Review Compiler | Cowork | Standalone | Notion, Calendar | 9 |
| 06 | Smart Follow-Up Tracker | Claude Code | Chained | Gmail | 10 |
| 07 | Voice Note Processor | Cowork | Standalone | Notion, Calendar, Gmail | 11 |
| 08 | Newsletter Draft Engine | Claude Code | Standalone | Filesystem | 12 |

### Chain Dependencies
```
#01 Inbox Zero Commander
    └──► #06 Smart Follow-Up Tracker (uses triage data)

#07 Voice Note Processor
    └──► #04 Action Item Extractor (provides transcripts)
```

### Shared MCP Servers Across Pillar
- **Gmail**: 5 plugins
- **Notion**: 6 plugins  
- **Google Calendar**: 4 plugins
- **Google Drive**: 2 plugins
- **Slack**: 1 plugin