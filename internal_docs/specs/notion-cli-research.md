# Replacing Notion MCP with a thin CLI saves 97% of token overhead

**A Node.js CLI wrapper around the official `@notionhq/client` SDK is the clear winner for your Founder OS plugin.** It eliminates ~110,000 wasted tokens per 10-command session, ships in under 1 MB, requires zero code beyond ~200 lines, and follows the exact pattern Google validated when replacing three MCP servers with its `gws` CLI. The current MCP approach has a second critical problem beyond token bloat: the official `notion-update-page` tool has a confirmed schema validation bug (#153) that blocks all write operations — a showstopper for 21 databases handling CRM, tasks, and content.

Three viable approaches emerged from this research, but they differ dramatically in tradeoffs. Here's the ranking, the economics, and a concrete implementation path.

## Token economics make the MCP status quo untenable

The official Notion MCP server (`@notionhq/notion-mcp-server` v2.0.0) registers **22 tool definitions** that get injected into every conversation turn. Anthropic's own engineering team measured real-world MCP overhead: GitHub's 35 tools consume ~26K tokens, Slack's 11 tools consume ~21K tokens, and internal setups routinely hit **134K tokens** in tool definitions alone before a user types a single word. For Notion's 22 tools at ~500 tokens each, that's roughly **11,000 tokens loaded per turn**.

In a typical Founder OS session where a user runs 10 commands but only 3 touch Notion, the MCP approach burns **~110,000 tokens** on Notion tool definitions across those turns — all 22 tools competing for Claude's attention on every single response, including the 7 turns that never need Notion. A CLI approach invoked via shell commands consumes **zero tokens when idle** and roughly 200 tokens of skill instructions plus ~800 tokens of command output per actual Notion call. That's ~2,600 tokens total — a **97.6% reduction**.

At Claude Sonnet 4 pricing (~$3/M input tokens), this translates from $0.33 per session down to $0.008. For a team of 5 founders running 20 sessions daily, that's **$990/month in Notion-only token overhead versus $24/month** with the CLI approach. Beyond cost, there's a quality effect: Anthropic found that reducing tool count from 58 to on-demand loading improved task accuracy from 49% to 74% on Opus 4, because the model stops wasting attention on irrelevant tools.

## Three approaches ranked by fit for Founder OS

### Approach 1 (recommended): Node.js CLI wrapping @notionhq/client

The official Notion JavaScript SDK (`@notionhq/client` v5.9.0) has **222K+ weekly downloads**, 100% API coverage, built-in retry logic, pagination helpers, and installs at just **~890 KB** with only 2 direct dependencies. A single `notion-tool.mjs` file of ~150–200 lines wraps the SDK into a CLI with 8 subcommands: `search`, `query`, `create-page`, `update-page`, `get-page`, `get-blocks`, `get-comments`, `create-comment`. Claude Code already ships with Node.js, so there's no additional runtime to install.

The plugin structure follows the proven skill-wrapped CLI pattern:

```
founder-os/
├── scripts/notion-tool.mjs        # ~200 line CLI entry point
├── scripts/package.json           # @notionhq/client dependency
├── scripts/node_modules/          # ~890 KB
├── skills/notion-ops/SKILL.md     # Skill file (~200 tokens in context)
└── commands/notion-setup.md       # Guided setup wizard
```

The `SKILL.md` file teaches Claude when and how to call the CLI — it auto-activates when Notion operations are detected in conversation, and its `allowed-tools: Bash(notion-tool:*)` directive grants shell access exclusively to the Notion CLI. This is the exact architecture Google's `gws` CLI uses: the CLI replaced three separate MCP servers (Gmail, Calendar, Drive) because, as one gws contributor put it, "the MCP approach spreads the entire menu on the table; the CLI approach orders from the kitchen when you're hungry."

**Implementation effort**: 2–3 days. Write the wrapper script, create the skill file, build a setup wizard command, test against your 21 databases. **Risk: low.** The SDK is official, battle-tested, and you control error handling, retry logic, and output formatting end-to-end.

### Approach 2 (strong alternative): 4ier/notion-cli Go binary

A remarkable discovery: `4ier/notion-cli` is a Go-based CLI with **39 commands covering 100% of the Notion API**, MIT-licensed, actively maintained (v0.3.0, February 2026). It was explicitly designed for AI agent integration — it auto-detects when output is piped and switches from pretty tables to JSON, supports human-friendly filters (`--filter 'Status=Done'` instead of raw JSON), reads/writes Markdown via `--md` flag, and resolves Notion URLs directly.

Key commands map perfectly to your needs: `notion search "query"` for discovery, `notion db query <id> --filter 'Status=Done'` for database queries, `notion page create <db-id> --db "Name=Task" "Status=Todo"` for page creation, `notion block list <page-id> --md` for reading content. Auth works via `NOTION_TOKEN` environment variable or `notion auth login`. It installs via Homebrew, npm (`notion-cli-go`), or direct binary download for macOS/Linux/Windows on both amd64 and arm64.

The tradeoff is **size versus zero development effort**: the Go binary is ~10–15 MB per platform versus ~1 MB for the Node.js approach, and you'd need to bundle or reference platform-specific binaries. The project has only 17 GitHub stars, meaning it's new and less battle-tested. But it requires literally zero lines of custom code — you'd just write the skill file and setup command.

**Implementation effort**: 1 day. Write skill file, create setup command, test. **Risk: medium.** Low star count means potential abandonment; binary size may be an issue for plugin distribution; no control over error messages or output formatting.

### Approach 3 (future option): Anthropic's defer_loading tool search

Anthropic released a Tool Search API feature (November 2025) that lets you mark tools with `defer_loading: true`. Only a lightweight Tool Search Tool (~500 tokens) loads upfront; full schemas are fetched on-demand when Claude decides to use a tool. This achieved **85–90% token reduction** in Anthropic's benchmarks, dropping 72K tokens to 3K. For MCP servers specifically, you can defer entire servers:

```json
{
  "type": "mcp_toolset",
  "mcp_server_name": "notion",
  "default_config": {"defer_loading": true}
}
```

However, this is currently an **API-level beta feature** (`betas=["advanced-tool-use-2025-11-20"]`), not yet natively available in Claude Code's plugin system. It also doesn't address the critical `notion-update-page` bug in the official MCP server. Worth monitoring — if Claude Code exposes `defer_loading` for MCP configs, it becomes a low-effort optimization you could use alongside the CLI approach.

## The MCP server has problems beyond token bloat

The official Notion MCP server has **83 open issues** on GitHub, and one is particularly damaging: issue #153 documents a confirmed schema validation bug in `notion-update-page` that **blocks all database page property updates**. For a plugin where 21 of 32 command namespaces write to Notion databases, this is a critical reliability gap. The community fork `@suekou/mcp-notion-server` offers an `--enabledTools` flag for selective tool loading, but it doesn't fix the underlying API translation issues.

The MCP protocol itself adds overhead beyond tool definitions: WebSocket framing, JSON-RPC message envelopes, and the MCP server process consuming memory even when idle. A direct CLI call is a simple fork-exec that returns JSON to stdout — no persistent process, no protocol overhead, no tool registration ceremony.

Additionally, there's no way to selectively load tools from the official MCP server. A feature request (#111) for `ENABLED_TOOLS`/`DISABLED_TOOLS` environment variables remains unimplemented. This means you'd load all 22 tools even if Founder OS only needs 8 operations.

## Non-technical founder setup can be streamlined to 8 steps

The biggest UX challenge is Notion integration setup. Every approach requires users to create a Notion internal integration token and share databases with it. The critical insight: **sharing a parent page automatically grants access to all child pages and databases beneath it**. If your 21 databases are nested under a single root page (or 2–3 workspace sections), the user shares 1–3 pages instead of 21.

Build a `/notion-setup` slash command into the plugin that walks founders through each step:

1. Open notion.so/profile/integrations
2. Click "New integration," name it "Founder OS," select workspace
3. Copy the integration secret token
4. Paste token when prompted (plugin stores it in `.env`)
5. Open your Founder OS root page in Notion
6. Click ••• menu → Add Connections → search "Founder OS" → Confirm
7. Plugin runs `notion-tool search` to verify access
8. Plugin lists accessible databases — done

That's **8 steps with visual guidance** versus the 25+ steps of manually sharing each database. The internal integration token is non-expiring and requires no OAuth infrastructure on your side — each user's token stays on their machine as an environment variable. This is the same auth model used by every Notion CLI tool in the ecosystem and is dramatically simpler than the OAuth flow required for Notion marketplace distribution.

## Concrete implementation roadmap

The recommended path is the Node.js CLI wrapper (Approach 1), with the 4ier/notion-cli binary as a fallback if you want zero custom code.

**Week 1**: Build `notion-tool.mjs` wrapping 8 operations against `@notionhq/client`. Create the `SKILL.md` skill file with command reference and auto-activation triggers. Test against your 21 databases with real Founder OS command patterns.

**Week 2**: Build the `/notion-setup` guided wizard. Implement error handling: exponential backoff for rate limits (Notion allows 3 req/sec average), friendly messages for auth failures, pagination handling for databases exceeding 100 items. Create a `--diagnostic` flag for troubleshooting.

**Week 3**: Migrate your 21 command namespaces from MCP tool calls to CLI shell invocations. Each command's markdown file changes from referencing MCP tools to calling `node ${CLAUDE_SKILL_DIR}/scripts/notion-tool.mjs <command>`. Remove `.mcp.json` Notion server config. Test end-to-end with a non-technical user.

**Total effort: ~2 weeks** of focused development, with the third week for migration and testing. The result: a plugin that consumes 97% fewer tokens on Notion operations, bypasses the critical MCP update bug, ships entirely self-contained under 1 MB of dependencies, and requires 8 setup steps for non-technical founders.

## Conclusion

The Node.js CLI wrapper wins on every priority axis. It delivers **97.6% token reduction** (priority 1), requires only 8 guided setup steps (priority 2), provides 100% API coverage via the official SDK for all 8 core operations (priority 3), ships as ~1 MB inside the plugin directory with no external runtime needed (priority 4), and leans on the most-downloaded Notion SDK with 222K weekly installs for long-term maintenance (priority 5). The `gws` migration from three Google MCP servers to a single CLI proves this pattern works at scale. The 4ier/notion-cli Go binary is a credible shortcut if you want zero custom code and can tolerate the binary size. The `defer_loading` API feature is worth monitoring as a complementary optimization but isn't ready for Claude Code plugins today. Kill the MCP server — the CLI approach is strictly superior for distributed plugins with large API surfaces.