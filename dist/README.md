# founder-os

AI-powered business automation for founders — installs into any Claude Code project.

## Install

```bash
npx founder-os@latest --init
```

## What It Creates

- `.founderOS/` — Engine (infrastructure, scripts, memory, intelligence)
- `.claude/commands/` — 30+ command namespaces (inbox, briefing, report, etc.)
- `.claude/skills/` — Domain knowledge for each namespace
- `.claude/agents/` — Agent team configurations
- `.claude/CLAUDE.md` — Project instructions for Claude Code

## Commands

| Command | Description |
|---------|-------------|
| `npx founder-os --init` | Install or update |
| `npx founder-os --status` | Check installation |
| `npx founder-os --uninstall` | Remove Founder OS |
| `npx founder-os --version` | Show version |

## After Install

1. Set `NOTION_API_KEY` in your environment
2. Run `gws auth login` for Gmail/Calendar/Drive
3. Open Claude Code and try `/inbox triage`

## Update

Re-run `npx founder-os@latest --init` anytime. Your customizations are preserved.

## License

MIT
