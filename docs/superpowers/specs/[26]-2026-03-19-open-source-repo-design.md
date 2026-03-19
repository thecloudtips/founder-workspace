# [26] Open-Source Repository Preparation Design

**Date:** 2026-03-19
**Status:** Approved
**Approach:** A — Clean Gitignore + Restructure

## Problem

The founder-workspace repository contains internal development tooling (.beads, .claude, .claude-flow, .swarm, .entire) mixed with the public product (development/, dist/). The docs/ directory mixes internal specs/plans with public-facing documentation. There is no root README or standard open-source files (LICENSE, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY). The repo is not presentable as a public open-source project.

## Goal

Transform the repository into a clean, well-documented open-source project that:
- Excludes all internal development tooling from git tracking
- Presents comprehensive public documentation
- Has a compelling GitHub landing page (README)
- Includes all standard open-source community files
- Maintains internal files on disk for local development

## Design

### 1. Gitignore Rewrite & Internal File Removal

The current `.gitignore` has partial rules for internal directories (individual files within `.beads/`, `.claude-flow/`, `.swarm/`). These partial rules will be **replaced** with full directory exclusions. The new `.gitignore` supersedes all existing content.

**New `.gitignore` (complete replacement):**

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

# Process files (but NOT package lockfiles — those should be committed)
*.pid
```

**Note on lockfiles:** `package-lock.json` and similar lockfiles are NOT ignored. They ensure reproducible installs for contributors. Only process PID files are ignored.

**Note on `.claude/settings.json`:** While `.claude/` is fully excluded, the public project configuration is stored in `development/CLAUDE.md` and the root `CLAUDE.md`. Contributors don't need `.claude/settings.json` — it contains internal workflow definitions (265 agents, helpers, commands) used for development orchestration.

**Remove from git tracking (files stay on disk):**

| Directory | Tracked Files | Action |
|-----------|--------------|--------|
| `.beads/` | 19 | `git rm -r --cached` |
| `.claude/` | 265 | `git rm -r --cached` |
| `.claude-flow/` | 7 | `git rm -r --cached` |
| `.swarm/` | 3 | `git rm -r --cached` |
| **Total** | **294** | Removed from tracking only |

### 2. Docs Restructuring

**Actual disk layout of `docs/site/`:**

```
docs/site/
  ├── docs/                  # documentation content (nested under site/)
  │   ├── index.md
  │   ├── installation.md
  │   ├── agents/
  │   ├── commands/
  │   ├── deep-dives/
  │   └── extending/
  └── landing/               # landing page content
      ├── index.md
      ├── about.md
      ├── getting-started.md
      ├── how-it-works.md
      └── use-cases.md
```

**Step 1: Rename `docs/` to `internal_docs/`**

Move the entire current docs directory to `internal_docs/`. This directory is gitignored and stays on disk for local development.

**Step 2: Flatten and promote `internal_docs/site/` to root `docs/`**

The `internal_docs/site/` directory has a two-level structure (`site/docs/` and `site/landing/`). We **flatten** this by merging both directories into the new root `docs/`:

```bash
# Create new docs from site content
cp -r internal_docs/site/docs/* docs/      # copies index.md, installation.md, agents/, commands/, etc.
cp -r internal_docs/site/landing docs/landing/  # copies landing/ as a subdirectory
```

**Target structure after flattening:**

```
docs/
  ├── index.md              # Documentation home (from site/docs/)
  ├── installation.md       # Full setup guide (from site/docs/)
  ├── agents/               # 10 agent team docs (from site/docs/)
  │   ├── index.md
  │   ├── briefing-team.md
  │   ├── client-team.md
  │   └── ... (11 files)
  ├── commands/             # 35 namespace command reference (from site/docs/)
  │   ├── index.md
  │   ├── actions.md
  │   ├── briefing.md
  │   └── ... (36 files)
  ├── deep-dives/           # Architecture internals (from site/docs/)
  │   ├── dispatcher.md
  │   ├── evals-framework.md
  │   ├── hooks-system.md
  │   ├── intelligence-engine.md
  │   └── memory-engine.md
  ├── extending/            # Customization guides (from site/docs/)
  │   ├── custom-namespaces.md
  │   ├── scout.md
  │   └── workflows.md
  └── landing/              # Landing page content (from site/landing/)
      ├── index.md
      ├── about.md
      ├── getting-started.md
      ├── how-it-works.md
      └── use-cases.md
```

**Step 3: Fix internal links**

After flattening, the relative paths between docs and landing content change:

| File location | Old reference | New reference |
|--------------|---------------|---------------|
| `docs/index.md` | `../landing/getting-started.md` | `./landing/getting-started.md` |
| `docs/landing/*.md` | `../docs/commands/index.md` | `../commands/index.md` |
| `docs/landing/*.md` | `../docs/agents/index.md` | `../agents/index.md` |
| `docs/landing/*.md` | `../docs/installation.md` | `../installation.md` |

A grep for `../landing/` and `../docs/` across all files in the new `docs/` directory will identify all links to fix.

### 3. Root README.md (GitHub Landing Page)

A comprehensive README serving as the first thing visitors see:

**Structure:**

1. **Hero Section**
   - Project name with tagline: "AI Chief of Staff for Founders"
   - One-sentence description
   - Install command badge
   - Links to fos.naluforge.com, blog.naluforge.com, now.naluforge.com

2. **What is Founder OS?**
   - 2-3 paragraph overview
   - Drawn from fos.naluforge.com messaging
   - Emphasis: open-source, free, no signup, Claude Code plugin

3. **Quick Start**
   - 3 steps: install, configure, run first command
   - Code blocks with actual commands

4. **Four Pillars Overview**
   - Daily Work (inbox, meetings, briefings)
   - Code Without Coding (reports, invoices, proposals)
   - Integrations (Gmail, Drive, Notion, Slack)
   - Meta & Growth (ROI tracking, workflows, learning)
   - Each with 2-3 example commands

5. **By the Numbers**
   - Table: 35 namespaces, 120+ commands, 10 agent teams, 6 integrations

6. **Feature Highlights**
   - Memory Engine, Intelligence Engine, Agent Teams, Scout, Workflows
   - Brief description of each (2-3 sentences)

7. **Documentation Links**
   - Getting Started Guide
   - Command Reference
   - Agent Teams
   - Deep Dives
   - Extending FOS

8. **Links**
   - fos.naluforge.com — Product site
   - blog.naluforge.com — Blog & tutorials
   - now.naluforge.com — NaluForge (parent company)

9. **Contributing**
   - Link to CONTRIBUTING.md
   - Brief welcome message

10. **License**
    - MIT with copyright line

### 4. Open-Source Standard Files

#### LICENSE (root)

MIT License, copied from `dist/LICENSE`. Copyright line: "Copyright (c) 2026 NaluForge / Founder OS"

#### CONTRIBUTING.md

Sections:
- Welcome & project overview
- Development setup (clone, install deps, run tests)
- How to contribute (fork → branch → PR)
- PR requirements (description, tests, no breaking changes)
- Code style (follow existing patterns)
- Reporting bugs (link to issue template)
- Suggesting features (link to feature request template)
- Code of Conduct reference

#### CODE_OF_CONDUCT.md

Contributor Covenant v2.1 (industry standard, used by most major open-source projects).

#### SECURITY.md

- Supported versions table
- How to report vulnerabilities (email, not public issues)
- Expected response timeline
- Scope (what qualifies as a security issue)

#### CHANGELOG.md (root)

Copied from `dist/CHANGELOG.md`, maintained at root going forward. The `dist/CHANGELOG.md` is left as-is for now; the build/release process can be updated separately to source from root. This is noted as a known tech debt item.

#### .github/ISSUE_TEMPLATE/bug_report.yml

YAML-based GitHub issue template (not markdown frontmatter) for better UI rendering:
- Description textarea (required)
- Steps to reproduce textarea (required)
- Expected vs actual behavior textareas
- Environment dropdown (OS, Node version)
- FOS version input (required)

#### .github/ISSUE_TEMPLATE/feature_request.yml

YAML-based template:
- Problem description textarea (required)
- Proposed solution textarea
- Alternatives considered textarea
- Use case textarea (required)

#### .github/ISSUE_TEMPLATE/config.yml

Template chooser configuration with links to docs and discussions.

#### .github/PULL_REQUEST_TEMPLATE.md

Checklist (markdown is fine for PR templates):
- Description of changes
- Related issue number
- Type (bugfix, feature, docs, refactor)
- Testing done
- Breaking changes?

#### .github/FUNDING.yml

Sponsorship configuration linking to NaluForge:
- Custom URL to now.naluforge.com or relevant sponsorship page

### 5. CLAUDE.md Rewrite

**Current root CLAUDE.md** references beads, swarm, claude-flow, hive-mind — all internal tooling. It needs rewriting for public contributors.

**Action:**
1. Copy current `CLAUDE.md` to `.claude/CLAUDE-internal.md` (already gitignored via `.claude/` rule, stays on disk)
2. Rewrite root `CLAUDE.md` for public contributors:

**New CLAUDE.md structure:**
- Project overview (what Founder OS is)
- Repository structure (development/, dist/, docs/)
- How to add a new command
- How to add a new skill
- How to add a new agent
- Build & test commands
- Link to CONTRIBUTING.md
- No references to internal tooling (beads, swarm, claude-flow, hive-mind)

## Execution Order

1. Update `.gitignore` — **replace** entire file with new content (supersedes partial rules)
2. `git rm -r --cached` for .beads/, .claude/, .claude-flow/, .swarm/
3. Rename `docs/` → `internal_docs/` (git mv)
4. Create new `docs/` directory
5. Flatten `internal_docs/site/docs/*` → `docs/` and `internal_docs/site/landing/` → `docs/landing/`
6. Fix internal links in new `docs/` files (grep for `../landing/`, `../docs/`)
7. Copy current CLAUDE.md → `.claude/CLAUDE-internal.md`
8. Create root files: README.md, LICENSE, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, CHANGELOG.md
9. Create .github/ templates (bug_report.yml, feature_request.yml, config.yml, PULL_REQUEST_TEMPLATE.md, FUNDING.yml)
10. Rewrite root CLAUDE.md for public contributors
11. Verify no internal references leak into public files
12. Commit everything in a single "chore: prepare repository for open-source" commit

## Known Tech Debt

- `dist/CHANGELOG.md` duplicates root `CHANGELOG.md` — build process should be updated to source from root
- CI/CD pipelines not included (future work)
- Branch protection rules not configured
- NPM publishing automation not set up

## Out of Scope

- CI/CD pipelines
- Automated release workflows
- GitHub Actions
- Branch protection rules
- NPM publishing automation
- Repository transfer or rename
