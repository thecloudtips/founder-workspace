# [19] Obsidian Integration Design

> **Status:** Stub — pending specification

## Overview

User config choice between Obsidian and Notion at onboarding. Allow Founder OS to use an Obsidian vault as the primary or secondary storage backend for command outputs, notes, and knowledge base entries.

## Topics to Specify

- Onboarding flow: backend selection (Notion / Obsidian / both)
- Config persistence (`.founderOS/config.json` or manifest)
- Obsidian vault discovery and validation
- Note output format (frontmatter, wiki-links, folder structure)
- Namespace-to-folder mapping (inbox/, briefing/, meeting/, etc.)
- Daily notes integration
- Backend switching (Notion → Obsidian, Obsidian → Notion)
- Dual-backend sync mode
- Conflict resolution strategy
- Which namespaces support Obsidian (all 32 or subset?)
- Impact on existing Notion-dependent commands
- Template system for Obsidian vault structure
