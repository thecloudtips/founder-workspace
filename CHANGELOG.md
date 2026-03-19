# Changelog

## 1.2.0 (2026-03-18)

### Changed
- **Removed PreToolUse hook** — DB init moved to SessionStart (runs once, not per tool call)
- **PostToolUse matcher** set to `Skill` — only fires on Skill calls, not every tool
- SessionStart now handles lazy DB initialization (memory + intelligence) at session start
- SessionStart timeout increased to 10s (DB init + dispatcher rules + context)
- Hook registry reduced from 5 to 4 events — eliminates per-tool-call overhead
- Installer dynamically reads hook count from registry

### Fixed
- Clean up stale flat-format hook entries from v1.1.0 during update (migration fix)
- Clean up hooks for events removed from registry (e.g., PreToolUse) during update
- Remove function now handles both old flat format and new nested format

## 1.1.1 (2026-03-18)

### Fixed
- Hook registry format: use Claude Code's `matcher` + `hooks` array structure instead of flat format
- Hook merge/remove functions updated to handle nested hook group structure
- Tests updated to validate correct hooks API format

## 1.1.0 (2026-03-18)

### Added
- **Runtime hooks**: 5 Claude Code lifecycle hooks (SessionStart, PreToolUse, UserPromptSubmit, PostToolUse, Stop)
- **SessionStart hook**: Injects dispatcher rules, business context, and active intelligence patterns at session start
- **PreToolUse hook**: Lazy initialization of Memory and Intelligence engine databases on first tool use
- **UserPromptSubmit hook**: Preflight dependency checks for `/founder-os:*` commands
- **PostToolUse hook**: Observation logging to intelligence database for founder-os skill calls
- **Stop hook**: Session cleanup, temp file removal, and session summary logging
- **Shared SQLite helper** (`db-helper.mjs`): Zero-dependency database operations via sqlite3 CLI
- **Hook registry** (`hook-registry.json`): Centralized hook configuration for all 5 events
- **Evals pipeline**: Shipped eval-runner, checks, and rubrics in distribution package
- **Hook merge/remove functions** in `settings-json.js` for idempotent hook management

### Changed
- Installer now registers runtime hooks (Phase 2a) and verifies DB initialization (Phase 2b)
- Updater merges hook registry on update
- Uninstaller removes founderOS hook entries while preserving user hooks
- Dispatcher preflight checks moved from subagent to UserPromptSubmit hook

## 1.0.0

- Initial release
- `--init` command for fresh install and updates
- `--uninstall` command with backup restoration
- `--status` and `--version` commands
- CLAUDE.md marker-based merge
- settings.json deep merge
- Manifest-based checksum tracking for safe updates
