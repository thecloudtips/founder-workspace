#!/usr/bin/env bash
set -euo pipefail

# Founder OS Release Script
# Syncs user-facing content from dev repo to distribution repo (marketplace + plugin structure).
# Usage: ./scripts/release.sh [--dist-dir <path>] [--tag <version>] [--push]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_ROOT="$(dirname "$SCRIPT_DIR")"
DIST_DIR="${DEV_ROOT}/../founder-os"
TAG=""
PUSH=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dist-dir) DIST_DIR="$2"; shift 2 ;;
    --tag) TAG="$2"; shift 2 ;;
    --push) PUSH=true; shift ;;
    -h|--help)
      echo "Usage: ./scripts/release.sh [--dist-dir <path>] [--tag <version>] [--push]"
      echo "  --dist-dir  Path to distribution repo (default: ../founder-os)"
      echo "  --tag       Git tag to create in dist repo (e.g., v1.0.0)"
      echo "  --push      Push commits and tags to dist remote"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Validate
if [[ ! -d "$DIST_DIR/.git" ]]; then
  echo "ERROR: Distribution repo not found at $DIST_DIR"
  echo "Clone it first: git clone <dist-repo-url> $DIST_DIR"
  exit 1
fi

echo "=== Founder OS Release ==="
echo "Dev repo:  $DEV_ROOT"
echo "Dist repo: $DIST_DIR"
echo ""

# Sync plugin content into plugin/ subdirectory
echo "Syncing plugin structure into plugin/..."
for dir in commands skills agents; do
  if [[ -d "$DEV_ROOT/$dir" ]]; then
    mkdir -p "$DIST_DIR/plugin/$dir"
    rsync -a --delete "$DEV_ROOT/$dir/" "$DIST_DIR/plugin/$dir/"
  fi
done

# Sync plugin manifest (NOT marketplace manifest — that lives only in dist repo)
echo "Syncing plugin manifest..."
mkdir -p "$DIST_DIR/plugin/.claude-plugin"
cp "$DEV_ROOT/.claude-plugin/plugin.json" "$DIST_DIR/plugin/.claude-plugin/plugin.json"
# Preserve marketplace.json — do NOT sync .claude-plugin/ from dev root to dist root

# Sync infrastructure into plugin/
echo "Syncing infrastructure..."
rsync -a --delete \
  --exclude='deprecated/' \
  "$DEV_ROOT/_infrastructure/" "$DIST_DIR/plugin/_infrastructure/"

# Generate plugin .mcp.json
echo "Generating plugin .mcp.json..."
cat > "$DIST_DIR/plugin/.mcp.json" << 'MCPEOF'
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "${HOME}/founder-os-workspace"],
      "env": {}
    }
  }
}
MCPEOF

# Generate plugin CLAUDE.md
if [[ -f "$DEV_ROOT/scripts/generate-user-claude-md.sh" ]]; then
  echo "Generating plugin CLAUDE.md..."
  bash "$DEV_ROOT/scripts/generate-user-claude-md.sh" > "$DIST_DIR/plugin/CLAUDE.md"
fi

# Sync getting-started docs
echo "Syncing documentation..."
mkdir -p "$DIST_DIR/docs/getting-started"
rsync -a --delete \
  "$DEV_ROOT/docs/getting-started/" "$DIST_DIR/docs/getting-started/"

# Generate root CLAUDE.md
if [[ -f "$DEV_ROOT/scripts/generate-user-claude-md.sh" ]]; then
  echo "Generating root CLAUDE.md..."
  bash "$DEV_ROOT/scripts/generate-user-claude-md.sh" > "$DIST_DIR/CLAUDE.md"
fi

# Copy README if exists
[[ -f "$DEV_ROOT/README.dist.md" ]] && cp "$DEV_ROOT/README.dist.md" "$DIST_DIR/README.md"

# Copy distribution .gitignore
[[ -f "$DEV_ROOT/.gitignore.dist" ]] && cp "$DEV_ROOT/.gitignore.dist" "$DIST_DIR/.gitignore"

echo ""
echo "Sync complete. Review changes:"
echo "  cd $DIST_DIR && git status"

# Commit in dist repo
cd "$DIST_DIR"
if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  git commit -m "release: sync from dev repo$([ -n "$TAG" ] && echo " ($TAG)")"
  echo "Committed changes in dist repo."
fi

# Tag if requested
if [[ -n "$TAG" ]]; then
  git tag -a "$TAG" -m "Release $TAG"
  echo "Tagged: $TAG"
fi

# Push if requested
if [[ "$PUSH" == true ]]; then
  git push origin main
  [[ -n "$TAG" ]] && git push origin "$TAG"
  echo "Pushed to remote."
fi

echo ""
echo "=== Done ==="
