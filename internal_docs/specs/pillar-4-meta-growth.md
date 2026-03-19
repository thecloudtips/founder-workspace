# 📈 Pillar 4: Meta & Growth - Full Plugin Specifications

> 6 pluginów do analizy, optymalizacji i skalowania

---

## #25 Time Savings Calculator

### Overview
| Field | Value |
|-------|-------|
| Platform | Cowork |
| Pillar | Meta & Growth |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 25 |

### Input/Output
- **Input**: Task completion logs, task type classifications
- **Output**: Weekly savings report + Monthly ROI report for management

### Data Source Approach
- **Task type estimates**: Pre-defined time estimates per task category
  - Email triage: 2h manual → 15min with AI
  - Meeting prep: 30min manual → 5min with AI
  - Report generation: 4h manual → 30min with AI
  - Invoice processing: 15min/invoice manual → 2min with AI

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Task logs, output reports | ✅ Required |
| filesystem | Report generation | ✅ Required |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/time-tracking/SKILL.md`
- [ ] `skills/roi-calculation/SKILL.md`
- [ ] `commands/savings-report.md`
- [ ] `commands/roi-report.md`
- [ ] `config/task-estimates.json`
- [ ] `templates/weekly-savings.md`
- [ ] `templates/monthly-roi.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Task logging in Notion
- **Enhances**: Business case for AI adoption
- **Data from**: Notion task database

### Acceptance Criteria
1. [ ] `/savings:weekly` generates weekly report
2. [ ] `/savings:monthly-roi` generates management report
3. [ ] Uses task type estimates for calculations
4. [ ] Shows hours saved, $ value, productivity gain %
5. [ ] Compares actual vs. estimated time
6. [ ] Visualizes trends over time

### Blog Angle
"Prove Your AI ROI: Automatic Time Savings Reports"

---

## #26 Team Prompt Library

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | Meta & Growth |
| Type | Standalone |
| Difficulty | Beginner |
| Week | 26 |

### Input/Output
- **Input**: Prompt requests, new prompts to store, categories
- **Output**: Curated prompts, usage guidance, team-shared library

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Prompt storage, sharing | ✅ Required |
| filesystem | Local templates | Optional |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/prompt-management/SKILL.md`
- [ ] `skills/prompt-optimization/SKILL.md`
- [ ] `commands/prompt-list.md`
- [ ] `commands/prompt-get.md`
- [ ] `commands/prompt-add.md`
- [ ] `commands/prompt-share.md`
- [ ] `notion-templates/prompt-library-db.json`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Notion
- **Enhances**: All AI workflows, team onboarding
- **Data from**: User contributions, curated prompts

### Prompt Categories
- Email templates
- Meeting prompts
- Analysis prompts
- Content creation prompts
- Code assistance prompts
- Research prompts

### Acceptance Criteria
1. [ ] `/prompt:list [category]` shows available prompts
2. [ ] `/prompt:get [name]` retrieves with variables
3. [ ] `/prompt:add [name] [content]` saves new prompt
4. [ ] `/prompt:share [name]` shares with team
5. [ ] Supports variables and customization
6. [ ] Tracks usage and effectiveness

### Blog Angle
"Build Your Team's AI Prompt Library: Shared Knowledge, Better Results"

---

## #27 Workflow Automator

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | Meta & Growth |
| Type | Chained |
| Difficulty | Advanced |
| Week | 27 |

### Input/Output
- **Input**: Workflow definition (sequence of plugin commands)
- **Output**: Automated execution of multi-step workflows

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| filesystem | Workflow definitions | ✅ Required |
| (inherits from chained plugins) | | |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/workflow-design/SKILL.md`
- [ ] `skills/workflow-execution/SKILL.md`
- [ ] `commands/workflow-create.md`
- [ ] `commands/workflow-run.md`
- [ ] `commands/workflow-list.md`
- [ ] `workflows/examples/`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Other plugins installed
- **Chains**: Any combination of plugins
- **Data from**: User-defined workflows

### Example Workflows
```yaml
# Morning Routine
workflow: morning-routine
steps:
  - plugin: morning-sync
    command: /morning:sync
  - plugin: inbox-zero
    command: /inbox:triage --urgent-only
  - plugin: daily-briefing
    command: /daily:briefing
```

### Acceptance Criteria
1. [ ] `/workflow:create [name]` defines new workflow
2. [ ] `/workflow:run [name]` executes all steps
3. [ ] Handles step dependencies
4. [ ] Error handling and rollback
5. [ ] Scheduling support (cron-like)

### Blog Angle
"Chain Your AI Plugins into Automated Workflows"

---

## #28 Workflow Documenter

### Overview
| Field | Value |
|-------|-------|
| Platform | Claude Code |
| Pillar | Meta & Growth |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 28 |

### Input/Output
- **Input**: Workflow description, steps, tools involved
- **Output**: Documented workflow (SOP), diagram, training materials

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Store SOPs | ✅ Required |
| filesystem | Generate docs | ✅ Required |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/workflow-documentation/SKILL.md`
- [ ] `skills/sop-writing/SKILL.md`
- [ ] `commands/document-workflow.md`
- [ ] `commands/generate-sop.md`
- [ ] `commands/workflow-diagram.md`
- [ ] `templates/sop-template.md`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: None
- **Enhances**: Team onboarding, process improvement
- **Data from**: User descriptions, observed workflows

### Acceptance Criteria
1. [ ] `/workflow:document [description]` creates SOP
2. [ ] Generates step-by-step instructions
3. [ ] `/workflow:diagram [workflow]` creates visual
4. [ ] Identifies tools and handoffs
5. [ ] Outputs to Notion or Markdown
6. [ ] Includes troubleshooting section

### Blog Angle
"Document Any Workflow in 10 Minutes: AI-Powered SOPs"

---

## #29 Learning Log Tracker

### Overview
| Field | Value |
|-------|-------|
| Platform | Cowork |
| Pillar | Meta & Growth |
| Type | Standalone |
| Difficulty | Beginner |
| Week | 29 |

### Input/Output
- **Input**: Daily learnings, insights, experiments
- **Output**: Searchable learning database, weekly insights summary

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Learning database | ✅ Required |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/learning-capture/SKILL.md`
- [ ] `commands/log-learning.md`
- [ ] `commands/search-learnings.md`
- [ ] `commands/weekly-insights.md`
- [ ] `notion-templates/learning-db.json`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Notion
- **Enhances**: Personal knowledge management
- **Data from**: User input

### Acceptance Criteria
1. [ ] `/learn:log [insight]` captures learning
2. [ ] Auto-tags by topic
3. [ ] `/learn:search [topic]` finds relevant learnings
4. [ ] `/learn:weekly` summarizes week's learnings
5. [ ] Connects related insights

### Blog Angle
"Never Forget What You Learn: AI-Powered Learning Logs"

---

## #30 Goal Progress Tracker

### Overview
| Field | Value |
|-------|-------|
| Platform | Cowork |
| Pillar | Meta & Growth |
| Type | Standalone |
| Difficulty | Intermediate |
| Week | 30 |

### Input/Output
- **Input**: Goals, milestones, progress updates
- **Output**: Progress reports, trajectory analysis, blockers identification

### MCP Requirements
| Server | Purpose | Required |
|--------|---------|----------|
| notion | Goals database | ✅ Required |

### Deliverables Checklist
- [ ] `.claude-plugin/plugin.json`
- [ ] `.mcp.json`
- [ ] `skills/goal-tracking/SKILL.md`
- [ ] `skills/progress-analysis/SKILL.md`
- [ ] `commands/goal-create.md`
- [ ] `commands/goal-update.md`
- [ ] `commands/goal-report.md`
- [ ] `notion-templates/goals-db.json`
- [ ] `README.md`
- [ ] `INSTALL.md`

### Dependencies
- **Requires**: Notion
- **Enhances**: OKR/goal management
- **Data from**: Notion goals database

### Acceptance Criteria
1. [ ] `/goal:create [name] [target] [deadline]` creates goal
2. [ ] `/goal:update [name] [progress]` logs progress
3. [ ] `/goal:report` shows all goals status
4. [ ] Calculates on-track vs. behind
5. [ ] Identifies blockers from notes
6. [ ] Projects completion date based on velocity

### Blog Angle
"OKRs That Track Themselves: AI-Powered Goal Management"

---

## Summary: Meta & Growth Pillar

| # | Plugin | Platform | Type | MCP Required | Week |
|---|--------|----------|------|--------------|------|
| 25 | Time Savings Calculator | Cowork | Standalone | Notion, Filesystem | 25 |
| 26 | Team Prompt Library | Claude Code | Standalone | Notion | 26 |
| 27 | Workflow Automator | Claude Code | Chained | Filesystem | 27 |
| 28 | Workflow Documenter | Claude Code | Standalone | Notion, Filesystem | 28 |
| 29 | Learning Log Tracker | Cowork | Standalone | Notion | 29 |
| 30 | Goal Progress Tracker | Cowork | Standalone | Notion | 30 |

### Chain Dependencies
```
#27 Workflow Automator
    └──► Chains ANY plugins together
```

### MCP Server Usage Across Pillar
- **Notion**: 5 plugins
- **Filesystem**: 3 plugins

### No Agent Teams in This Pillar
- These are primarily meta/utility plugins
- Could add Agent Teams to #27 Workflow Automator for complex orchestration
