# Founder OS Workspace

This is the root workspace for Founder OS development. It contains two git submodules and shared workflow state.

## Structure

```
founder-workspace/
  ├── founderOS/           # Development repo (git submodule)
  ├── founder-os-dist/     # Distribution repo (git submodule)
  ├── .beads/              # Issue tracking (shared across repos)
  ├── .claude/             # Claude Code project settings
  ├── .claude-flow/        # Swarm orchestration state
  └── .swarm/              # Swarm memory and indexes
```

## Submodules

- **founderOS**: `https://github.com/thecloudtips/founderOS.git` — Main development repo with commands, skills, agents, and infrastructure.
- **founder-os-dist**: `https://github.com/thecloudtips/founder-os-dist.git` — Distribution repo for the published plugin.

## Working with Submodules

```bash
# After cloning workspace
git clone --recurse-submodules <workspace-url>

# Pull updates (includes submodules)
git pull --recurse-submodules

# Update submodule to latest
cd founderOS && git pull origin main && cd ..
git add founderOS && git commit -m "Update founderOS submodule"
```

## Beads Issue Tracking

Beads lives at the workspace root (`.beads/`) and tracks issues across both repos. Use `bd` commands from the workspace root.

## Project Instructions

For detailed project conventions, architecture, and development workflow, see `founderOS/CLAUDE.md`.
