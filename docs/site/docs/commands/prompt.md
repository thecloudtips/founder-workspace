# Prompt Library

> Store, optimize, and reuse your best prompts across every workflow -- with built-in quality scoring.

## Overview

The Prompt Library is a shared Notion database where you save the prompts that work. Every prompt gets auto-tagged with variables, scored on five quality dimensions, and tracked for usage. When you retrieve a prompt, variables like `{{client_name}}` are filled in interactively, so the output is ready to paste into any AI tool.

The quality scoring system catches vague language, missing context, and common anti-patterns before they cost you a bad output. When a prompt scores below threshold, the optimizer rewrites it using targeted strategies -- adding audience context, specifying output format, or replacing vague modifiers with measurable criteria.

Six predefined categories (Email Templates, Meeting Prompts, Analysis Prompts, Content Creation, Code Assistance, Research Prompts) get you organized fast, but custom categories are accepted too. Visibility controls let you keep prompts personal or share them with your team.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| Notion CLI | Yes | Stores and retrieves prompts from the Prompts database |

## Commands

### `/founder-os:prompt:add`

**What it does** -- Adds a new prompt to your library with automatic variable detection (finds all `{{placeholder}}` patterns), category inference, and a quality check before saving. If the prompt scores below threshold, you'll see specific improvement suggestions and can choose to save as-is, edit, or cancel.

**Usage:**

```
/founder-os:prompt:add "[name]" "[content]" [--category=CAT] [--variables=a,b]
```

**Example scenario:**

> You just crafted a great outreach email template and want to save it for reuse. You run the add command with the prompt text, it auto-detects `{{client_name}}`, `{{company_name}}`, and `{{industry}}` as variables, scores it 19/25 (Good), and saves it to your library under Email Templates.

**What you get back:**

- Quality score with per-dimension breakdown (Task Clarity, Context, Format, Constraints, Examples)
- Auto-detected variables list
- Category assignment (auto-detected or user-specified)
- Confirmation with retrieval and optimization commands

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--category=CAT` | Auto-detected | One of 6 predefined categories or a custom value |
| `--variables=a,b` | Auto-detected | Override the variable list manually |

---

### `/founder-os:prompt:get`

**What it does** -- Retrieves a prompt by name, walks you through filling in each `{{variable}}` placeholder one at a time, and outputs the fully substituted prompt in a code block ready to copy. Usage tracking increments automatically so you can see which prompts your team uses most.

**Usage:**

```
/founder-os:prompt:get "[name]"
```

**Example scenario:**

> You need to send a client introduction email and you saved a template last week. You run `get "Client Intro Email"`, fill in the client name, company, and industry when prompted, and get a ready-to-send email in seconds.

**What you get back:**

- Prompt metadata (category, visibility, usage count)
- Interactive variable collection with format hints
- Fully substituted prompt in a copyable code block
- Usage counter automatically incremented

**Flags:**

None -- this command is intentionally simple.

---

### `/founder-os:prompt:list`

**What it does** -- Browse and search your prompt library, filtered by category, keyword, or both. Results are sorted by usage count (most-used first) so the highest-value prompts surface to the top.

**Usage:**

```
/founder-os:prompt:list [category] [--search=keyword] [--limit=N]
```

**Example scenario:**

> You remember saving some email-related prompts but can't recall the exact names. You run `list --search=email` and get a table showing 4 matching prompts ranked by usage, with their categories and visibility status.

**What you get back:**

- Formatted table with name, category, visibility, and usage count
- Total count versus displayed count
- Active filter summary

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `category` | All | Filter by category name |
| `--search=keyword` | -- | Search names, descriptions, and tags |
| `--limit=N` | `20` | Maximum results to display |

---

### `/founder-os:prompt:optimize`

**What it does** -- Retrieves a saved prompt, scores it on five quality dimensions, identifies anti-patterns (vague verbs, missing audience, unbounded scope), and produces a complete rewritten version. You see the original and improved versions side by side with an explanation of every change.

**Usage:**

```
/founder-os:prompt:optimize "[name]"
```

**Example scenario:**

> Your "Competitor Analysis Brief" prompt has been producing inconsistent results. You run optimize, discover it scored 12/25 (Fair) due to missing output format and unbounded scope. The rewrite adds a structured table format, limits analysis to top 3 strengths and weaknesses, and scores 21/25 (Excellent).

**What you get back:**

- Side-by-side comparison (original vs. improved)
- Per-dimension quality scores with explanations
- Anti-patterns detected with fixes
- Three options: keep original, use improved, or edit further

**Flags:**

None -- just provide the prompt name.

---

### `/founder-os:prompt:share`

**What it does** -- Changes a prompt's visibility from Personal to Shared, making it available to all team members who query the library. A simple one-step operation that keeps your best prompts accessible.

**Usage:**

```
/founder-os:prompt:share "[name]"
```

**Example scenario:**

> You've been using a "Weekly Status Update" prompt that your team keeps asking about. You run share and it flips the visibility to Shared. Now anyone running `prompt:list` or `prompt:get` can find and use it.

**What you get back:**

- Confirmation with previous and new visibility status
- Pointer to list and get commands for team members

**Flags:**

None -- just provide the prompt name.

---

## Tips & Patterns

- **Use `{{variables}}` generously.** Prompts with well-named variables (like `{{client_name}}`, `{{tone}}`, `{{deadline_date}}`) are far more reusable than hardcoded versions.
- **Score before you save.** The quality check during `add` catches issues that would otherwise produce inconsistent AI output. A few minutes fixing a prompt saves hours of fixing outputs.
- **Let usage counts guide you.** The `list` command sorts by usage, so your most valuable prompts naturally rise to the top. If a prompt has zero uses, consider archiving it.
- **Optimize prompts that underperform.** If a prompt keeps needing manual tweaks to its output, run `optimize` on it. The five-dimension scoring often pinpoints exactly what's missing.

## Related Namespaces

- **[Workflow](/commands/workflow)** -- Embed your best prompts into multi-step automated workflows
- **[Learn](/commands/learn)** -- Log insights about which prompts work best for specific situations
- **[Memory](/commands/memory)** -- Teach the system preferences that apply across all prompts (e.g., "always use formal tone for client emails")
