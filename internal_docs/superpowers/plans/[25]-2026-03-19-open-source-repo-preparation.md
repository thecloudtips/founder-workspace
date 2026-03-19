# Open-Source Repository Preparation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform founder-workspace into a clean, well-documented open-source repository by excluding internal tooling, restructuring docs, and adding standard community files.

**Architecture:** Gitignore-based exclusion of internal directories (.beads, .claude, .claude-flow, .swarm) with `git rm --cached` to untrack 294 files. Docs restructured by renaming current `docs/` to `internal_docs/` (gitignored) and promoting `docs/site/` content to a flattened root `docs/`. New root README, LICENSE, CONTRIBUTING, and GitHub templates added.

**Tech Stack:** Git, Markdown, YAML (GitHub issue templates)

**Spec:** `docs/superpowers/specs/[26]-2026-03-19-open-source-repo-design.md`

**Note on commit strategy:** The spec mentions a single final commit; this plan uses granular per-task commits for better rollback and reviewability. Each task produces an independently revertable commit.

---

## Chunk 1: Gitignore & Internal File Removal

### Task 1: Replace .gitignore with full directory exclusions

**Files:**
- Modify: `.gitignore` (complete replacement)

- [ ] **Step 1: Replace `.gitignore` contents**

Write the new `.gitignore` that replaces all partial rules with full directory exclusions:

```gitignore
# Internal development tooling
.beads/
.claude/
.claude-flow/
.swarm/
.entire/
.worktrees/

# Internal docs (development specs, plans, reports)
internal_docs/

# Dependencies
node_modules/

# OS files
.DS_Store

# Release artifacts (built tarballs, not the dist/ directory itself)
dist/*.tgz

# Claude Code local settings (machine-specific)
.claude/settings.local.json

# Process files (NOT package lockfiles — those should be committed)
*.pid
```

- [ ] **Step 2: Verify .gitignore is correct**

Run: `cat .gitignore`
Expected: New content with full directory exclusions, no partial file rules remaining.

- [ ] **Step 3: Commit .gitignore**

```bash
git add .gitignore
git commit -m "chore: replace .gitignore with full directory exclusions for open-source prep"
```

---

### Task 2: Remove internal directories from git tracking

**Files:**
- Untrack: `.beads/` (19 files), `.claude/` (265 files), `.claude-flow/` (7 files), `.swarm/` (3 files)

- [ ] **Step 1: Remove .beads/ from tracking**

```bash
git rm -r --cached .beads/
```

Expected: `rm '.beads/.gitignore'`, `rm '.beads/.migration-hint-ts'`, etc. (19 files)

- [ ] **Step 2: Remove .claude/ from tracking**

```bash
git rm -r --cached .claude/
```

Expected: ~265 files removed from index. Files remain on disk.

- [ ] **Step 3: Remove .claude-flow/ from tracking**

```bash
git rm -r --cached .claude-flow/
```

Expected: ~7 files removed from index.

- [ ] **Step 4: Remove .swarm/ from tracking**

```bash
git rm -r --cached .swarm/
```

Expected: ~3 files removed from index.

- [ ] **Step 5: Verify files are untracked but still on disk**

```bash
git status | head -20   # should show deleted files (from index only)
ls .beads/ .claude/ .claude-flow/ .swarm/  # should all still exist
```

- [ ] **Step 6: Commit untracking**

```bash
git add -A
git commit -m "chore: remove internal tooling directories from git tracking

Files remain on disk for local development but are excluded from the
public repository via .gitignore."
```

---

## Chunk 2: Docs Restructuring

### Task 3: Rename docs/ to internal_docs/

**Files:**
- Move: `docs/` → `internal_docs/`

- [ ] **Step 0: Preflight check**

```bash
[ -d internal_docs ] && echo "ERROR: internal_docs/ already exists — remove it before proceeding" && exit 1
```

- [ ] **Step 1: Move docs to internal_docs using git mv**

```bash
git mv docs internal_docs
```

Expected: All files under `docs/` moved to `internal_docs/`. Git tracks the rename.

- [ ] **Step 2: Verify the move**

```bash
ls internal_docs/
```

Expected: `agent-specs`, `founder-os-development-timeline.md`, `getting-started`, `INDEX.md`, `plans`, `reference`, `reports`, `site`, `specs`, `superpowers`

- [ ] **Step 3: Commit the rename**

```bash
git add -A
git commit -m "chore: rename docs/ to internal_docs/ for open-source prep

Internal documentation (specs, plans, reports, agent-specs) moves to
internal_docs/ which is gitignored. Public docs will be promoted from
the site/ subdirectory in the next step."
```

---

### Task 4: Create new public docs/ from site content

**Files:**
- Create: `docs/` (new directory)
- Source: `internal_docs/site/docs/*` and `internal_docs/site/landing/`

- [ ] **Step 1: Create new docs directory and flatten site content**

```bash
mkdir -p docs
cp -r internal_docs/site/docs/* docs/
cp -r internal_docs/site/landing docs/landing/
```

- [ ] **Step 2: Verify the new structure**

```bash
ls docs/
```

Expected: `agents`, `commands`, `deep-dives`, `extending`, `index.md`, `installation.md`, `landing`

```bash
ls docs/landing/
```

Expected: `about.md`, `getting-started.md`, `how-it-works.md`, `index.md`, `use-cases.md`

- [ ] **Step 3: Commit the new public docs**

```bash
git add docs/
git commit -m "docs: promote site documentation to root docs/ directory

Flattened docs/site/docs/ and docs/site/landing/ into a single docs/
directory for public-facing documentation."
```

---

### Task 5: Fix internal links in new docs/

**Files:**
- Modify: `docs/index.md` (2 link fixes)
- Modify: `docs/installation.md` (1 link fix)
- Modify: `docs/landing/use-cases.md` (~22 link fixes)
- Modify: `docs/landing/how-it-works.md` (1 link fix)
- Modify: `docs/landing/index.md` (1 link fix)
- Modify: `docs/deep-dives/hooks-system.md` (1 link fix)
- Modify: `docs/deep-dives/dispatcher.md` (1 link fix)

- [ ] **Step 1: Find all broken links**

```bash
grep -rn '\.\./landing/' docs/ --include='*.md'
grep -rn '\.\./docs/' docs/ --include='*.md'
grep -rn '\.\./\.\./landing/' docs/ --include='*.md'
```

- [ ] **Step 2: Fix links from docs/*.md referencing ../landing/**

In `docs/index.md`, replace all occurrences of `../landing/` with `./landing/`:
- `../landing/getting-started.md` → `./landing/getting-started.md` (2 occurrences)

In `docs/installation.md`, replace:
- `../landing/getting-started.md` → `./landing/getting-started.md` (1 occurrence)

- [ ] **Step 3: Fix links from docs/landing/*.md referencing ../docs/**

In `docs/landing/use-cases.md`, replace all occurrences of `../docs/commands.md` with `../commands/index.md`:
- There are ~22 occurrences of `](../docs/commands.md)` → `](../commands/index.md)`

Also fix the final link:
- `../docs/commands.md` → `../commands/index.md`

In `docs/landing/how-it-works.md`, replace:
- `../docs/commands/index.md` → `../commands/index.md`

In `docs/landing/index.md`, replace:
- `../docs/getting-started.md` → `./getting-started.md`

- [ ] **Step 4: Fix links from docs/deep-dives/*.md referencing ../../landing/**

In `docs/deep-dives/hooks-system.md`, replace:
- `../../landing/getting-started.md` → `../landing/getting-started.md`

In `docs/deep-dives/dispatcher.md`, replace:
- `../../landing/getting-started.md` → `../landing/getting-started.md`

- [ ] **Step 5: Verify no broken links remain**

```bash
grep -rn '\.\./landing/' docs/ --include='*.md'   # should only show docs/deep-dives refs (now ../landing/)
grep -rn '\.\./docs/' docs/ --include='*.md'       # should be empty
grep -rn '\.\./\.\./landing/' docs/ --include='*.md'  # should be empty
```

- [ ] **Step 6: Commit link fixes**

```bash
git add docs/
git commit -m "docs: fix internal links after docs restructuring"
```

---

## Chunk 3: CLAUDE.md & Root Files

### Task 6: Preserve and rewrite CLAUDE.md

**Files:**
- Copy: `CLAUDE.md` → `.claude/CLAUDE-internal.md`
- Modify: `CLAUDE.md` (rewrite for public contributors)

- [ ] **Step 1: Copy current CLAUDE.md to .claude/ for preservation**

```bash
cp CLAUDE.md .claude/CLAUDE-internal.md
```

This file is already gitignored (`.claude/` is in `.gitignore`), so it stays local only.

- [ ] **Step 2: Rewrite root CLAUDE.md for public contributors**

Replace the entire content of `CLAUDE.md` with:

```markdown
# Founder OS

AI-powered business automation plugin for Claude Code. Turns Claude Code into a command center for email triage, meeting prep, report generation, CRM sync, and 30+ other founder workflows.

## Repository Structure

```
founder-workspace/
  ├── development/         # Source code
  │   ├── commands/        # Slash commands (/founder-os:<namespace>:<action>)
  │   ├── skills/          # Domain knowledge per namespace
  │   ├── agents/          # Agent team definitions
  │   ├── scripts/         # Build and utility scripts
  │   ├── _infrastructure/ # Infrastructure helpers (preflight, hooks, etc.)
  │   └── install.sh       # Plugin installer
  ├── dist/                # Distribution package (npm)
  └── docs/                # Public documentation
      ├── commands/        # Command reference (35 namespaces)
      ├── agents/          # Agent team documentation
      ├── deep-dives/      # Architecture internals
      ├── extending/       # Customization guides
      └── landing/         # Product landing page content
```

## Adding a New Command

Commands live in `development/commands/<namespace>/<action>.md`. Each command is a markdown file that Claude Code loads as a slash command.

1. Create the command file: `development/commands/<namespace>/<action>.md`
2. Add the corresponding skill (if needed): `development/skills/<namespace>/<skill-name>/SKILL.md`
3. Register any new dependencies in `development/_infrastructure/preflight/dependency-registry.json`

## Adding a New Skill

Skills live in `development/skills/<namespace>/<skill-name>/SKILL.md`. Skills provide domain knowledge that commands reference.

## Adding a New Agent Team

Agent teams live in `development/agents/<namespace>/`. Each team has a `config.json` and one or more agent markdown files.

## Build & Test

```bash
# Run distribution tests
cd dist && npm test

# Package for release
cd dist && npm pack
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, PR process, and coding standards.
```

- [ ] **Step 3: Commit CLAUDE.md changes**

```bash
git add CLAUDE.md
git commit -m "docs: rewrite CLAUDE.md for public contributors

Internal version preserved at .claude/CLAUDE-internal.md (gitignored).
New version focuses on repo structure and contribution workflow."
```

---

### Task 7: Create root LICENSE

**Files:**
- Create: `LICENSE`

- [ ] **Step 1: Create LICENSE at root**

```
MIT License

Copyright (c) 2026 NaluForge / Founder OS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Commit LICENSE**

```bash
git add LICENSE
git commit -m "chore: add MIT LICENSE to repository root"
```

---

### Task 8: Create CONTRIBUTING.md

**Files:**
- Create: `CONTRIBUTING.md`

- [ ] **Step 1: Write CONTRIBUTING.md**

```markdown
# Contributing to Founder OS

Thank you for your interest in contributing to Founder OS! This guide will help you get started.

## Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/thecloudtips/founder-workspace.git
   cd founder-workspace
   ```

2. **Install Claude Code** if you haven't already — Founder OS is a Claude Code plugin.

3. **Install the plugin locally:**

   ```bash
   cd development
   ./install.sh
   ```

4. **Verify the installation:**

   ```bash
   /founder-os:setup:verify
   ```

## How to Contribute

### Reporting Bugs

- Use the [Bug Report](https://github.com/thecloudtips/founder-workspace/issues/new?template=bug_report.yml) issue template
- Include your environment details (OS, Node version, Claude Code version)
- Include steps to reproduce the issue

### Suggesting Features

- Use the [Feature Request](https://github.com/thecloudtips/founder-workspace/issues/new?template=feature_request.yml) issue template
- Describe the problem you're trying to solve
- Explain your proposed solution

### Submitting Changes

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes following the existing code patterns
4. Test your changes
5. Commit with a descriptive message: `git commit -m "feat: add my feature"`
6. Push to your fork: `git push origin feat/my-feature`
7. Open a Pull Request

### PR Requirements

- Clear description of what changed and why
- Reference any related issues
- No breaking changes without discussion first
- Follow existing code style and patterns

## Code Style

- Follow the patterns established in existing commands, skills, and agents
- Commands go in `development/commands/<namespace>/<action>.md`
- Skills go in `development/skills/<namespace>/<skill-name>/SKILL.md`
- Agents go in `development/agents/<namespace>/`

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## Questions?

- Visit [fos.naluforge.com](https://fos.naluforge.com) for product documentation
- Read the [docs/](docs/) for technical documentation
- Open a [Discussion](https://github.com/thecloudtips/founder-workspace/discussions) for questions
```

- [ ] **Step 2: Commit CONTRIBUTING.md**

```bash
git add CONTRIBUTING.md
git commit -m "docs: add CONTRIBUTING.md with development setup and PR workflow"
```

---

### Task 9: Create CODE_OF_CONDUCT.md

**Files:**
- Create: `CODE_OF_CONDUCT.md`

- [ ] **Step 1: Write CODE_OF_CONDUCT.md**

Use the Contributor Covenant v2.1 text. The full text is the standard used by most major open-source projects.

Source URL: https://www.contributor-covenant.org/version/2/1/code_of_conduct/

Key sections: Our Pledge, Our Standards, Enforcement Responsibilities, Scope, Enforcement, Enforcement Guidelines (Correction, Warning, Temporary Ban, Permanent Ban), Attribution.

Contact email for enforcement: `contact@founderos.dev` (from package.json).

Copy the full text from the URL above and set the contact method to `contact@founderos.dev`.

- [ ] **Step 2: Commit CODE_OF_CONDUCT.md**

```bash
git add CODE_OF_CONDUCT.md
git commit -m "docs: add Contributor Covenant Code of Conduct v2.1"
```

---

### Task 10: Create SECURITY.md

**Files:**
- Create: `SECURITY.md`

- [ ] **Step 1: Write SECURITY.md**

```markdown
# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.2.x   | Yes                |
| 1.1.x   | Security fixes only|
| < 1.1   | No                 |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to **security@founderos.dev**.

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include:

- Type of issue (e.g., command injection, path traversal, data exposure)
- Full paths of source file(s) related to the issue
- Step-by-step instructions to reproduce the issue
- Impact of the issue and how an attacker might exploit it

## Scope

The following are in scope:

- Command injection through skill/command parameters
- Path traversal in file operations
- Credential or API key exposure
- Unauthorized access to connected services (Notion, Gmail, etc.)

The following are out of scope:

- Issues in Claude Code itself (report to Anthropic)
- Issues in third-party MCP servers
- Social engineering attacks
```

- [ ] **Step 2: Commit SECURITY.md**

```bash
git add SECURITY.md
git commit -m "docs: add SECURITY.md with vulnerability reporting process"
```

---

### Task 11: Create CHANGELOG.md at root

**Files:**
- Create: `CHANGELOG.md` (copied from `dist/CHANGELOG.md`)

- [ ] **Step 1: Copy changelog from dist**

```bash
cp dist/CHANGELOG.md CHANGELOG.md
```

- [ ] **Step 2: Commit CHANGELOG.md**

```bash
git add CHANGELOG.md
git commit -m "docs: add CHANGELOG.md to repository root"
```

---

## Chunk 4: GitHub Templates & README

### Task 12: Create GitHub issue templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/ISSUE_TEMPLATE/config.yml`

- [ ] **Step 1: Create .github/ISSUE_TEMPLATE directory**

```bash
mkdir -p .github/ISSUE_TEMPLATE
```

- [ ] **Step 2: Write bug_report.yml**

```yaml
name: Bug Report
description: Report a bug in Founder OS
title: "[Bug]: "
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for taking the time to report a bug! Please fill out the sections below.
  - type: textarea
    id: description
    attributes:
      label: Description
      description: A clear description of the bug.
      placeholder: What happened?
    validations:
      required: true
  - type: textarea
    id: steps
    attributes:
      label: Steps to Reproduce
      description: Steps to reproduce the behavior.
      placeholder: |
        1. Run command '...'
        2. See error '...'
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: What you expected to happen.
    validations:
      required: true
  - type: textarea
    id: actual
    attributes:
      label: Actual Behavior
      description: What actually happened.
    validations:
      required: true
  - type: input
    id: fos-version
    attributes:
      label: Founder OS Version
      description: "Run: npx founder-os --version"
      placeholder: "1.2.0"
    validations:
      required: true
  - type: dropdown
    id: os
    attributes:
      label: Operating System
      options:
        - macOS
        - Linux
        - Windows (WSL)
        - Other
    validations:
      required: true
  - type: input
    id: node-version
    attributes:
      label: Node.js Version
      description: "Run: node --version"
      placeholder: "v20.11.0"
  - type: textarea
    id: logs
    attributes:
      label: Relevant Log Output
      description: Paste any relevant log output or error messages.
      render: shell
```

- [ ] **Step 3: Write feature_request.yml**

```yaml
name: Feature Request
description: Suggest a new feature for Founder OS
title: "[Feature]: "
labels: ["enhancement"]
body:
  - type: markdown
    attributes:
      value: |
        Thanks for suggesting a feature! Please describe what you'd like to see.
  - type: textarea
    id: problem
    attributes:
      label: Problem
      description: What problem does this feature solve? What workflow is missing or painful?
      placeholder: "I'm always frustrated when..."
    validations:
      required: true
  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
      description: How would you like this to work? Include example commands if possible.
      placeholder: |
        A new command `/founder-os:...` that...
    validations:
      required: true
  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
      description: Any alternative solutions or features you've considered?
  - type: textarea
    id: use-case
    attributes:
      label: Use Case
      description: Describe a specific scenario where this feature would help you.
    validations:
      required: true
```

- [ ] **Step 4: Write config.yml**

```yaml
blank_issues_enabled: false
contact_links:
  - name: Documentation
    url: https://fos.naluforge.com
    about: Check the documentation before opening an issue
  - name: Questions & Discussions
    url: https://github.com/thecloudtips/founder-workspace/discussions
    about: Ask questions and discuss ideas
```

- [ ] **Step 5: Commit issue templates**

```bash
git add .github/
git commit -m "chore: add GitHub issue templates (bug report, feature request)"
```

---

### Task 13: Create PR template and FUNDING.yml

**Files:**
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `.github/FUNDING.yml`

- [ ] **Step 1: Write PULL_REQUEST_TEMPLATE.md**

```markdown
## Description

<!-- What does this PR do? Why is it needed? -->

## Related Issue

<!-- Link to the issue this PR addresses, e.g., Fixes #123 -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)

## Testing Done

<!-- How did you test these changes? -->

## Checklist

- [ ] My changes follow the existing code patterns
- [ ] I have tested my changes
- [ ] I have updated documentation if needed
- [ ] My changes don't introduce breaking changes
```

- [ ] **Step 2: Write FUNDING.yml**

```yaml
custom:
  - https://now.naluforge.com
```

- [ ] **Step 3: Commit PR template and funding**

```bash
git add .github/
git commit -m "chore: add PR template and FUNDING.yml"
```

---

### Task 14: Create root README.md (GitHub landing page)

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write the comprehensive README.md**

The README serves as the GitHub landing page. Content is drawn from the fos.naluforge.com landing page and product messaging. Structure:

1. **Hero** — Project name, tagline ("AI Chief of Staff for Founders"), one-liner, install command, website links
2. **What is Founder OS?** — 2-3 paragraphs: open-source Claude Code plugin, 120+ commands, no signup, transforms Claude Code into a business command center
3. **Quick Start** — 3 steps with code blocks: `npx founder-os`, `/founder-os:setup:notion-hq`, `/founder-os:briefing:briefing`
4. **Four Pillars** — Daily Work, Code Without Coding, Integrations, Meta & Growth. Each with 2-3 example commands in code blocks.
5. **By the Numbers** — Table: 35 namespaces | 120+ commands | 10 agent teams | 6 integrations
6. **Feature Highlights** — Memory Engine, Intelligence Engine, Agent Teams, Scout Discovery, Workflow Automation (2-3 sentences each)
7. **Documentation** — Links to docs/ subdirectories: Getting Started, Command Reference, Agent Teams, Deep Dives, Extending FOS
8. **Links** — fos.naluforge.com (Product), blog.naluforge.com (Blog), now.naluforge.com (NaluForge)
9. **Contributing** — Brief welcome + link to CONTRIBUTING.md
10. **License** — MIT with link to LICENSE

Total README length: ~200-300 lines of markdown.

Source content for writing the README:
- `docs/landing/index.md` — Four Pillars, example commands, How It Works, feature highlights
- `docs/landing/about.md` — Value proposition, philosophy
- `docs/landing/getting-started.md` — Quick start steps
- `dist/package.json` — Package name, description, install command

- [ ] **Step 2: Commit README.md**

```bash
git add README.md
git commit -m "docs: add comprehensive README.md as GitHub landing page

Includes product overview, quick start guide, four pillars framework,
feature highlights, and links to fos.naluforge.com, blog.naluforge.com,
and now.naluforge.com."
```

---

## Chunk 5: Verification & Final Commit

### Task 15: Verify no internal references leak into public files

**Files:**
- Verify: all files in `docs/`, `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`

- [ ] **Step 1: Check for internal tooling references in public files**

```bash
grep -rn 'beads\|\.beads\|bd create\|bd ready\|bd close' docs/ README.md CLAUDE.md CONTRIBUTING.md 2>/dev/null
grep -rn 'claude-flow\|swarm init\|hive-mind\|\.swarm' docs/ README.md CLAUDE.md CONTRIBUTING.md 2>/dev/null
grep -rn 'internal_docs\|\.entire' docs/ README.md CLAUDE.md CONTRIBUTING.md 2>/dev/null
```

Expected: No matches. If any found, fix them.

- [ ] **Step 2: Verify git status is clean**

```bash
git status
```

Expected: Clean working tree. All changes committed.

- [ ] **Step 3: Verify internal files still exist on disk**

```bash
ls -d .beads .claude .claude-flow .swarm .entire 2>/dev/null
```

Expected: All directories still present locally.

- [ ] **Step 4: Verify new docs structure**

```bash
ls docs/
ls docs/landing/
ls docs/commands/ | head -5
ls docs/agents/ | head -5
```

Expected: Correct flattened structure with all files present.

- [ ] **Step 5: Verify .gitignore works**

```bash
git status --short | grep -c '^\?\? \.beads/'    # should be 0 (ignored)
git status --short | grep -c '^\?\? \.claude/'    # should be 0 (ignored)
git status --short | grep -c '^\?\? internal_docs/'  # should be 0 (ignored)
```

Expected: All zeros — internal directories are properly ignored.

- [ ] **Step 6: Final review of tracked files**

```bash
git ls-files | grep -c '^\.'     # should be just .gitignore
git ls-files | head -10          # verify public-only files
```

Expected: Only `.gitignore` starts with `.`. No `.beads/`, `.claude/`, `.claude-flow/`, `.swarm/` files in tracking.
