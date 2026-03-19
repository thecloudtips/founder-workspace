# Memory

> Teach the system facts, preferences, and rules that apply across every Founder OS command -- permanently.

## Overview

The Memory namespace is the user-facing interface to the Founder OS memory engine. Behind the scenes, every plugin already observes your behavior and detects patterns (like your preference for bullet-point briefings or the fact that Acme Corp pays on net-30 terms). The Memory namespace lets you take direct control: explicitly teach the system something, view what it has learned, remove outdated knowledge, or force a sync between the local store and Notion.

Memories are stored in a local SQLite database with HNSW-indexed embeddings for semantic search. Each memory has a confidence score, a status lifecycle (candidate, confirmed, applied), and an optional company relation. When you explicitly teach a memory, it enters at maximum confidence and is immediately applied to all future plugin runs.

The system also syncs with a `[FOS] Memory` database in Notion, giving you a visual interface for reviewing and managing memories alongside the command-line tools.

## Required Tools

| Tool | Required | Purpose |
|------|----------|---------|
| SQLite (via Bash) | Yes | Reads and writes the local memory store |
| Notion CLI | Optional | Syncs memories to/from the Notion Memory database |

## Commands

### `/founder-os:memory:teach`

**What it does** -- Explicitly teaches the memory engine a fact, preference, rule, or contact detail. The memory is stored with maximum confidence (100) and "confirmed" status, so it takes effect immediately across all plugins. Includes duplicate detection via both exact key matching and semantic similarity (cosine similarity > 0.85).

**Usage:**

```
/founder-os:memory:teach "[statement]" [--company "NAME"] [--category preference|fact|contact|workflow]
```

**Example scenario:**

> You always want emails from your biggest client flagged as urgent. You teach the system: "Always flag emails from @bigclient.com as urgent." It's stored as a preference, linked to the client's Notion CRM record, and immediately applied to future inbox triage runs.

**What you get back:**

- Memory key (human-readable identifier)
- Category (auto-detected or specified)
- Confidence and status confirmation
- Company relation status
- Notion sync status

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--company "NAME"` | -- | Link memory to a company in your CRM |
| `--category` | Auto-detected | `preference`, `fact`, `contact`, or `workflow` |

---

### `/founder-os:memory:show`

**What it does** -- Displays what the system has learned, organized by category (Preferences, Facts, Contacts, Workflows). Filter by company name or plugin ID to see scoped memories. Optionally show candidate memories (not yet confirmed) and active adaptations (behaviors the system changed based on learned patterns).

**Usage:**

```
/founder-os:memory:show [company|plugin|all] [--candidates] [--adaptations]
```

**Example scenario:**

> You want to see everything the system knows about Acme Corp. You run `memory:show "Acme Corp"` and see 4 memories: payment terms (fact), primary contact (contact), email flagging preference (preference), and a detected pattern about Friday follow-ups. You also see 2 active adaptations that were triggered by these memories.

**What you get back:**

- Memories grouped by category with key, source, confidence, and status
- Active adaptations list (behaviors changed by memories)
- Candidate memories (pending confirmation, shown with `--candidates`)
- Count summary: confirmed, applied, candidates, dismissed

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `filter` | `all` | Company name, plugin ID (e.g., `P02`), or `all` |
| `--candidates` | Hidden | Include candidate-status memories |
| `--adaptations` | Hidden | Show active behavior adaptations |

---

### `/founder-os:memory:forget`

**What it does** -- Deletes a named memory from the local store and reverts any active behavior adaptations it triggered. Includes a confirmation prompt showing the memory details and any active adaptations that will be affected. Archives (not deletes) the corresponding Notion page for audit trail.

**Usage:**

```
/founder-os:memory:forget <key> [--force]
```

**Example scenario:**

> The VIP email flagging rule for a former client is no longer relevant. You run `forget acme-vip-flag` and see the memory details plus the active adaptation it triggered (auto-flagging emails). You confirm, and the memory is deleted, the adaptation is reverted, and the Notion page is archived.

**What you get back:**

- Memory details and active adaptation count (before deletion)
- Confirmation of deletion, embedding removal, and adaptation revert
- Notion archive status
- Pointer to re-teach if needed

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--force` | -- | Skip confirmation prompt |

---

### `/founder-os:memory:sync`

**What it does** -- Forces a bidirectional sync between the local SQLite memory store and the Notion `[FOS] Memory` database. Push sends new and updated local memories to Notion. Pull imports changes made directly in Notion (status changes, content edits, deletions). Conflict resolution follows clear rules: Notion wins for status and content, local wins for usage metrics.

**Usage:**

```
/founder-os:memory:sync [--direction push|pull|both] [--dry-run]
```

**Example scenario:**

> You edited several memory entries directly in Notion (dismissed some candidates, updated a contact detail) and want those changes reflected locally. You run `sync --direction pull` and the system pulls 3 updates and 1 dismissal from Notion into your local store.

**What you get back:**

- Push summary: new, updated, and deleted records sent to Notion
- Pull summary: updated and dismissed records imported from Notion
- Last sync timestamp
- Error details for any failed records

**Flags:**

| Flag | Default | Description |
|------|---------|-------------|
| `--direction` | `both` | `push`, `pull`, or `both` |
| `--dry-run` | -- | Show what would change without writing |

---

## Tips & Patterns

- **Teach your preferences early.** The first week of using Founder OS is the best time to teach high-impact preferences: email tone, briefing format, report structure. These compound across every plugin run.
- **Review candidates periodically.** Run `memory:show --candidates` every week or two to see what the system has detected on its own. Confirm the good ones and dismiss the noise.
- **Use company-scoped memories for client work.** Teaching "Acme Corp prefers formal communication" with `--company "Acme Corp"` ensures that preference surfaces automatically in every command that touches that client.
- **Sync after Notion edits.** If you manage memories in the Notion UI (it's a nice visual interface for bulk review), run `sync --direction pull` to import your changes back to the local store.

## Related Namespaces

- **[Intel](/commands/intel)** -- View and manage the patterns the intelligence engine detects automatically
- **[Learn](/commands/learn)** -- Log insights that may inform future memories
- **[Setup](/commands/setup)** -- Configure the Notion workspace that stores synced memories
