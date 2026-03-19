# Founder OS UAT Testing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a self-contained UAT testing project at `/uat-testing/` that uses claude-flow swarms to run automated integration tests across all 30 Founder OS plugins, pillar-by-pillar with go/no-go gates, reporting results to a Notion database.

**Architecture:** The UAT project is a standalone Claude Code project that installs all 30 plugins. Each pillar runs as a claude-flow swarm with 4 agent types: data prep, plugin tester, validator, reporter. Swarms execute in sequence (Pillar 1→2→3→4→Chains→Stress) with a ≥90% pass gate between each. Results are written to `[FOS] Test Results` Notion DB + local JSON.

**Tech Stack:** Claude Code plugins, claude-flow swarms (hierarchical topology), Notion MCP, Gmail MCP (test account), Google Calendar MCP (test account), Filesystem MCP (local fixtures)

**Design Doc:** `docs/plans/2026-03-08-uat-testing-plan-design.md`

---

## Phase 1: Project Scaffold & Environment Setup

### Task 1: Create UAT directory structure

**Files:**
- Create: `uat-testing/.claude-plugin/plugin.json`
- Create: `uat-testing/CLAUDE.md`

**Step 1: Create the directory tree**

```bash
mkdir -p uat-testing/{.claude-plugin,swarms,fixtures/{emails/{action-required,fyi,newsletter,vip,follow-up-candidates,edge-cases,spam-like},calendar-events/{standard,recurring,edge-cases},documents/{invoices,contracts,proposals,csv-data,sow-templates},edge-cases/{empty-files,malformed-json,large-files,unicode-heavy}},validators,results,scripts,commands}
```

**Step 2: Create plugin manifest**

Write `uat-testing/.claude-plugin/plugin.json`:
```json
{
  "name": "founder-os-uat-testing",
  "display_name": "Founder OS UAT Testing Suite",
  "description": "Automated UAT testing for all 30 Founder OS plugins using claude-flow swarms",
  "version": "1.0.0",
  "type": "claude-code",
  "author": "NaluForge"
}
```

**Step 3: Create UAT CLAUDE.md**

Write `uat-testing/CLAUDE.md` with test runner conventions:

```markdown
# Founder OS UAT Testing Suite

## Purpose
Automated integration testing for all 30 Founder OS plugins against the [FOS] Notion HQ workspace.

## Test Execution
- Tests run via claude-flow swarms, one swarm per pillar
- Each plugin has 7 test categories (happy path, DB discovery, type column, idempotency, company relation, degradation, edge cases)
- Results write to [FOS] Test Results Notion DB + local JSON in /results/

## Conventions
- Test IDs follow pattern: P{NN}-{CAT}-{SEQ} (e.g., P01-HP-001)
- Categories: HP (Happy Path), DD (DB Discovery), TC (Type Column), ID (Idempotency), CR (Company Relation), GD (Graceful Degradation), EC (Edge Case)
- Pass criteria: output matches expected schema, correct Type value, no duplicates, relations populated
- Each swarm must achieve ≥90% pass rate before next pillar starts

## MCP Environment
- Notion: Full credentials (production HQ workspace)
- Gmail: Test account (full send/receive)
- Calendar: Test account
- Drive, Slack, Web Search: Not connected (tested via graceful degradation)
- Filesystem: Local fixtures in /fixtures/

## Plugin Installation
All 30 founder-os-* plugins are installed via symlinks from parent directory.

## Test Data
- 224 base records already seeded in HQ (see docs/plans/2026-03-07-hq-test-data-preparation-plan.md)
- Additional fixtures in /fixtures/ for email, calendar, document testing
- Reset scripts in /scripts/ restore to known state before each run
```

**Step 4: Commit**

```bash
git add uat-testing/.claude-plugin/plugin.json uat-testing/CLAUDE.md
git commit -m "feat(uat): scaffold UAT testing project structure"
```

---

### Task 2: Configure MCP connections

**Files:**
- Create: `uat-testing/.mcp.json`

**Step 1: Write MCP configuration**

Write `uat-testing/.mcp.json`:
```json
{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-notion"],
      "env": {
        "NOTION_API_KEY": "${NOTION_API_KEY}"
      }
    },
    "gmail": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-gmail"],
      "env": {
        "GMAIL_CREDENTIALS_PATH": "${GMAIL_CREDENTIALS_PATH}",
        "GMAIL_TOKEN_PATH": "${GMAIL_TOKEN_PATH}"
      }
    },
    "google-calendar": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-google-calendar"],
      "env": {
        "GOOGLE_CALENDAR_CREDENTIALS_PATH": "${GOOGLE_CALENDAR_CREDENTIALS_PATH}",
        "GOOGLE_CALENDAR_TOKEN_PATH": "${GOOGLE_CALENDAR_TOKEN_PATH}"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "./fixtures"]
    },
    "claude-flow": {
      "command": "npx",
      "args": ["-y", "@claude-flow/cli@latest", "mcp", "start"],
      "env": {
        "CLAUDE_FLOW_MODE": "v3",
        "CLAUDE_FLOW_HOOKS_ENABLED": "true",
        "CLAUDE_FLOW_TOPOLOGY": "hierarchical",
        "CLAUDE_FLOW_MAX_AGENTS": "15"
      },
      "autoStart": true
    }
  }
}
```

**Step 2: Commit**

```bash
git add uat-testing/.mcp.json
git commit -m "feat(uat): configure MCP connections for test environment"
```

---

### Task 3: Install plugins via symlinks

**Files:**
- Create: `uat-testing/scripts/install-plugins.sh`

**Step 1: Write plugin installation script**

Write `uat-testing/scripts/install-plugins.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UAT_DIR="$(dirname "$SCRIPT_DIR")"
PARENT_DIR="$(dirname "$UAT_DIR")"
PLUGINS_DIR="$UAT_DIR/plugins"

mkdir -p "$PLUGINS_DIR"

echo "=== Installing Founder OS Plugins ==="

PLUGINS=(
  founder-os-inbox-zero
  founder-os-daily-briefing-generator
  founder-os-meeting-prep-autopilot
  founder-os-action-item-extractor
  founder-os-weekly-review-compiler
  founder-os-follow-up-tracker
  founder-os-meeting-intelligence-hub
  founder-os-newsletter-draft-engine
  founder-os-report-generator
  founder-os-client-health-dashboard
  founder-os-invoice-processor
  founder-os-proposal-automator
  founder-os-contract-analyzer
  founder-os-sow-generator
  founder-os-competitive-intel-compiler
  founder-os-expense-report-builder
  founder-os-notion-command-center
  founder-os-google-drive-brain
  founder-os-slack-digest-engine
  founder-os-client-context-loader
  founder-os-crm-sync-hub
  founder-os-multi-tool-morning-sync
  founder-os-knowledge-base-qa
  founder-os-linkedin-post-generator
  founder-os-time-savings-calculator
  founder-os-team-prompt-library
  founder-os-workflow-automator
  founder-os-workflow-documenter
  founder-os-learning-log-tracker
  founder-os-goal-progress-tracker
)

installed=0
for plugin in "${PLUGINS[@]}"; do
  src="$PARENT_DIR/$plugin"
  dest="$PLUGINS_DIR/$plugin"
  if [ -d "$src" ]; then
    ln -sfn "$src" "$dest"
    echo "  ✓ $plugin"
    ((installed++))
  else
    echo "  ✗ $plugin (not found at $src)"
  fi
done

echo ""
echo "=== Installed $installed/30 plugins ==="
```

**Step 2: Make executable and run**

```bash
chmod +x uat-testing/scripts/install-plugins.sh
```

**Step 3: Commit**

```bash
git add uat-testing/scripts/install-plugins.sh
git commit -m "feat(uat): add plugin installation script with symlinks"
```

---

### Task 4: Write environment validation script

**Files:**
- Create: `uat-testing/scripts/validate-environment.sh`

**Step 1: Write pre-flight validation script**

Write `uat-testing/scripts/validate-environment.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UAT_DIR="$(dirname "$SCRIPT_DIR")"
PASS=0
FAIL=0
WARN=0

check() {
  local label="$1" result="$2"
  if [ "$result" = "ok" ]; then
    echo "  ✓ $label"
    ((PASS++))
  elif [ "$result" = "warn" ]; then
    echo "  ⚠ $label"
    ((WARN++))
  else
    echo "  ✗ $label"
    ((FAIL++))
  fi
}

echo "=== Founder OS UAT Environment Validation ==="
echo ""

# 1. Directory structure
echo "--- Directory Structure ---"
check "UAT root exists" "$([ -d "$UAT_DIR" ] && echo ok || echo fail)"
check "Fixtures directory" "$([ -d "$UAT_DIR/fixtures" ] && echo ok || echo fail)"
check "Swarms directory" "$([ -d "$UAT_DIR/swarms" ] && echo ok || echo fail)"
check "Results directory" "$([ -d "$UAT_DIR/results" ] && echo ok || echo fail)"
check "Plugin manifest" "$([ -f "$UAT_DIR/.claude-plugin/plugin.json" ] && echo ok || echo fail)"
check "MCP config" "$([ -f "$UAT_DIR/.mcp.json" ] && echo ok || echo fail)"

# 2. Plugin installation
echo ""
echo "--- Plugin Installation ---"
plugin_count=$(find "$UAT_DIR/plugins" -maxdepth 1 -type l 2>/dev/null | wc -l | tr -d ' ')
check "Plugins installed ($plugin_count/30)" "$([ "$plugin_count" -eq 30 ] && echo ok || echo fail)"

# 3. Fixture files
echo ""
echo "--- Test Fixtures ---"
email_count=$(find "$UAT_DIR/fixtures/emails" -name "*.md" -o -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
cal_count=$(find "$UAT_DIR/fixtures/calendar-events" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
doc_count=$(find "$UAT_DIR/fixtures/documents" -type f 2>/dev/null | wc -l | tr -d ' ')
check "Email fixtures ($email_count files)" "$([ "$email_count" -gt 0 ] && echo ok || echo fail)"
check "Calendar fixtures ($cal_count files)" "$([ "$cal_count" -gt 0 ] && echo ok || echo fail)"
check "Document fixtures ($doc_count files)" "$([ "$doc_count" -gt 0 ] && echo ok || echo fail)"

# 4. Swarm configs
echo ""
echo "--- Swarm Configurations ---"
for swarm in pillar-1-daily-work pillar-2-code-without-coding pillar-3-integrations pillar-4-meta-growth cross-plugin-chains stress-test; do
  check "swarms/$swarm.yaml" "$([ -f "$UAT_DIR/swarms/$swarm.yaml" ] && echo ok || echo fail)"
done

# 5. MCP connectivity (basic check)
echo ""
echo "--- MCP Connectivity ---"
check "npx available" "$(command -v npx &>/dev/null && echo ok || echo fail)"
check "NOTION_API_KEY set" "$([ -n "${NOTION_API_KEY:-}" ] && echo ok || echo fail)"

echo ""
echo "=== Results: $PASS passed, $FAIL failed, $WARN warnings ==="
[ "$FAIL" -eq 0 ] && echo "✓ Environment ready for UAT" || echo "✗ Fix failures before running tests"
exit $FAIL
```

**Step 2: Make executable**

```bash
chmod +x uat-testing/scripts/validate-environment.sh
```

**Step 3: Commit**

```bash
git add uat-testing/scripts/validate-environment.sh
git commit -m "feat(uat): add environment validation pre-flight script"
```

---

## Phase 2: Test Fixtures & Data Seeding

### Task 5: Create email test fixtures

**Files:**
- Create: `uat-testing/fixtures/emails/action-required/*.json` (15 files)
- Create: `uat-testing/fixtures/emails/fyi/*.json` (10 files)
- Create: `uat-testing/fixtures/emails/newsletter/*.json` (5 files)
- Create: `uat-testing/fixtures/emails/vip/*.json` (5 files)
- Create: `uat-testing/fixtures/emails/follow-up-candidates/*.json` (5 files)
- Create: `uat-testing/fixtures/emails/edge-cases/*.json` (5 files)
- Create: `uat-testing/fixtures/emails/spam-like/*.json` (5 files)

**Step 1: Create email fixture template**

Each email fixture is a JSON file describing the email to send/seed:

Write `uat-testing/fixtures/emails/README.md`:
```markdown
# Email Test Fixtures

Each JSON file describes a test email to be seeded into the Gmail test account.

## Format
{
  "to": "founderostest@gmail.com",
  "from": "sender@example.com",
  "subject": "Subject line",
  "body": "Email body text...",
  "labels": ["INBOX"],
  "thread_id": null,
  "date": "2026-03-07T09:00:00Z",
  "attachments": [],
  "expected_category": "action_required",
  "expected_priority": "high",
  "test_notes": "Should trigger follow-up detection"
}

## Categories
- action-required/ (15): Emails needing response or action
- fyi/ (10): Informational, no action needed
- newsletter/ (5): Marketing/industry newsletters
- vip/ (5): From known contacts mapped to CRM companies
- follow-up-candidates/ (5): Unanswered threads, promises
- edge-cases/ (5): Empty subject, non-English, very long
- spam-like/ (5): Cold outreach, promotional
```

**Step 2: Create action-required email fixtures**

Write 15 JSON files in `uat-testing/fixtures/emails/action-required/`:

`01-meeting-request.json`:
```json
{
  "from": "sarah.chen@acmecorp.com",
  "subject": "Can we schedule a quarterly review this week?",
  "body": "Hi,\n\nI'd like to schedule our Q1 quarterly review. Are you available Thursday or Friday afternoon?\n\nWe should cover:\n- Project milestones\n- Budget review\n- Q2 planning\n\nBest,\nSarah Chen\nVP Operations, Acme Corp",
  "expected_category": "action_required",
  "expected_priority": "high",
  "crm_company": "Acme Corp",
  "test_notes": "VIP sender (Acme=green client), should match CRM contact, needs calendar action"
}
```

`02-approval-needed.json`:
```json
{
  "from": "james.morrison@meridianfinancial.com",
  "subject": "Invoice #MF-2026-Q1-003 needs your approval",
  "body": "Hi,\n\nPlease review and approve the attached invoice for the February consulting hours.\n\nTotal: $12,500\nDue: March 15, 2026\n\nLet me know if you have any questions.\n\nJames Morrison\nAccounts Payable, Meridian Financial",
  "expected_category": "action_required",
  "expected_priority": "high",
  "crm_company": "Meridian Financial",
  "test_notes": "Invoice approval, should link to Finance DB"
}
```

`03-project-question.json`:
```json
{
  "from": "david.park@retailco.com",
  "subject": "Re: Website redesign - need your input on homepage layout",
  "body": "Hey,\n\nWe're at a decision point on the homepage. Can you review the two mockups I shared in Drive and let me know your preference by EOD Wednesday?\n\nOption A: Hero banner with product carousel\nOption B: Video background with CTA overlay\n\nThanks,\nDavid",
  "expected_category": "action_required",
  "expected_priority": "medium",
  "crm_company": "RetailCo",
  "test_notes": "At-risk client (red), deadline-sensitive"
}
```

`04-contract-review.json`:
```json
{
  "from": "legal@techstartupinc.com",
  "subject": "Service agreement ready for your review",
  "body": "Hi,\n\nThe updated service agreement for the 2026 engagement is ready. Please review sections 3.2 (scope changes) and 5.1 (payment terms) and send back your comments.\n\nThe signed copy is needed by March 20.\n\nRegards,\nLegal Team\nTech Startup Inc.",
  "expected_category": "action_required",
  "expected_priority": "high",
  "crm_company": "Tech Startup Inc.",
  "test_notes": "New client, contract review with deadline"
}
```

`05-urgent-bug-report.json`:
```json
{
  "from": "support@acmecorp.com",
  "subject": "URGENT: Production dashboard showing incorrect revenue figures",
  "body": "Hi,\n\nOur finance team noticed the Q1 revenue dashboard is showing figures that don't match our internal records. The discrepancy is approximately $45K.\n\nCan you investigate ASAP? This is blocking our board presentation scheduled for Monday.\n\nThanks,\nAcme Corp Support",
  "expected_category": "action_required",
  "expected_priority": "critical",
  "crm_company": "Acme Corp",
  "test_notes": "URGENT keyword, should be highest priority"
}
```

`06-proposal-feedback.json`:
```json
{
  "from": "maria.santos@greenleafpartners.com",
  "subject": "Feedback on your consulting proposal",
  "body": "Hi,\n\nThanks for sending over the proposal. Overall it looks great, but I have a few questions:\n\n1. Can you break down the Phase 2 costs in more detail?\n2. Is the timeline flexible if we start in April instead of March?\n3. Do you offer volume discounts for multi-year engagements?\n\nLooking forward to your response.\n\nMaria Santos\nGreenleaf Partners",
  "expected_category": "action_required",
  "expected_priority": "high",
  "crm_company": "GreenLeaf Partners",
  "test_notes": "Partner company, proposal-related follow-up"
}
```

`07-scheduling-conflict.json`:
```json
{
  "from": "calendar-noreply@google.com",
  "subject": "Meeting conflict: Team standup vs Client call",
  "body": "You have a scheduling conflict on Thursday, March 12:\n\n10:00 AM - Team standup (recurring)\n10:00 AM - Client call with Meridian Financial\n\nPlease resolve this conflict.",
  "expected_category": "action_required",
  "expected_priority": "medium",
  "test_notes": "Calendar notification, should trigger scheduling action"
}
```

`08-expense-submission.json`:
```json
{
  "from": "accounting@naluforge.com",
  "subject": "Please submit your February expenses by Friday",
  "body": "Hi,\n\nThis is a reminder to submit your February expense report by Friday, March 13.\n\nPlease include:\n- Travel receipts\n- Client dinner receipts\n- Software subscriptions\n\nUse the standard template attached.\n\nThanks,\nAccounting",
  "expected_category": "action_required",
  "expected_priority": "medium",
  "test_notes": "Internal admin task, expense-related"
}
```

`09-client-onboarding.json`:
```json
{
  "from": "hello@newclientxyz.com",
  "subject": "Ready to get started - what do you need from us?",
  "body": "Hi,\n\nWe're excited to kick off the project! What information or access do you need from our side to get started?\n\nWe have:\n- Admin access to our Notion workspace\n- API keys for our current analytics platform\n- Brand guidelines (attached)\n\nLet us know the next steps!\n\nBest,\nNew Client XYZ",
  "expected_category": "action_required",
  "expected_priority": "high",
  "test_notes": "New client onboarding, no CRM match expected"
}
```

`10-follow-up-request.json`:
```json
{
  "from": "sarah.chen@acmecorp.com",
  "subject": "Re: Q1 deliverables - any update?",
  "body": "Hi,\n\nJust following up on the Q1 deliverables we discussed last week. Have you had a chance to review the draft report?\n\nWe need to finalize by end of month.\n\nThanks,\nSarah",
  "expected_category": "action_required",
  "expected_priority": "high",
  "crm_company": "Acme Corp",
  "test_notes": "Follow-up from VIP, should detect as follow-up candidate"
}
```

`11-payment-question.json`:
```json
{
  "from": "ap@meridianfinancial.com",
  "subject": "Payment status for Invoice #NF-2026-001",
  "body": "Hi,\n\nWe haven't received payment for Invoice #NF-2026-001 (due Feb 28). Can you provide a status update?\n\nAmount: $8,750\nPO: MF-PO-2026-445\n\nThanks,\nAccounts Payable\nMeridian Financial",
  "expected_category": "action_required",
  "expected_priority": "high",
  "crm_company": "Meridian Financial",
  "test_notes": "Payment inquiry, links to Finance DB"
}
```

`12-resource-request.json`:
```json
{
  "from": "david.park@retailco.com",
  "subject": "Need additional developer hours for March",
  "body": "Hi,\n\nThe mobile app phase is taking longer than expected. Can we add 40 hours of developer time for March?\n\nI've attached the updated project plan with the revised timeline.\n\nPlease confirm by Wednesday so I can update our internal tracking.\n\nDavid",
  "expected_category": "action_required",
  "expected_priority": "medium",
  "crm_company": "RetailCo",
  "test_notes": "Scope change request from at-risk client"
}
```

`13-meeting-notes-request.json`:
```json
{
  "from": "team@naluforge.com",
  "subject": "Can you share notes from yesterday's strategy meeting?",
  "body": "Hi,\n\nI missed yesterday's strategy meeting. Could you share the meeting notes and any action items that came out of it?\n\nThanks!",
  "expected_category": "action_required",
  "expected_priority": "low",
  "test_notes": "Internal request, low priority"
}
```

`14-renewal-discussion.json`:
```json
{
  "from": "maria.santos@greenleafpartners.com",
  "subject": "Contract renewal discussion",
  "body": "Hi,\n\nOur current contract expires at the end of Q2. I'd like to start discussing renewal terms.\n\nCan we set up a call next week to go over:\n- Updated scope for 2026 H2\n- Pricing adjustments\n- New service additions\n\nBest,\nMaria",
  "expected_category": "action_required",
  "expected_priority": "high",
  "crm_company": "GreenLeaf Partners",
  "test_notes": "Renewal opportunity, deal-related"
}
```

`15-data-request.json`:
```json
{
  "from": "analytics@acmecorp.com",
  "subject": "Need API access for the new reporting integration",
  "body": "Hi,\n\nTo set up the new reporting integration we discussed, we'll need:\n\n1. API credentials for your analytics platform\n2. Webhook URL for real-time data pushes\n3. IP whitelist for our servers (attached list)\n\nCan you provide these by end of week?\n\nThanks,\nAcme Analytics Team",
  "expected_category": "action_required",
  "expected_priority": "medium",
  "crm_company": "Acme Corp",
  "test_notes": "Technical request with multiple action items"
}
```

**Step 3: Create FYI email fixtures** (10 files in `fyi/`)

Write 10 JSON files following the same format with `expected_category: "fyi"`:
- `01-project-update.json` — Status update from team member
- `02-industry-news.json` — Shared article about industry trends
- `03-team-announcement.json` — Internal team announcement
- `04-client-thank-you.json` — Thank you note from Acme Corp
- `05-conference-recap.json` — Summary of attended conference
- `06-tool-update.json` — SaaS tool changelog notification
- `07-benchmark-report.json` — Shared benchmark data
- `08-blog-mention.json` — Notification of blog mention
- `09-partner-update.json` — GreenLeaf Partners quarterly update
- `10-office-notice.json` — Office closure/hours change

**Step 4: Create newsletter fixtures** (5 files in `newsletter/`)

Write 5 JSON files with `expected_category: "newsletter"`:
- `01-tech-digest.json` — Weekly tech newsletter
- `02-industry-report.json` — Monthly industry analysis
- `03-competitor-news.json` — Competitor product launch
- `04-marketing-tips.json` — Marketing best practices
- `05-saas-roundup.json` — SaaS tools weekly roundup

**Step 5: Create VIP email fixtures** (5 files in `vip/`)

Write 5 JSON files with known CRM contacts and `expected_priority: "high"`:
- `01-acme-ceo.json` — From Acme Corp CEO (highest VIP)
- `02-meridian-cfo.json` — From Meridian Financial CFO
- `03-greenleaf-partner.json` — From GreenLeaf managing partner
- `04-retailco-director.json` — From RetailCo project director
- `05-investor-update.json` — From known investor contact

**Step 6: Create follow-up candidate fixtures** (5 files in `follow-up-candidates/`)

Write 5 JSON files that simulate unanswered threads:
- `01-unanswered-proposal.json` — Sent proposal, no response (7 days)
- `02-pending-approval.json` — Awaiting client approval (3 days)
- `03-promise-made.json` — You promised a deliverable, not sent yet
- `04-stale-thread.json` — Thread went cold after 14 days
- `05-missed-deadline.json` — Passed promised delivery date

**Step 7: Create edge case email fixtures** (5 files in `edge-cases/`)

- `01-empty-subject.json` — Email with empty subject line
- `02-non-english.json` — Email entirely in German
- `03-very-long-thread.json` — 50+ reply thread
- `04-attachment-only.json` — No body text, only attachment reference
- `05-unicode-heavy.json` — Emojis, CJK characters, RTL text in subject+body

**Step 8: Create spam-like fixtures** (5 files in `spam-like/`)

- `01-cold-outreach.json` — Unsolicited sales pitch
- `02-free-trial.json` — "Your free trial is expiring"
- `03-event-invite.json` — Mass event invitation
- `04-survey-request.json` — "Quick 2-minute survey"
- `05-partnership-pitch.json` — Vague partnership proposal

**Step 9: Commit**

```bash
git add uat-testing/fixtures/emails/
git commit -m "feat(uat): add 50 email test fixtures across 7 categories"
```

---

### Task 6: Create calendar event fixtures

**Files:**
- Create: `uat-testing/fixtures/calendar-events/standard/*.json` (5 files)
- Create: `uat-testing/fixtures/calendar-events/recurring/*.json` (2 files)
- Create: `uat-testing/fixtures/calendar-events/edge-cases/*.json` (3+ files)

**Step 1: Create standard meeting fixtures**

Write `uat-testing/fixtures/calendar-events/standard/01-client-1on1.json`:
```json
{
  "summary": "Q1 Review with Sarah Chen (Acme Corp)",
  "start": "2026-03-12T10:00:00-07:00",
  "end": "2026-03-12T11:00:00-07:00",
  "attendees": ["sarah.chen@acmecorp.com"],
  "description": "Quarterly review: milestones, budget, Q2 planning",
  "location": "Zoom",
  "crm_company": "Acme Corp",
  "test_notes": "Standard 1:1 with known CRM contact"
}
```

Write 4 more standard meetings:
- `02-group-strategy.json` — 4 attendees, internal + client
- `03-meridian-check-in.json` — Biweekly with Meridian Financial
- `04-new-client-intro.json` — First meeting with new prospect
- `05-team-planning.json` — Internal team meeting, no client

**Step 2: Create recurring event fixtures**

Write `uat-testing/fixtures/calendar-events/recurring/01-weekly-standup.json`:
```json
{
  "summary": "Team Weekly Standup",
  "start": "2026-03-10T09:00:00-07:00",
  "end": "2026-03-10T09:30:00-07:00",
  "recurrence": ["RRULE:FREQ=WEEKLY;BYDAY=MO"],
  "attendees": ["team@naluforge.com"],
  "test_notes": "Recurring weekly, should appear multiple times"
}
```

- `02-monthly-review.json` — Monthly client review (recurring)

**Step 3: Create edge case calendar fixtures**

- `01-cancelled-meeting.json` — Status: cancelled
- `02-all-day-event.json` — All-day offsite
- `03-no-attendees.json` — Event with no attendees (personal block)
- `04-past-meeting.json` — Meeting from last week (for Meeting Intel analysis)

**Step 4: Commit**

```bash
git add uat-testing/fixtures/calendar-events/
git commit -m "feat(uat): add 11 calendar event test fixtures"
```

---

### Task 7: Create document fixtures

**Files:**
- Create: `uat-testing/fixtures/documents/invoices/*.json` (5 valid + 2 malformed)
- Create: `uat-testing/fixtures/documents/contracts/*.md` (3 files)
- Create: `uat-testing/fixtures/documents/proposals/*.md` (3 files)
- Create: `uat-testing/fixtures/documents/csv-data/*.csv` (5 files)
- Create: `uat-testing/fixtures/documents/sow-templates/*.md` (2 files)

**Step 1: Create invoice fixtures**

Write `uat-testing/fixtures/documents/invoices/inv-001-acme-valid.json`:
```json
{
  "invoice_number": "NF-2026-001",
  "vendor": "NaluForge LLC",
  "client": "Acme Corp",
  "date": "2026-02-28",
  "due_date": "2026-03-28",
  "line_items": [
    {"description": "Consulting hours - February", "quantity": 80, "rate": 150, "amount": 12000},
    {"description": "Cloud infrastructure", "quantity": 1, "rate": 500, "amount": 500}
  ],
  "subtotal": 12500,
  "tax": 0,
  "total": 12500,
  "currency": "USD",
  "status": "pending",
  "test_notes": "Standard valid invoice for Acme Corp (green client)"
}
```

Write 4 more valid invoices (varying amounts, clients, line items) and 2 malformed:
- `inv-002-meridian-valid.json` — $8,750 consulting
- `inv-003-retailco-valid.json` — $3,200 project work
- `inv-004-greenleaf-valid.json` — $15,000 retainer
- `inv-005-multi-currency.json` — EUR invoice
- `inv-006-malformed-missing-fields.json` — Missing client and total
- `inv-007-malformed-negative-amount.json` — Negative line item

**Step 2: Create contract fixtures**

Write `uat-testing/fixtures/documents/contracts/contract-001-standard.md`:
```markdown
# Service Agreement

**Between:** NaluForge LLC ("Provider") and Acme Corp ("Client")
**Effective Date:** January 1, 2026
**Term:** 12 months

## 1. Services
Provider shall deliver consulting services including...

## 2. Compensation
Client shall pay Provider $150/hour for consulting services...

## 3. Intellectual Property
All work product created under this agreement...

## 4. Confidentiality
Both parties agree to maintain confidentiality of...

## 5. Termination
Either party may terminate with 30 days written notice...

## 6. Limitation of Liability
Provider's total liability shall not exceed...
```

Write 2 more contracts:
- `contract-002-complex.md` — Multi-section with subcontractor clauses
- `contract-003-renewal.md` — Renewal amendment with changed terms

**Step 3: Create CSV data fixtures**

Write `uat-testing/fixtures/documents/csv-data/sales-q1-2026.csv`:
```csv
date,client,service,hours,rate,revenue
2026-01-05,Acme Corp,Consulting,40,150,6000
2026-01-12,Meridian Financial,Consulting,20,175,3500
2026-01-19,RetailCo,Development,35,125,4375
2026-01-26,Acme Corp,Consulting,45,150,6750
2026-02-02,GreenLeaf Partners,Strategy,15,200,3000
2026-02-09,Meridian Financial,Consulting,25,175,4375
2026-02-16,RetailCo,Development,30,125,3750
2026-02-23,Acme Corp,Consulting,50,150,7500
2026-03-02,GreenLeaf Partners,Strategy,20,200,4000
2026-03-07,Meridian Financial,Consulting,15,175,2625
```

Write 4 more CSVs:
- `time-tracking-feb.csv` — Hours per project per day
- `expenses-q1.csv` — Business expenses with categories
- `client-satisfaction.csv` — NPS scores per client
- `project-milestones.csv` — Milestone dates and completion status

**Step 4: Create proposal and SOW fixtures**

Write `uat-testing/fixtures/documents/proposals/proposal-001-consulting.md` — Standard consulting proposal
Write `uat-testing/fixtures/documents/proposals/proposal-002-retainer.md` — Retainer arrangement
Write `uat-testing/fixtures/documents/proposals/proposal-003-project.md` — Fixed-price project

Write `uat-testing/fixtures/documents/sow-templates/sow-001-standard.md` — Standard SOW with milestones
Write `uat-testing/fixtures/documents/sow-templates/sow-002-agile.md` — Agile sprint-based SOW

**Step 5: Create edge case fixtures**

Write empty files and malformed content:
```bash
touch uat-testing/fixtures/edge-cases/empty-files/empty.json
touch uat-testing/fixtures/edge-cases/empty-files/empty.csv
touch uat-testing/fixtures/edge-cases/empty-files/empty.md
```

Write `uat-testing/fixtures/edge-cases/malformed-json/broken-structure.json`:
```json
{"invoice": {"number": "TEST", "items": [{"bad": }]}}
```

Write `uat-testing/fixtures/edge-cases/unicode-heavy/multilingual-invoice.json` — Invoice with Japanese, Arabic, and emoji characters

Generate a 5MB+ file for large file testing:
```bash
dd if=/dev/urandom bs=1024 count=5120 | base64 > uat-testing/fixtures/edge-cases/large-files/large-document.txt
```

**Step 6: Commit**

```bash
git add uat-testing/fixtures/documents/ uat-testing/fixtures/edge-cases/
git commit -m "feat(uat): add document fixtures (invoices, contracts, CSVs, edge cases)"
```

---

### Task 8: Write data seeding scripts

**Files:**
- Create: `uat-testing/scripts/seed-test-emails.sh`
- Create: `uat-testing/scripts/seed-calendar-events.sh`
- Create: `uat-testing/scripts/reset-notion-test-data.sh`

**Step 1: Write email seeding script**

Write `uat-testing/scripts/seed-test-emails.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

# This script seeds the Gmail test account with test emails from fixtures.
# It uses the Gmail MCP server to send emails to the test account.
# Requires: Gmail MCP configured in .mcp.json

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UAT_DIR="$(dirname "$SCRIPT_DIR")"
FIXTURES_DIR="$UAT_DIR/fixtures/emails"
MANIFEST="$UAT_DIR/results/email-seed-manifest.json"

echo "=== Seeding Gmail Test Account ==="
echo ""

# Collect all email fixtures
fixtures=$(find "$FIXTURES_DIR" -name "*.json" -not -name "README.md" | sort)
count=$(echo "$fixtures" | wc -l | tr -d ' ')

echo "Found $count email fixtures to seed"
echo ""

# Output fixture summary for the Claude agent to process
# The actual sending is done by the swarm's data prep agent via Gmail MCP
echo "{"  > "$MANIFEST"
echo "  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"," >> "$MANIFEST"
echo "  \"total_fixtures\": $count," >> "$MANIFEST"
echo "  \"categories\": {" >> "$MANIFEST"

for category in action-required fyi newsletter vip follow-up-candidates edge-cases spam-like; do
  cat_count=$(find "$FIXTURES_DIR/$category" -name "*.json" 2>/dev/null | wc -l | tr -d ' ')
  echo "    \"$category\": $cat_count," >> "$MANIFEST"
done

echo "  }," >> "$MANIFEST"
echo "  \"fixtures\": [" >> "$MANIFEST"

first=true
for fixture in $fixtures; do
  if [ "$first" = true ]; then
    first=false
  else
    echo "," >> "$MANIFEST"
  fi
  rel_path="${fixture#$FIXTURES_DIR/}"
  echo -n "    \"$rel_path\"" >> "$MANIFEST"
done

echo "" >> "$MANIFEST"
echo "  ]," >> "$MANIFEST"
echo "  \"status\": \"ready_for_seeding\"" >> "$MANIFEST"
echo "}" >> "$MANIFEST"

echo ""
echo "Manifest written to: $MANIFEST"
echo "The swarm data prep agent will read this manifest and send emails via Gmail MCP."
echo ""
echo "=== Email Seeding Manifest Ready ==="
```

**Step 2: Write calendar seeding script** (similar pattern for `seed-calendar-events.sh`)

**Step 3: Write Notion reset script**

Write `uat-testing/scripts/reset-notion-test-data.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

# This script prepares a manifest for resetting Notion test data.
# The actual DB operations are performed by the swarm data prep agent via Notion MCP.
#
# Strategy:
# 1. Archive all records with Source Plugin = "UAT Test" in each HQ database
# 2. Re-seed from the base 224 records (phases 1-12 of test data plan)
# 3. Verify record counts match expected values

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UAT_DIR="$(dirname "$SCRIPT_DIR")"
MANIFEST="$UAT_DIR/results/notion-reset-manifest.json"

echo "=== Notion Test Data Reset ==="

cat > "$MANIFEST" << 'MANIFEST_EOF'
{
  "timestamp": "AUTO",
  "operation": "reset_test_data",
  "databases": [
    {"name": "Founder OS HQ - Companies", "expected_count": 8, "reset_strategy": "preserve_base"},
    {"name": "Founder OS HQ - Contacts", "expected_count": 15, "reset_strategy": "preserve_base"},
    {"name": "Founder OS HQ - Deals", "expected_count": 6, "reset_strategy": "preserve_base"},
    {"name": "Founder OS HQ - Communications", "expected_count": 12, "reset_strategy": "preserve_base"},
    {"name": "Founder OS HQ - Tasks", "expected_count": 30, "reset_strategy": "archive_uat_then_reseed"},
    {"name": "Founder OS HQ - Meetings", "expected_count": 12, "reset_strategy": "archive_uat_then_reseed"},
    {"name": "Founder OS HQ - Finance", "expected_count": 25, "reset_strategy": "archive_uat_then_reseed"},
    {"name": "Founder OS HQ - Briefings", "expected_count": 0, "reset_strategy": "archive_all_uat"},
    {"name": "Founder OS HQ - Knowledge Base", "expected_count": 0, "reset_strategy": "archive_all_uat"},
    {"name": "Founder OS HQ - Research", "expected_count": 0, "reset_strategy": "archive_all_uat"},
    {"name": "Founder OS HQ - Reports", "expected_count": 0, "reset_strategy": "archive_all_uat"},
    {"name": "Founder OS HQ - Content", "expected_count": 0, "reset_strategy": "archive_all_uat"},
    {"name": "Founder OS HQ - Deliverables", "expected_count": 8, "reset_strategy": "preserve_base"},
    {"name": "Founder OS HQ - Prompts", "expected_count": 0, "reset_strategy": "archive_all_uat"},
    {"name": "Founder OS HQ - Goals", "expected_count": 0, "reset_strategy": "archive_all_uat"},
    {"name": "Founder OS HQ - Milestones", "expected_count": 0, "reset_strategy": "archive_all_uat"},
    {"name": "Founder OS HQ - Learnings", "expected_count": 0, "reset_strategy": "archive_all_uat"},
    {"name": "Founder OS HQ - Weekly Insights", "expected_count": 0, "reset_strategy": "archive_all_uat"},
    {"name": "Founder OS HQ - Workflows", "expected_count": 0, "reset_strategy": "archive_all_uat"},
    {"name": "Founder OS HQ - Activity Log", "expected_count": 0, "reset_strategy": "archive_all_uat"}
  ],
  "instructions": "Data prep agent: iterate databases, archive records where Source='UAT Test', verify counts"
}
MANIFEST_EOF

# Replace AUTO timestamp
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' "s/\"AUTO\"/\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"/" "$MANIFEST"
else
  sed -i "s/\"AUTO\"/\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"/" "$MANIFEST"
fi

echo "Reset manifest written to: $MANIFEST"
echo "The swarm data prep agent will execute this via Notion MCP."
echo ""
echo "=== Reset Manifest Ready ==="
```

**Step 4: Make all scripts executable**

```bash
chmod +x uat-testing/scripts/*.sh
```

**Step 5: Commit**

```bash
git add uat-testing/scripts/
git commit -m "feat(uat): add data seeding and reset scripts"
```

---

## Phase 3: Swarm Configurations

### Task 9: Create the Notion Test Results database template

**Files:**
- Create: `uat-testing/fixtures/notion-test-results-db-template.json`

**Step 1: Write the DB template**

Write `uat-testing/fixtures/notion-test-results-db-template.json`:
```json
{
  "title": "[FOS] Test Results",
  "description": "UAT test results for all 30 Founder OS plugins",
  "icon": "🧪",
  "properties": {
    "Test ID": {
      "type": "title",
      "description": "Format: P{NN}-{CAT}-{SEQ} e.g. P01-HP-001"
    },
    "Plugin": {
      "type": "select",
      "options": [
        "P01 Inbox Zero", "P02 Daily Briefing", "P03 Meeting Prep",
        "P04 Action Items", "P05 Weekly Review", "P06 Follow-Up Tracker",
        "P07 Meeting Intel", "P08 Newsletter Engine", "P09 Report Generator",
        "P10 Client Health", "P11 Invoice Processor", "P12 Proposal Automator",
        "P13 Contract Analyzer", "P14 SOW Generator", "P15 Competitive Intel",
        "P16 Expense Report", "P17 Notion Command Center", "P18 Drive Brain",
        "P19 Slack Digest", "P20 Client Context", "P21 CRM Sync",
        "P22 Morning Sync", "P23 Knowledge Base", "P24 LinkedIn Post",
        "P25 Time Savings", "P26 Prompt Library", "P27 Workflow Automator",
        "P28 Workflow Documenter", "P29 Learning Log", "P30 Goal Tracker"
      ]
    },
    "Pillar": {
      "type": "select",
      "options": ["Pillar 1: Daily Work", "Pillar 2: Code Without Coding", "Pillar 3: MCP & Integrations", "Pillar 4: Meta & Growth", "Cross-Plugin Chains", "Stress Test"]
    },
    "Category": {
      "type": "select",
      "options": ["Happy Path", "DB Discovery", "Type Column", "Idempotency", "Company Relation", "Graceful Degradation", "Edge Case"]
    },
    "Status": {
      "type": "select",
      "options": [
        {"name": "Pass", "color": "green"},
        {"name": "Fail", "color": "red"},
        {"name": "Skip", "color": "gray"},
        {"name": "Error", "color": "orange"}
      ]
    },
    "Error Detail": {"type": "rich_text"},
    "Expected": {"type": "rich_text"},
    "Actual": {"type": "rich_text"},
    "Duration": {"type": "number", "format": "number"},
    "Run ID": {"type": "rich_text"},
    "Agent": {"type": "rich_text"},
    "Company": {
      "type": "relation",
      "relation_database": "Founder OS HQ - Companies"
    }
  },
  "views": [
    {
      "name": "All Results",
      "type": "table",
      "sort": [{"property": "Plugin", "direction": "ascending"}]
    },
    {
      "name": "Failures Only",
      "type": "table",
      "filter": {"property": "Status", "select": {"does_not_equal": "Pass"}}
    },
    {
      "name": "By Pillar",
      "type": "board",
      "group_by": "Pillar"
    }
  ]
}
```

**Step 2: Commit**

```bash
git add uat-testing/fixtures/notion-test-results-db-template.json
git commit -m "feat(uat): add Notion Test Results database template"
```

---

### Task 10: Create validator agent instructions

**Files:**
- Create: `uat-testing/validators/notion-db-validator.md`
- Create: `uat-testing/validators/output-schema-validator.md`
- Create: `uat-testing/validators/degradation-validator.md`

**Step 1: Write Notion DB validator**

Write `uat-testing/validators/notion-db-validator.md`:
```markdown
# Notion Database Validator Agent

You are a validation agent responsible for verifying the correctness of Notion database writes after each plugin test run.

## Validation Checks

### 1. Type Column Enforcement
For every merged database, verify the Type column matches expected values:

| Database | Valid Type Values |
|----------|-----------------|
| Tasks | Email Task, Action Item, Follow-Up |
| Finance | Invoice, Expense |
| Briefings | Daily Briefing, Weekly Review, Slack Digest, Morning Sync |
| Content | Email Draft, Newsletter, LinkedIn Post |
| Deliverables | Proposal, Contract, SOW |
| Research | Newsletter Research, Competitive Analysis |
| Reports | Business Report, Expense Report, ROI Report |
| Workflows | Execution, SOP |
| Knowledge Base | Source, Query |

**Fail if:** Type column is empty, misspelled, or contains an unexpected value.

### 2. Company Relation Integrity
For records that should have a Company relation:
- Verify the relation points to a valid Company page
- Verify the Company name matches expected CRM data
- Check that email domain matching worked (e.g., @acmecorp.com → Acme Corp)

**Fail if:** Company relation is empty when client context was available, or points to wrong company.

### 3. Idempotency Check
After a plugin test runs twice with the same input:
- Query the database for matching records
- Count should be exactly 1 (not 2)
- The record should have an updated timestamp (not the original)

**Fail if:** Duplicate records exist with same compound key (Title + Type + Date).

### 4. Record Completeness
Verify all required fields are populated:
- Title (never empty)
- Type (for merged DBs)
- Status (if applicable)
- Created time (auto-populated)

**Fail if:** Required fields are empty.

### 5. Cross-Database Relations
For records that reference other databases:
- Verify relation links are valid (page exists)
- Verify bidirectional relations are consistent

**Fail if:** Broken relation links.

## Output Format

For each check, output:
```json
{
  "test_id": "P01-TC-001",
  "check": "type_column",
  "database": "Founder OS HQ - Tasks",
  "status": "pass|fail",
  "expected": "Email Task",
  "actual": "Email Task",
  "record_id": "notion-page-id",
  "error_detail": null
}
```
```

**Step 2: Write output schema validator**

Write `uat-testing/validators/output-schema-validator.md`:
```markdown
# Output Schema Validator Agent

You validate that plugin command outputs match their expected JSON schema structure.

## Common Output Schema

Every plugin command should return output with:
```json
{
  "status": "complete",
  "plugin": "founder-os-[name]",
  "command": "/namespace:action",
  "timestamp": "ISO 8601",
  "data": { ... }
}
```

## Validation Rules

1. **status** must be exactly "complete" (not "done", "success", "ok")
2. **plugin** must match the plugin folder name
3. **timestamp** must be valid ISO 8601
4. **data** must contain the plugin-specific output fields

## Per-Plugin Expected Fields

### P01 Inbox Zero (/inbox:triage)
- data.emails_processed (number)
- data.categories (object with counts per category)
- data.actions_created (number)
- data.drafts_created (number)

### P02 Daily Briefing (/daily:briefing)
- data.sections (array of section objects)
- data.email_summary (object)
- data.calendar_summary (object)
- data.task_summary (object)

### P10 Client Health (/client:health-scan)
- data.clients (array of client health objects)
- data.clients[].health_score (number 0-100)
- data.clients[].scores (object with 5 component scores)

[Continue for all 30 plugins based on their SKILL.md output specifications]

## Fail Criteria
- Missing required fields
- Wrong data types
- status != "complete"
- Empty data object
```

**Step 3: Write degradation validator**

Write `uat-testing/validators/degradation-validator.md`:
```markdown
# Graceful Degradation Validator Agent

You verify that plugins handle missing MCP servers correctly.

## Test Protocol

For each plugin with optional MCP dependencies:
1. Disconnect the optional MCP server
2. Run the plugin command
3. Verify the output includes degradation indicators

## Expected Degradation Behavior

### When Notion is unavailable (critical — should error):
- Plugin should return clear error message
- No partial writes to other systems
- User-facing message explains what happened

### When Gmail is unavailable (optional for most):
- Email-related sections return `{"status": "unavailable", "reason": "Gmail MCP not connected"}`
- Other sections still populate normally
- No crash or unhandled exception

### When Calendar is unavailable:
- Calendar sections return `{"status": "unavailable"}`
- Meeting-related features skipped gracefully

### When Drive/Slack/Web Search unavailable:
- Relevant sections return `{"status": "unavailable"}`
- Core plugin functionality still works

## Plugins to Test (by skipped MCP)

### Drive unavailable (skipped in UAT):
- P09 Report Generator — should skip Drive export, local output only
- P18 Drive Brain — should return all-unavailable (Drive is required)
- P20 Client Context — should skip Drive documents section

### Slack unavailable:
- P19 Slack Digest — should return unavailable (Slack is required)

### Web Search unavailable:
- P08 Newsletter Engine — should skip research section
- P15 Competitive Intel — should return unavailable (Web Search is required)

## Output Format
```json
{
  "test_id": "P09-GD-001",
  "plugin": "P09 Report Generator",
  "missing_mcp": "google-drive",
  "status": "pass|fail",
  "degradation_handled": true,
  "error_message_clear": true,
  "other_features_work": true,
  "error_detail": null
}
```
```

**Step 4: Commit**

```bash
git add uat-testing/validators/
git commit -m "feat(uat): add validator agent instructions (DB, schema, degradation)"
```

---

### Task 11: Create Pillar 1 swarm configuration

**Files:**
- Create: `uat-testing/swarms/pillar-1-daily-work.yaml`

**Step 1: Write Pillar 1 swarm YAML**

Write `uat-testing/swarms/pillar-1-daily-work.yaml`:
```yaml
# Pillar 1: Daily Work — Plugins P01-P08
# Swarm topology: hierarchical (coordinator + 4 agent types)
# Gate: ≥90% pass rate to proceed to Pillar 2

name: pillar-1-daily-work
description: "UAT testing for Pillar 1: Daily Work plugins (P01-P08)"
topology: hierarchical
maxAgents: 10
strategy: centralized

gate:
  pass_threshold: 0.90
  critical_failures_allowed: 0
  next_swarm: pillar-2-code-without-coding

# Execution order respects dependencies:
# P04 (no deps) → P01 (Gmail) → P06 (needs P01) → P02,P03,P05,P07,P08 (parallel)
execution_order:
  - phase: 1
    parallel: false
    plugins: [P04]
    reason: "No dependencies, tests basic Notion-only action extraction"

  - phase: 2
    parallel: false
    plugins: [P01]
    reason: "Gmail-dependent, must run before P06 (follow-ups depend on inbox data)"

  - phase: 3
    parallel: false
    plugins: [P06]
    reason: "Depends on P01 creating email tasks and follow-up candidates"

  - phase: 4
    parallel: true
    plugins: [P02, P03, P05, P07, P08]
    reason: "Independent plugins, can run simultaneously"

agents:
  coordinator:
    role: "Pillar 1 Test Coordinator"
    instructions: |
      You orchestrate UAT testing for Pillar 1 (Daily Work) plugins.

      EXECUTION PROTOCOL:
      1. Call data-prep agent to verify test data and seed Gmail/Calendar fixtures
      2. Run plugin tests in execution_order (phases 1-4)
      3. After each plugin test, call validation agent to check DB writes
      4. After all plugins, call reporter agent to write results
      5. Calculate pass rate. If ≥90%, signal ready for Pillar 2. If <90%, report blockers.

      DEPENDENCY NOTES:
      - P04 must pass before P01 (P04 validates basic Notion writes)
      - P01 must pass before P06 (P06 reads P01's email tasks)
      - P02,P03,P05,P07,P08 are independent

  data-prep:
    role: "Test Data Preparation Agent"
    instructions: |
      You prepare test data for Pillar 1 testing.

      TASKS:
      1. Verify 224 base records exist in HQ databases (query each, check counts)
      2. Read email seed manifest from results/email-seed-manifest.json
      3. Send test emails to Gmail test account using Gmail MCP:
         - 15 action-required emails
         - 10 FYI emails
         - 5 newsletters
         - 5 VIP emails
         - 5 follow-up candidates
         - 5 edge cases
         - 5 spam-like
      4. Create calendar events from fixtures/calendar-events/
      5. Output readiness report with counts per fixture category

      IMPORTANT: Wait for all emails to arrive (check inbox count) before signaling ready.

  plugin-tester:
    role: "Plugin Test Executor"
    instructions: |
      You execute integration tests for a single plugin.

      FOR EACH PLUGIN, run these 7 test categories:

      1. HAPPY PATH (HP):
         - Run the plugin's primary command with standard test data
         - Verify output matches expected schema (status: "complete")
         - Verify Notion DB write occurred

      2. DB DISCOVERY (DD):
         - Search for "Founder OS HQ - [DBName]" — should find it
         - If plugin supports fallback, also test with legacy name
         - Verify correct DB was used

      3. TYPE COLUMN (TC):
         - After happy path write, query the DB record
         - Verify Type column matches expected value (see CLAUDE.md table)
         - Verify Source Plugin column is set

      4. IDEMPOTENCY (ID):
         - Run the same command again with identical input
         - Query DB for matching records
         - Verify count=1 (updated, not duplicated)

      5. COMPANY RELATION (CR):
         - For commands involving known CRM clients (Acme, Meridian, RetailCo)
         - Verify Company relation is populated on the DB record
         - Verify correct company matched

      6. GRACEFUL DEGRADATION (GD):
         - For plugins with optional MCPs, test with unavailable MCP
         - Verify {"status": "unavailable"} in affected sections
         - Verify other sections still work

      7. EDGE CASES (EC):
         - Empty input, malformed data, Unicode content
         - Verify no crash, meaningful error message

      OUTPUT: JSON array of test results per category.

      PLUGIN-SPECIFIC INSTRUCTIONS:

      P01 INBOX ZERO:
      - HP: Run /inbox:triage with seeded test emails
      - Expected: Emails categorized into action_required, fyi, newsletter, etc.
      - TC: Type="Email Task" in Tasks DB, Type="Email Draft" in Content DB
      - CR: Emails from @acmecorp.com should link to Acme Corp
      - GD: Test with Notion unavailable (should error), then with Gmail unavailable (should error — Gmail required)

      P02 DAILY BRIEFING:
      - HP: Run /daily:briefing
      - Expected: Multi-section briefing with email, calendar, task summaries
      - TC: Type="Daily Briefing" in Briefings DB
      - GD: Calendar unavailable → skip calendar section, still produce briefing

      P03 MEETING PREP:
      - HP: Run /meeting:prep for next upcoming meeting
      - Expected: Context dossier with attendee info, past interactions
      - TC: No Type column (Meetings DB is single-use)
      - CR: Meeting with Acme attendees → Company relation to Acme Corp

      P04 ACTION ITEMS:
      - HP: Paste meeting notes text, extract action items
      - Expected: Structured list of action items with assignees, deadlines
      - TC: Type="Action Item" in Tasks DB

      P05 WEEKLY REVIEW:
      - HP: Run /weekly:review
      - Expected: Week summary with accomplishments, blockers, next week plan
      - TC: Type="Weekly Review" in Briefings DB

      P06 FOLLOW-UP TRACKER:
      - HP: Run /followup:scan
      - Expected: List of pending follow-ups (unanswered threads, promises)
      - TC: Type="Follow-Up" in Tasks DB
      - Dependency: Needs P01 email tasks to exist first

      P07 MEETING INTEL:
      - HP: Provide meeting transcript, get analysis
      - Expected: Key decisions, action items, sentiment
      - TC: Writes to Meetings DB (shared with P03, uses Event ID)
      - ID: Same meeting analyzed twice → update, not duplicate

      P08 NEWSLETTER ENGINE:
      - HP: Run /newsletter:draft with topic
      - Expected: Newsletter draft with sections
      - TC: Type="Newsletter" in Content DB, Type="Newsletter Research" in Research DB
      - GD: Web Search unavailable → skip research, draft from existing knowledge

  validator:
    role: "Database Validation Agent"
    instructions: |
      After each plugin test completes, validate the Notion database state.
      Follow the instructions in validators/notion-db-validator.md.
      Also run validators/output-schema-validator.md checks on the command output.

      For Pillar 1, pay special attention to:
      - Tasks DB: 3 different Type values from P01, P04, P06
      - Briefings DB: Type values from P02, P05
      - Content DB: Type="Email Draft" from P01
      - Research DB: Type="Newsletter Research" from P08
      - Meetings DB: shared records from P03 and P07

  reporter:
    role: "Test Results Reporter Agent"
    instructions: |
      You write test results to the [FOS] Test Results Notion database.

      FOR EACH TEST RESULT:
      1. Search for "[FOS] Test Results" database
      2. Create a page with:
         - Test ID: P{NN}-{CAT}-{SEQ} format
         - Plugin: select value (e.g., "P01 Inbox Zero")
         - Pillar: "Pillar 1: Daily Work"
         - Category: select value
         - Status: Pass/Fail/Skip/Error
         - Error Detail: failure description if applicable
         - Expected: what should have happened
         - Actual: what actually happened
         - Duration: seconds
         - Run ID: timestamp of this test run
         - Agent: "pillar-1-plugin-tester"
      3. Also write to local JSON: results/pillar-1-run-{timestamp}.json

      SUMMARY:
      After all results written, output:
      - Total tests: N
      - Passed: N (X%)
      - Failed: N (X%)
      - Skipped: N
      - Errors: N
      - Gate status: PASS (≥90%) or FAIL (<90%)
      - Critical failures: list any
```

**Step 2: Commit**

```bash
git add uat-testing/swarms/pillar-1-daily-work.yaml
git commit -m "feat(uat): add Pillar 1 Daily Work swarm configuration"
```

---

### Task 12: Create Pillar 2 swarm configuration

**Files:**
- Create: `uat-testing/swarms/pillar-2-code-without-coding.yaml`

**Step 1: Write Pillar 2 swarm YAML**

Write `uat-testing/swarms/pillar-2-code-without-coding.yaml`:
```yaml
# Pillar 2: Code Without Coding — Plugins P09-P16
# Gate: ≥90% pass rate to proceed to Pillar 3

name: pillar-2-code-without-coding
description: "UAT testing for Pillar 2: Code Without Coding plugins (P09-P16)"
topology: hierarchical
maxAgents: 10
strategy: centralized

gate:
  pass_threshold: 0.90
  critical_failures_allowed: 0
  next_swarm: pillar-3-integrations

# Execution order:
# P09,P11,P12,P13,P15 (parallel) → P14 (needs P12) → P16 (needs P11) → P10 (if not run in P3)
execution_order:
  - phase: 1
    parallel: true
    plugins: [P09, P11, P12, P13, P15]
    reason: "Independent plugins, all use Filesystem MCP for document processing"

  - phase: 2
    parallel: false
    plugins: [P14]
    reason: "SOW Generator depends on P12 Proposal Automator output"

  - phase: 3
    parallel: true
    plugins: [P16, P10]
    reason: "P16 Expense Report needs P11 invoice data; P10 can run here for Pillar 2 validation"

agents:
  coordinator:
    role: "Pillar 2 Test Coordinator"
    instructions: |
      You orchestrate UAT testing for Pillar 2 (Code Without Coding) plugins.
      Follow same protocol as Pillar 1 coordinator.

      FILESYSTEM FOCUS: Most Pillar 2 plugins process local files.
      Ensure fixtures/documents/ has all required test files before starting.

  data-prep:
    role: "Test Data Preparation Agent"
    instructions: |
      Verify document fixtures exist:
      - fixtures/documents/invoices/ (5 valid + 2 malformed)
      - fixtures/documents/contracts/ (3 files)
      - fixtures/documents/proposals/ (3 files)
      - fixtures/documents/csv-data/ (5 CSV files)
      - fixtures/documents/sow-templates/ (2 files)
      - fixtures/edge-cases/ (empty, malformed, large, unicode)

      Also verify Pillar 1 outputs exist in Notion (needed for P10, P16):
      - Tasks DB has Email Task records (from P01)
      - Finance DB has invoice records (from base data)

  plugin-tester:
    role: "Plugin Test Executor"
    instructions: |
      Execute 7 test categories for each Pillar 2 plugin.

      P09 REPORT GENERATOR:
      - HP: Run /report:generate with CSV data fixture
      - Expected: Formatted report with charts, executive summary
      - TC: Type="Business Report" in Reports DB
      - GD: Drive unavailable → local-only output (no Drive upload)
      - EC: Empty CSV, single-row CSV, missing columns

      P10 CLIENT HEALTH DASHBOARD:
      - HP: Run /client:health-scan
      - Expected: Health scores for all seeded companies (Acme=85+, Meridian=55-65, RetailCo=<40)
      - TC: Writes health properties to Companies DB (not separate DB)
      - CR: Each company page updated with 5 component scores
      - ID: Re-scan should update scores, not create duplicates
      - EC: New company with zero history → floor scores

      P11 INVOICE PROCESSOR:
      - HP: Run /invoice:process with fixtures/documents/invoices/
      - Expected: Extracted line items, categorized, written to Finance DB
      - TC: Type="Invoice" in Finance DB
      - CR: Invoice client matched to CRM company
      - EC: Malformed invoice → error message, not crash

      P12 PROPOSAL AUTOMATOR:
      - HP: Run /proposal:create with client context
      - Expected: Formatted proposal document
      - TC: Type="Proposal" in Deliverables DB

      P13 CONTRACT ANALYZER:
      - HP: Run /contract:analyze with fixtures/documents/contracts/
      - Expected: Clause analysis, risk flags, key terms extracted
      - TC: Type="Contract" in Deliverables DB

      P14 SOW GENERATOR:
      - HP: Run /sow:generate (depends on P12 proposal output)
      - Expected: SOW with milestones, deliverables, timeline
      - TC: Type="SOW" in Deliverables DB
      - Dependency: Needs P12 proposal to exist

      P15 COMPETITIVE INTEL:
      - HP: Run /competitive:analyze with topic
      - TC: Type="Competitive Analysis" in Research DB
      - GD: Web Search unavailable → should return unavailable (required MCP)

      P16 EXPENSE REPORT:
      - HP: Run /expense:report for a date range
      - Expected: Aggregated expenses from Finance DB
      - TC: Type="Expense Report" in Reports DB
      - Dependency: Reads P11 invoice data from Finance DB

  validator:
    role: "Database Validation Agent"
    instructions: |
      Validate Pillar 2 database writes:
      - Finance DB: Type="Invoice" (P11) and Type="Expense" coexist
      - Deliverables DB: Type="Proposal" (P12), "Contract" (P13), "SOW" (P14)
      - Reports DB: Type="Business Report" (P09), "Expense Report" (P16)
      - Research DB: Type="Competitive Analysis" (P15)
      - Companies DB: Health score properties updated (P10)

  reporter:
    role: "Test Results Reporter Agent"
    instructions: |
      Same as Pillar 1 reporter but with Pillar="Pillar 2: Code Without Coding".
```

**Step 2: Commit**

```bash
git add uat-testing/swarms/pillar-2-code-without-coding.yaml
git commit -m "feat(uat): add Pillar 2 Code Without Coding swarm configuration"
```

---

### Task 13: Create Pillar 3 swarm configuration

**Files:**
- Create: `uat-testing/swarms/pillar-3-integrations.yaml`

**Step 1: Write Pillar 3 swarm YAML**

Write `uat-testing/swarms/pillar-3-integrations.yaml`:
```yaml
# Pillar 3: MCP & Integrations — Plugins P17-P24
# Gate: ≥90% pass rate to proceed to Pillar 4

name: pillar-3-integrations
description: "UAT testing for Pillar 3: MCP & Integrations plugins (P17-P24)"
topology: hierarchical
maxAgents: 10
strategy: centralized

gate:
  pass_threshold: 0.90
  critical_failures_allowed: 0
  next_swarm: pillar-4-meta-growth

# Execution order:
# P17,P18,P19,P23 (parallel) → P21 (CRM sync) → P20 (needs P21) → P22,P24 (parallel)
execution_order:
  - phase: 1
    parallel: true
    plugins: [P17, P18, P19, P23]
    reason: "Independent: Notion commands, Drive, Slack, Knowledge Base"

  - phase: 2
    parallel: false
    plugins: [P21]
    reason: "CRM Sync must populate Communications before P20 reads them"

  - phase: 3
    parallel: false
    plugins: [P20]
    reason: "Client Context Loader reads P21's Communications data"

  - phase: 4
    parallel: true
    plugins: [P22, P24]
    reason: "Morning Sync and LinkedIn Post are independent"

agents:
  coordinator:
    role: "Pillar 3 Test Coordinator"
    instructions: |
      INTEGRATION FOCUS: Pillar 3 tests multi-MCP orchestration.
      Key dependency: P21 (CRM Sync) must complete before P20 (Client Context).

      DEGRADATION TESTING is critical here:
      - P18 (Drive Brain): Drive unavailable → full degradation test
      - P19 (Slack Digest): Slack unavailable → full degradation test
      - P20 (Client Context): Drive unavailable → partial degradation

  data-prep:
    role: "Test Data Preparation Agent"
    instructions: |
      Verify CRM data is ready:
      - Companies DB has 8 companies with relations
      - Communications DB has 12 records
      - Contacts DB has 15 records with company relations
      - Knowledge Base DB has seed entries (if any from base data)

      Verify Gmail test account has emails from Pillar 1 testing.
      Verify Calendar has events from Pillar 1 testing.

  plugin-tester:
    role: "Plugin Test Executor"
    instructions: |
      P17 NOTION COMMAND CENTER:
      - HP: Run /notion:search, /notion:status commands
      - Expected: Returns Notion workspace data, database listings
      - TC: Stateless plugin, no DB writes
      - This is a query-only plugin — focus on response accuracy

      P18 GOOGLE DRIVE BRAIN:
      - GD: Drive MCP is NOT connected in UAT → full degradation test
      - Expected: Clear "Google Drive MCP not connected" message
      - Verify no crash, clean error handling

      P19 SLACK DIGEST ENGINE:
      - GD: Slack MCP is NOT connected in UAT → full degradation test
      - Expected: Clear "Slack MCP not connected" message
      - Verify no crash, clean error handling

      P20 CLIENT CONTEXT LOADER:
      - HP: Run /client:load for "Acme Corp"
      - Expected: Full dossier with CRM data, email history, meeting history
      - CR: Should link to Acme Corp company record
      - GD: Drive unavailable → skip Drive documents section, rest works
      - Dependency: P21 Communications data should enrich the dossier

      P21 CRM SYNC HUB:
      - HP: Run /crm:sync for recent emails and meetings
      - Expected: Communications logged, contacts matched, activities summarized
      - TC: Writes to Communications DB (no Type column needed — single plugin)
      - CR: Email/meeting participants matched to CRM contacts
      - ID: Re-sync same period → update existing communications, no duplicates

      P22 MULTI-TOOL MORNING SYNC:
      - HP: Run /morning:sync
      - Expected: Combined email + calendar + task overview
      - TC: Type="Morning Sync" in Briefings DB
      - GD: If any MCP unavailable → skip that section, still produce sync

      P23 KNOWLEDGE BASE QA:
      - HP: Run /kb:ask with a question
      - Expected: Answer synthesized from Knowledge Base DB entries
      - TC: Type="Query" in Knowledge Base DB (logs the question)
      - EC: Question with no matching sources → "no relevant sources found"

      P24 LINKEDIN POST GENERATOR:
      - HP: Run /linkedin:draft with topic
      - Expected: Formatted LinkedIn post draft
      - TC: Type="LinkedIn Post" in Content DB
      - EC: Very short topic, very long topic

  validator:
    role: "Database Validation Agent"
    instructions: |
      Validate Pillar 3 database writes:
      - Communications DB: Records from P21 CRM sync
      - Briefings DB: Type="Morning Sync" from P22
      - Knowledge Base DB: Type="Query" from P23
      - Content DB: Type="LinkedIn Post" from P24
      - Companies DB: Dossier properties from P20 (if applicable)

      CROSS-PILLAR CHECK:
      - Briefings DB now has entries from P02 (Pillar 1) AND P22 (Pillar 3)
      - Verify no Type conflicts between Pillar 1 and Pillar 3 entries

  reporter:
    role: "Test Results Reporter Agent"
    instructions: |
      Same as previous reporters but with Pillar="Pillar 3: MCP & Integrations".
      Flag P18 and P19 as "Skip" (not "Fail") since their required MCPs are unavailable.
```

**Step 2: Commit**

```bash
git add uat-testing/swarms/pillar-3-integrations.yaml
git commit -m "feat(uat): add Pillar 3 MCP & Integrations swarm configuration"
```

---

### Task 14: Create Pillar 4 swarm configuration

**Files:**
- Create: `uat-testing/swarms/pillar-4-meta-growth.yaml`

**Step 1: Write Pillar 4 swarm YAML**

Write `uat-testing/swarms/pillar-4-meta-growth.yaml`:
```yaml
# Pillar 4: Meta & Growth — Plugins P25-P30
# Gate: ≥90% pass rate to proceed to Cross-Plugin Chains

name: pillar-4-meta-growth
description: "UAT testing for Pillar 4: Meta & Growth plugins (P25-P30)"
topology: hierarchical
maxAgents: 8
strategy: centralized

gate:
  pass_threshold: 0.90
  critical_failures_allowed: 0
  next_swarm: cross-plugin-chains

# Execution order:
# P26,P29,P30 (parallel) → P25 (needs Finance data) → P27,P28 (parallel)
execution_order:
  - phase: 1
    parallel: true
    plugins: [P26, P29, P30]
    reason: "Prompt Library, Learning Log, Goal Tracker are independent"

  - phase: 2
    parallel: false
    plugins: [P25]
    reason: "Time Savings Calculator reads Finance DB data from P11"

  - phase: 3
    parallel: true
    plugins: [P27, P28]
    reason: "Workflow Automator and Documenter are independent"

agents:
  coordinator:
    role: "Pillar 4 Test Coordinator"
    instructions: |
      Pillar 4 focuses on meta tools and growth tracking.
      Most plugins here are Notion-primary with simple read/write patterns.
      P25 is the most complex — it reads cross-pillar Finance data.

  data-prep:
    role: "Test Data Preparation Agent"
    instructions: |
      Verify Growth & Meta seed data:
      - Goals DB has seed entries (from base 224 records)
      - Milestones DB linked to Goals
      - Learnings DB has entries
      - Workflows DB has entries
      - Finance DB has invoice/expense records (from P11 Pillar 2 testing)

  plugin-tester:
    role: "Plugin Test Executor"
    instructions: |
      P25 TIME SAVINGS CALCULATOR:
      - HP: Run /savings:calculate for a time period
      - Expected: ROI report with time saved per plugin, cost analysis
      - TC: Type="ROI Report" in Reports DB
      - Dependency: Reads Finance DB data populated by P11

      P26 TEAM PROMPT LIBRARY:
      - HP: Run /prompts:search, /prompts:save
      - Expected: Prompt stored/retrieved from Prompts DB
      - TC: Writes to Prompts DB (single plugin, no Type column needed)
      - ID: Save same prompt twice → update, not duplicate

      P27 WORKFLOW AUTOMATOR:
      - HP: Run /workflow:create, /workflow:run
      - Expected: Workflow definition created, execution logged
      - TC: Type="Execution" in Workflows DB
      - EC: Workflow with invalid step → clear error

      P28 WORKFLOW DOCUMENTER:
      - HP: Run /workflow:document for an existing workflow
      - Expected: SOP document generated
      - TC: Type="SOP" in Workflows DB
      - Note: Same DB as P27 but different Type values

      P29 LEARNING LOG TRACKER:
      - HP: Run /learning:capture with a learning insight
      - Expected: Learning entry created with tags, source
      - TC: Writes to Learnings DB
      - Also check Weekly Insights DB for aggregation

      P30 GOAL PROGRESS TRACKER:
      - HP: Run /goal:update, /goal:report
      - Expected: Goal progress updated, milestones tracked
      - TC: Writes to Goals DB, linked Milestones DB
      - CR: Goals linked to relevant projects/companies where applicable

  validator:
    role: "Database Validation Agent"
    instructions: |
      Validate Pillar 4 database writes:
      - Reports DB: Type="ROI Report" from P25 (coexists with P09, P16 entries)
      - Prompts DB: P26 entries
      - Workflows DB: Type="Execution" (P27) and Type="SOP" (P28)
      - Learnings DB: P29 entries
      - Weekly Insights DB: P29 aggregations
      - Goals DB + Milestones DB: P30 entries with relations

      CROSS-PILLAR CHECK:
      - Reports DB now has entries from P09 (Pillar 2), P16 (Pillar 2), P25 (Pillar 4)
      - Verify all 3 Type values coexist correctly

  reporter:
    role: "Test Results Reporter Agent"
    instructions: |
      Same as previous reporters but with Pillar="Pillar 4: Meta & Growth".
```

**Step 2: Commit**

```bash
git add uat-testing/swarms/pillar-4-meta-growth.yaml
git commit -m "feat(uat): add Pillar 4 Meta & Growth swarm configuration"
```

---

### Task 15: Create Cross-Plugin Chains swarm configuration

**Files:**
- Create: `uat-testing/swarms/cross-plugin-chains.yaml`

**Step 1: Write cross-plugin chains swarm YAML**

Write `uat-testing/swarms/cross-plugin-chains.yaml`:
```yaml
# Cross-Plugin Chain Tests — 6 integration chains
# Gate: ALL chains must pass to proceed to Stress Testing

name: cross-plugin-chains
description: "End-to-end testing of 6 cross-plugin workflows"
topology: hierarchical
maxAgents: 8
strategy: centralized

gate:
  pass_threshold: 1.00
  critical_failures_allowed: 0
  next_swarm: stress-test

# Each chain runs sequentially (they test data flow between plugins)
execution_order:
  - phase: 1
    parallel: false
    chains:
      - name: "email-to-followup"
        plugins: [P01, P06]
      - name: "invoice-to-roi"
        plugins: [P11, P16, P25]

  - phase: 2
    parallel: false
    chains:
      - name: "meeting-lifecycle"
        plugins: [P03, P07]
      - name: "crm-ecosystem"
        plugins: [P21, P20, P10]

  - phase: 3
    parallel: false
    chains:
      - name: "proposal-to-sow"
        plugins: [P12, P14]
      - name: "briefing-consolidation"
        plugins: [P02, P05, P19, P22]

agents:
  coordinator:
    role: "Cross-Plugin Chain Test Coordinator"
    instructions: |
      You test end-to-end data flow across plugin boundaries.
      Each chain must pass completely — partial passes are failures.

      CRITICAL: These tests verify that data written by one plugin
      is correctly read and used by downstream plugins.

  plugin-tester:
    role: "Chain Test Executor"
    instructions: |
      CHAIN 1: EMAIL → FOLLOW-UP (P01 → P06)
      Test scenario:
      1. Run P01 /inbox:triage on test emails
      2. Verify Email Tasks created in Tasks DB (Type="Email Task")
      3. Run P06 /followup:scan
      4. Verify P06 finds unanswered threads from P01's processing
      5. Verify Follow-Up tasks created (Type="Follow-Up")
      6. Verify Tasks DB has BOTH Type="Email Task" AND Type="Follow-Up" — no conflicts
      Pass criteria: P06 correctly identifies follow-ups from P01's email processing

      CHAIN 2: INVOICE → EXPENSE → ROI (P11 → P16 → P25)
      Test scenario:
      1. Run P11 /invoice:process with test invoices
      2. Verify invoices in Finance DB (Type="Invoice")
      3. Run P16 /expense:report for the period
      4. Verify expense report reads P11's invoices correctly
      5. Verify Type="Expense Report" in Reports DB
      6. Run P25 /savings:calculate
      7. Verify ROI report includes Finance DB data
      8. Verify Type="ROI Report" in Reports DB (coexists with Expense Report)
      Pass criteria: Data flows cleanly through the Finance pipeline

      CHAIN 3: MEETING LIFECYCLE (P03 + P07)
      Test scenario:
      1. Run P03 /meeting:prep for an upcoming meeting
      2. Verify prep notes written to Meetings DB
      3. Run P07 /meeting:analyze with a transcript for the same meeting
      4. Verify P07 writes analysis to SAME meeting record (Event ID match)
      5. Verify P07 did NOT overwrite P03's prep notes
      6. Verify both prep and analysis data coexist on the record
      Pass criteria: Shared Meetings DB record with no data loss

      CHAIN 4: CRM ECOSYSTEM (P21 → P20 → P10)
      Test scenario:
      1. Run P21 /crm:sync for recent communications
      2. Verify Communications DB populated
      3. Run P20 /client:load for "Acme Corp"
      4. Verify P20 dossier includes P21's communication data
      5. Run P10 /client:health-scan for "Acme Corp"
      6. Verify P10 health score incorporates communication recency from P21
      7. Verify Companies DB has health properties AND dossier properties
      Pass criteria: CRM data enriches through the ecosystem

      CHAIN 5: PROPOSAL → SOW (P12 → P14)
      Test scenario:
      1. Run P12 /proposal:create for a client
      2. Verify proposal in Deliverables DB (Type="Proposal")
      3. Run P14 /sow:generate referencing the proposal
      4. Verify SOW in Deliverables DB (Type="SOW")
      5. Verify SOW content reflects proposal scope
      Pass criteria: SOW generation leverages proposal data

      CHAIN 6: BRIEFING CONSOLIDATION (P02 + P05 + P19 + P22)
      Test scenario:
      1. Run P02 /daily:briefing → Type="Daily Briefing"
      2. Run P05 /weekly:review → Type="Weekly Review"
      3. Run P22 /morning:sync → Type="Morning Sync"
      4. (P19 skipped — Slack unavailable)
      5. Query Briefings DB — verify 3 different Type values coexist
      6. Verify no cross-contamination (each entry has correct Type)
      7. Verify each can be filtered independently by Type
      Pass criteria: 3+ briefing types in one DB, clean separation

  validator:
    role: "Chain Validation Agent"
    instructions: |
      For each chain, verify:
      1. Data written by upstream plugin is readable by downstream plugin
      2. No data corruption at handoff points
      3. Type columns remain correct through the chain
      4. Company relations are consistent across plugins
      5. No orphaned or broken relation links

  reporter:
    role: "Chain Results Reporter"
    instructions: |
      Report with Pillar="Cross-Plugin Chains".
      Each chain is reported as a single test with sub-results.
      ALL chains must pass — any chain failure is a launch blocker.
```

**Step 2: Commit**

```bash
git add uat-testing/swarms/cross-plugin-chains.yaml
git commit -m "feat(uat): add cross-plugin chain test swarm configuration"
```

---

### Task 16: Create Stress Test swarm configuration

**Files:**
- Create: `uat-testing/swarms/stress-test.yaml`

**Step 1: Write stress test swarm YAML**

Write `uat-testing/swarms/stress-test.yaml`:
```yaml
# Stress Test — Volume and edge case testing
# Final gate before launch readiness

name: stress-test
description: "Volume stress tests and edge case validation across all plugins"
topology: hierarchical
maxAgents: 12
strategy: centralized

gate:
  pass_threshold: 0.90
  critical_failures_allowed: 0
  next_swarm: null  # Final phase

execution_order:
  - phase: 1
    parallel: true
    scenarios: [inbox-flood, meeting-marathon, invoice-batch]
    reason: "Independent volume tests"

  - phase: 2
    parallel: true
    scenarios: [client-overload, briefing-storm]
    reason: "Multi-plugin volume tests"

  - phase: 3
    parallel: false
    scenarios: [chain-cascade]
    reason: "Full ecosystem stress test"

  - phase: 4
    parallel: true
    scenarios: [edge-case-sweep]
    reason: "Edge cases across all plugins"

agents:
  coordinator:
    role: "Stress Test Coordinator"
    instructions: |
      You run volume and edge case stress tests.
      Monitor for: timeouts, memory issues, rate limiting, data corruption.
      Any crash or data corruption is a critical failure.

  data-prep:
    role: "Stress Test Data Preparation Agent"
    instructions: |
      Generate high-volume test data:

      INBOX FLOOD (200 emails):
      - Generate 200 email fixtures by templating from existing action-required fixtures
      - Vary: sender, subject, body content, priority level
      - Include: 50 action-required, 50 FYI, 30 newsletter, 20 VIP, 30 spam-like, 20 edge cases
      - Send all to Gmail test account

      MEETING MARATHON (15 meetings):
      - Create 15 calendar events for a single day
      - Mix: 8 client meetings (various companies), 4 internal, 3 group
      - Include overlapping time slots

      INVOICE BATCH (50 invoices):
      - Generate 50 invoice JSON fixtures from templates
      - Vary: amounts ($500-$50,000), clients (all 8 companies), date ranges
      - Include: 5 malformed, 3 duplicate invoice numbers

      CLIENT OVERLOAD (20 companies):
      - Seed 12 additional company records in Companies DB
      - Each with 2-3 contacts, 1-2 deals, 3-5 communications
      - Total: 20 companies for health scanning

      BRIEFING STORM:
      - No additional data needed — runs all 4 briefing plugins simultaneously

      CHAIN CASCADE (10 clients):
      - Ensure all 8 base companies + 2 new have full CRM data

  plugin-tester:
    role: "Stress Test Executor"
    instructions: |
      SCENARIO 1: INBOX FLOOD
      - Send 200 emails to test account
      - Run P01 /inbox:triage
      - Success: Completes without timeout (< 5 minutes)
      - Success: All 200 categorized correctly (spot-check 20%)
      - Success: No duplicate Email Tasks in Tasks DB
      - Measure: Processing time, emails/second

      SCENARIO 2: MEETING MARATHON
      - Create 15 meetings for tomorrow
      - Run P03 /meeting:prep for each
      - Success: All 15 prepped without errors
      - Success: No duplicate Meetings DB entries
      - Success: Overlapping meetings handled gracefully
      - Measure: Prep time per meeting

      SCENARIO 3: INVOICE BATCH
      - Process 50 invoices through P11
      - Success: All 50 processed (47 valid + 3 duplicates detected)
      - Success: Malformed invoices produce clear errors, not crashes
      - Success: Finance DB has exactly 47 unique Invoice records
      - Measure: Processing time, invoices/minute

      SCENARIO 4: CLIENT OVERLOAD
      - Run P10 /client:health-scan with --all flag (20 companies)
      - Success: All 20 scored without errors
      - Success: Scores within expected ranges
      - Success: No relation errors or broken links
      - Measure: Scan time, clients/minute

      SCENARIO 5: BRIEFING STORM
      - Run P02, P05, P22 simultaneously (P19 skipped)
      - Success: All 3 complete without errors
      - Success: Briefings DB has 3 new entries with distinct Types
      - Success: No write conflicts or race conditions
      - Measure: Total time for all 3

      SCENARIO 6: CHAIN CASCADE
      - Run full P21→P20→P10 chain for 10 clients sequentially
      - Success: All 10 clients have Communications, Dossiers, Health Scores
      - Success: Data consistency across all 3 plugins
      - Success: No cumulative errors (error rate doesn't increase with volume)
      - Measure: End-to-end time per client

      SCENARIO 7: EDGE CASE SWEEP
      - Run each of the 30 plugins with edge case fixtures:
        * Empty input → meaningful error, no crash
        * Unicode-heavy input → processes correctly
        * Very long input (5MB+) → handles or graceful size limit error
        * Malformed JSON → parse error, not crash
      - Success: Zero crashes across all 30 plugins
      - Success: All errors are user-friendly messages

  validator:
    role: "Stress Validation Agent"
    instructions: |
      Focus on data integrity under load:
      1. Record count verification (no duplicates created under volume)
      2. Type column consistency (no corruption under concurrent writes)
      3. Relation integrity (no broken links after bulk operations)
      4. Performance metrics within acceptable bounds

  reporter:
    role: "Stress Test Reporter"
    instructions: |
      Report with Pillar="Stress Test".
      Include performance metrics:
      - Processing time per scenario
      - Throughput (items/minute)
      - Error rate
      - Resource usage observations
      Mark any scenario that times out (>10 minutes) as Error.
```

**Step 2: Commit**

```bash
git add uat-testing/swarms/stress-test.yaml
git commit -m "feat(uat): add stress test swarm configuration"
```

---

## Phase 4: Test Runner Commands

### Task 17: Create UAT slash commands

**Files:**
- Create: `uat-testing/commands/run-pillar.md`
- Create: `uat-testing/commands/run-all.md`
- Create: `uat-testing/commands/report.md`
- Create: `uat-testing/commands/reset.md`

**Step 1: Write /uat:run-pillar command**

Write `uat-testing/commands/run-pillar.md`:
```markdown
---
name: run-pillar
description: Run UAT tests for a specific pillar (1-4), cross-plugin chains, or stress tests
usage: /uat:run-pillar <pillar>
arguments:
  pillar: "1, 2, 3, 4, chains, or stress"
---

# Run Pillar UAT Tests

Execute the UAT test swarm for the specified pillar.

## Steps

1. Run `scripts/validate-environment.sh` to verify pre-flight checks pass
2. Initialize claude-flow swarm using the pillar's YAML configuration:
   - Pillar 1: `swarms/pillar-1-daily-work.yaml`
   - Pillar 2: `swarms/pillar-2-code-without-coding.yaml`
   - Pillar 3: `swarms/pillar-3-integrations.yaml`
   - Pillar 4: `swarms/pillar-4-meta-growth.yaml`
   - chains: `swarms/cross-plugin-chains.yaml`
   - stress: `swarms/stress-test.yaml`
3. Spawn agents as defined in the YAML: coordinator, data-prep, plugin-tester, validator, reporter
4. Execute the swarm following the execution_order phases
5. Check gate criteria after completion
6. Output summary with pass/fail counts and gate decision

## Swarm Initialization

```
mcp__claude-flow__swarm_init hierarchical --maxAgents=10 --strategy=centralized
```

Then spawn each agent type:
```
mcp__claude-flow__agent_spawn data-prep --capabilities="notion,gmail,calendar,filesystem"
mcp__claude-flow__agent_spawn plugin-tester --capabilities="notion,gmail,calendar,filesystem"
mcp__claude-flow__agent_spawn validator --capabilities="notion"
mcp__claude-flow__agent_spawn reporter --capabilities="notion,filesystem"
```

## Gate Check

After all tests complete:
- Calculate: passed / (passed + failed) = pass_rate
- If pass_rate >= gate threshold: "✓ GATE PASSED — Ready for next phase"
- If pass_rate < gate threshold: "✗ GATE FAILED — Fix {N} failures before proceeding"
- List all failures with Test IDs for debugging
```

**Step 2: Write /uat:run-all command**

Write `uat-testing/commands/run-all.md`:
```markdown
---
name: run-all
description: Run complete UAT test suite — all pillars sequentially with gates
usage: /uat:run-all
---

# Run Full UAT Suite

Execute all 6 test phases sequentially with go/no-go gates between each.

## Execution Order

1. Pillar 1: Daily Work (P01-P08) — Gate: ≥90%
2. Pillar 2: Code Without Coding (P09-P16) — Gate: ≥90%
3. Pillar 3: MCP & Integrations (P17-P24) — Gate: ≥90%
4. Pillar 4: Meta & Growth (P25-P30) — Gate: ≥90%
5. Cross-Plugin Chains (6 chains) — Gate: 100%
6. Stress Test (volume + edge cases) — Gate: ≥90%

## Protocol

For each phase:
1. Run `/uat:run-pillar <phase>`
2. Check gate result
3. If PASS → proceed to next phase
4. If FAIL → stop, output failure report, recommend fixes

## Final Output

After all 6 phases (or on gate failure):
- Overall pass rate across all phases
- Launch readiness assessment: READY / NOT READY
- List of blocking issues (if any)
- Link to [FOS] Test Results Notion database
```

**Step 3: Write /uat:report command**

Write `uat-testing/commands/report.md`:
```markdown
---
name: report
description: Generate a test results summary from the latest run
usage: /uat:report [--run-id <id>]
---

# UAT Test Report

Query [FOS] Test Results database and generate a summary.

## Steps

1. Search for "[FOS] Test Results" in Notion
2. Query all records for the specified Run ID (or latest run if not specified)
3. Aggregate by Pillar and Status:
   - Per-pillar pass rates
   - Overall pass rate
   - List of all failures with details
4. Output formatted report

## Report Format

```
=== Founder OS UAT Test Report ===
Run ID: {run_id}
Date: {date}

Pillar 1: Daily Work         32/35 passed (91.4%) ✓
Pillar 2: Code Without Coding 30/35 passed (85.7%) ✗
Pillar 3: MCP & Integrations  28/30 passed (93.3%) ✓
Pillar 4: Meta & Growth       20/21 passed (95.2%) ✓
Cross-Plugin Chains            5/6  passed (83.3%) ✗
Stress Test                    6/7  passed (85.7%) ✗

Overall: 121/134 passed (90.3%)
Launch Readiness: NOT READY (3 gates failed)

Failures:
- P11-ID-001: Invoice idempotency — duplicate created on re-run
- P14-HP-001: SOW Generator — timeout on competing hypotheses
...
```
```

**Step 4: Write /uat:reset command**

Write `uat-testing/commands/reset.md`:
```markdown
---
name: reset
description: Reset test environment to clean state for a fresh test run
usage: /uat:reset [--full]
---

# Reset UAT Environment

Restore the test environment to a known clean state.

## Default Reset (test-generated data only)

1. Run `scripts/reset-notion-test-data.sh` to archive UAT-generated Notion records
2. Clear `results/` directory of previous run data
3. Re-verify base seed data (224 records intact)

## Full Reset (--full flag)

1. Default reset steps above
2. Run `scripts/seed-test-emails.sh` to re-seed Gmail test account
3. Run `scripts/seed-calendar-events.sh` to re-create calendar events
4. Run `scripts/validate-environment.sh` to confirm clean state

## Output

- Record counts per database after reset
- Confirmation that base seed data is intact
- Environment validation result
```

**Step 5: Commit**

```bash
git add uat-testing/commands/
git commit -m "feat(uat): add UAT slash commands (run-pillar, run-all, report, reset)"
```

---

## Phase 5: Final Integration & Verification

### Task 18: Create the [FOS] Test Results Notion database

**Files:**
- Reference: `uat-testing/fixtures/notion-test-results-db-template.json`

**Step 1: Create the database via Notion MCP**

Using Notion MCP, create the `[FOS] Test Results` database in the Founder OS HQ workspace:
- Use the schema from `notion-test-results-db-template.json`
- Set up the 3 views: All Results, Failures Only, By Pillar
- Link the Company relation to Founder OS HQ - Companies

**Step 2: Verify the database**

Query the database to confirm:
- All properties created correctly
- Select options populated
- Views configured
- Company relation linked

**Step 3: Record the database ID**

Save the database ID for reference:
```bash
echo "TEST_RESULTS_DB_ID=<notion-db-id>" >> uat-testing/.env.local
```

---

### Task 19: Run environment validation

**Step 1: Run install script**

```bash
cd uat-testing && bash scripts/install-plugins.sh
```

Expected: "Installed 30/30 plugins"

**Step 2: Run validation**

```bash
bash scripts/validate-environment.sh
```

Expected: All checks pass (or document known warnings for skipped MCPs)

**Step 3: Fix any failures**

Address any validation failures before proceeding.

**Step 4: Commit any fixes**

```bash
git add -A uat-testing/
git commit -m "feat(uat): complete environment setup and validation"
```

---

### Task 20: Dry run — Execute Pillar 1 swarm

**Step 1: Initialize the swarm**

```bash
# From uat-testing/ directory
# Initialize claude-flow swarm with Pillar 1 config
```

Use claude-flow MCP tools:
```
mcp__claude-flow__swarm_init hierarchical --maxAgents=10 --strategy=centralized
```

**Step 2: Run data prep agent**

Spawn data-prep agent and verify:
- Base records exist (224 in HQ)
- Gmail seeded (50 test emails)
- Calendar seeded (11 test events)

**Step 3: Run first plugin test (P04 — simplest)**

Test P04 Action Items as a sanity check:
- Run happy path
- Verify DB write
- Check Type column
- Run idempotency test

**Step 4: Review results**

Check:
- Test results written to [FOS] Test Results DB
- Local JSON written to results/
- Pass/fail correctly recorded

**Step 5: Fix any issues discovered in dry run**

**Step 6: Commit**

```bash
git add uat-testing/results/
git commit -m "feat(uat): complete Pillar 1 dry run validation"
```

---

### Task 21: Document and push

**Step 1: Update the design doc with any changes from implementation**

Review `docs/plans/2026-03-08-uat-testing-plan-design.md` and update if implementation deviated.

**Step 2: Final commit and push**

```bash
git add -A
git commit -m "feat(uat): complete UAT testing infrastructure for launch readiness"
git push
```

---

## Quick Reference: Running the Full Suite

After all setup is complete, running the full UAT suite is:

```bash
cd uat-testing
/uat:reset --full          # Clean state
/uat:run-all               # All 6 phases with gates
/uat:report                # Summary report
```

Or run individual pillars:
```bash
/uat:run-pillar 1          # Just Pillar 1
/uat:run-pillar chains     # Just cross-plugin chains
/uat:run-pillar stress     # Just stress tests
```
