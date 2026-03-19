# Workflow Doc

> Turn any process description into a structured SOP with a Mermaid flowchart -- in a single command.

## Overview

The Workflow Doc namespace bridges the gap between "how we do things" in your head and a documented, shareable standard operating procedure on paper. Describe a workflow in plain language -- or point it at an existing file -- and it produces a complete 7-section SOP document with roles, decision points, handoff annotations, and an embedded Mermaid flowchart.

This is particularly valuable when onboarding new team members, preparing for audits, or simply externalizing tribal knowledge before it walks out the door. The lighter-weight `diagram` command generates just the visual flowchart when you need a quick reference without the full SOP.

Both outputs can be saved locally as markdown files and/or logged to the Notion Workflows database for centralized access.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Optional | Saves SOPs to the Workflows database |
| Filesystem MCP | Optional | Writes SOP files to disk |

## Commands

### `/founder-os:workflow-doc:document`

**What it does** -- Takes a workflow description (typed inline or loaded from a file) and produces a complete 7-section SOP document with YAML frontmatter, a Mermaid flowchart, and metadata logged to Notion. The process runs in four phases: input loading, document generation, file output, and Notion integration.

**Usage:**

```
/founder-os:workflow-doc:document "[description]" [--file=PATH] [--format=notion|file|both] [--output=PATH]
```

**Example scenario:**

> Your client onboarding process has been living in your head: sales hands off a signed contract, ops creates the account, CS sends a welcome email, and the account manager schedules a kickoff call. You describe this in one sentence and get back a 7-section SOP with roles, decision criteria, a flowchart, and an estimated complexity rating of "Moderate".

**What you get back:**

- Extraction summary: steps identified, decision points, handoffs, tools, complexity tier
- Full 7-section SOP document following the template
- Mermaid flowchart with action nodes, decision diamonds, and handoff labels
- File saved locally and/or page created in Notion

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--file=PATH` | -- | Load workflow description from a file |
| `--format` | `both` | `notion`, `file`, or `both` |
| `--output=PATH` | Auto-generated | Custom file path for the SOP |

---

### `/founder-os:workflow-doc:diagram`

**What it does** -- Generates a quick Mermaid flowchart from a workflow description or the name of an existing documented SOP. This is the lightweight companion to `document` -- it produces just the visual diagram without the full SOP pipeline. Output is chat-only by default.

**Usage:**

```
/founder-os:workflow-doc:diagram "[description-or-workflow-name]" [--output=PATH]
```

**Example scenario:**

> You're in a meeting and someone asks "what does our invoice approval process look like?" You type the process steps in one line and instantly get a Mermaid flowchart showing the sequence from submission through manager approval to finance processing, with decision branches for amounts over $5,000.

**What you get back:**

- Mermaid flowchart in a code block (top-down orientation)
- Complexity summary: steps, decisions, handoffs, and tier
- Optional file save with YAML frontmatter

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--output=PATH` | Chat only | Save diagram to a markdown file |

---

## Tips & Patterns

- **Document first, automate second.** Use `document` to formalize a process as an SOP, then use the [Workflow](/commands/workflow) namespace to automate it. Documentation makes automation requirements clearer.
- **Start with diagram for quick visuals.** When you just need a flowchart for a meeting or Slack thread, `diagram` is instant and doesn't write to Notion.
- **Complexity tiers guide your effort.** The complexity rating (Simple through Very Complex) tells you how much governance and documentation a workflow actually needs. Simple processes don't need 7-section SOPs -- but Complex ones definitely do.
- **Feed it files for accuracy.** If you have existing process notes in a markdown file, use `--file=PATH` instead of typing inline. Longer, more detailed descriptions produce better SOPs.

## Related Namespaces

- **[Workflow](/commands/workflow)** -- Create executable YAML workflows from the processes you document
- **[Goal](/commands/goal)** -- Track process improvement goals alongside your documented SOPs
- **[Learn](/commands/learn)** -- Log insights about process improvements as you discover them
