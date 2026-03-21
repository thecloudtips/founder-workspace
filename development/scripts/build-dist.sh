#!/usr/bin/env bash
set -euo pipefail

# Founder OS Distribution Build Script
# Assembles the npm package from development/ into dist/template/
# Usage: ./scripts/build-dist.sh [--tag <version>]
#
# This replaces the old release-npm.sh which required a separate dist repo.
# Now everything stays in the monorepo under dist/.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_ROOT="$(dirname "$SCRIPT_DIR")"
REPO_ROOT="$(dirname "$DEV_ROOT")"
DIST_DIR="$REPO_ROOT/dist"
TAG=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --tag) TAG="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: ./scripts/build-dist.sh [--tag <version>]"
      echo "  --tag  Version to set in package.json (e.g., 1.3.0)"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "=== Founder OS Distribution Build ==="
echo "Dev root:  $DEV_ROOT"
echo "Dist dir:  $DIST_DIR"
echo ""

# --- Assemble template/.claude/ ---
echo "Assembling .claude/ template..."
rm -rf "$DIST_DIR/template/.claude/commands" "$DIST_DIR/template/.claude/skills" "$DIST_DIR/template/.claude/agents"
mkdir -p "$DIST_DIR/template/.claude"

for dir in commands skills agents; do
  if [[ -d "$DEV_ROOT/$dir" ]]; then
    cp -R "$DEV_ROOT/$dir" "$DIST_DIR/template/.claude/$dir"
  fi
done

# --- Assemble template/.founderOS/ ---
echo "Assembling .founderOS/ template..."
rm -rf "$DIST_DIR/template/.founderOS/infrastructure" "$DIST_DIR/template/.founderOS/scripts"
mkdir -p "$DIST_DIR/template/.founderOS/infrastructure"
mkdir -p "$DIST_DIR/template/.founderOS/scripts"
mkdir -p "$DIST_DIR/template/.founderOS/config"
mkdir -p "$DIST_DIR/template/.founderOS/context"
mkdir -p "$DIST_DIR/template/.founderOS/auth"
mkdir -p "$DIST_DIR/template/.founderOS/db"

# Infrastructure directories to include
INFRA_DIRS=(
  dispatcher memory preflight intelligence scheduling
  context auth humanize-content scout gws-skills late-skills mcp-configs
)

for dir in "${INFRA_DIRS[@]}"; do
  if [[ -d "$DEV_ROOT/_infrastructure/$dir" ]]; then
    cp -R "$DEV_ROOT/_infrastructure/$dir" "$DIST_DIR/template/.founderOS/infrastructure/$dir"
  fi
done

# Scripts to include (not build/release scripts)
for script in notion-tool.mjs late-tool.mjs package.json; do
  if [[ -f "$DEV_ROOT/scripts/$script" ]]; then
    cp "$DEV_ROOT/scripts/$script" "$DIST_DIR/template/.founderOS/scripts/$script"
  fi
done

# --- Rewrite ${CLAUDE_PLUGIN_ROOT} paths ---
echo "Rewriting \${CLAUDE_PLUGIN_ROOT} paths..."

# In .claude/ files: strip the prefix for same-directory references
find "$DIST_DIR/template/.claude" -name '*.md' -type f -exec \
  sed -i '' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/skills/|skills/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/commands/|commands/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/agents/|agents/|g' \
    {} +

# For commands (depth 2 below .claude/):
find "$DIST_DIR/template/.claude/commands" -name '*.md' -type f -exec \
  sed -i '' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/_infrastructure/|../../../.founderOS/infrastructure/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/scripts/|../../../.founderOS/scripts/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/templates/|../../../.founderOS/templates/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/config/|../../../.founderOS/config/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}|../../../.founderOS|g' \
    {} + 2>/dev/null || true

# For skills (depth 3 below .claude/):
find "$DIST_DIR/template/.claude/skills" -name '*.md' -type f -exec \
  sed -i '' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/_infrastructure/|../../../../.founderOS/infrastructure/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/scripts/|../../../../.founderOS/scripts/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/templates/|../../../../.founderOS/templates/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/config/|../../../../.founderOS/config/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}|../../../../.founderOS|g' \
    {} + 2>/dev/null || true

# For agents (depth 2 below .claude/):
find "$DIST_DIR/template/.claude/agents" -name '*.md' -type f -exec \
  sed -i '' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/_infrastructure/|../../../.founderOS/infrastructure/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/scripts/|../../../.founderOS/scripts/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/templates/|../../../.founderOS/templates/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/config/|../../../.founderOS/config/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}|../../../.founderOS|g' \
    {} + 2>/dev/null || true

# For .founderOS infrastructure files (depth 2: infrastructure/X/file):
find "$DIST_DIR/template/.founderOS/infrastructure" -mindepth 2 -maxdepth 2 \( -name '*.md' -o -name '*.json' \) -type f -exec \
  sed -i '' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/_infrastructure/|../|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/scripts/|../../scripts/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/templates/|../../templates/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/config/|../../config/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}|../../../.founderOS|g' \
    {} + 2>/dev/null || true

# For .founderOS infrastructure files (depth 3: infrastructure/X/Y/file):
find "$DIST_DIR/template/.founderOS/infrastructure" -mindepth 3 -maxdepth 3 \( -name '*.md' -o -name '*.json' \) -type f -exec \
  sed -i '' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/_infrastructure/|../../|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/scripts/|../../../scripts/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/templates/|../../../templates/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/config/|../../../config/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}|../../../../.founderOS|g' \
    {} + 2>/dev/null || true

# --- Post-build validation ---
echo "Validating build output..."

# Check BOTH .claude/ and .founderOS/ for unrewritten plugin root references
REMAINING=$(grep -r 'CLAUDE_PLUGIN_ROOT' "$DIST_DIR/template/" --include='*.md' --include='*.json' -l 2>/dev/null | grep -v '/CLAUDE\.md$' || true)
if [[ -n "$REMAINING" ]]; then
  echo "ERROR: Unrewritten \${CLAUDE_PLUGIN_ROOT} references found in:"
  echo "$REMAINING"
  exit 1
fi

# Check for hardcoded video-studio directory paths (should use ${VIDEO_PATH} in source).
# init.md is allowed exactly 2 references (the --path argument default and parse step).
HARDCODED_VIDEO=$(grep -r '~/.founder-os/video-studio/' "$DIST_DIR/template/" --include='*.md' -l 2>/dev/null || true)
if [[ -n "$HARDCODED_VIDEO" ]]; then
  UNEXPECTED=$(echo "$HARDCODED_VIDEO" | grep -v 'commands/video/init\.md' || true)
  if [[ -n "$UNEXPECTED" ]]; then
    echo "ERROR: Hardcoded ~/.founder-os/video-studio/ paths found in:"
    echo "$UNEXPECTED"
    echo "These should use \${VIDEO_PATH} in source (resolved from state file at runtime)."
    exit 1
  fi
  INIT_COUNT=$(grep -c '~/.founder-os/video-studio/' "$DIST_DIR/template/.claude/commands/video/init.md" 2>/dev/null || echo 0)
  if [[ "$INIT_COUNT" -gt 2 ]]; then
    echo "ERROR: init.md has $INIT_COUNT hardcoded video-studio paths (expected exactly 2)."
    exit 1
  fi
fi

echo "Build validation passed: zero unrewritten references."

# --- Generate CLAUDE.md for end users ---
if [[ -f "$DEV_ROOT/scripts/generate-user-claude-md.sh" ]]; then
  echo "Generating template CLAUDE.md..."
  bash "$DEV_ROOT/scripts/generate-user-claude-md.sh" > "$DIST_DIR/template/.claude/CLAUDE.md"
fi

# --- Bump version if --tag provided ---
if [[ -n "$TAG" ]]; then
  echo "Setting version to $TAG..."
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$DIST_DIR/package.json', 'utf8'));
    pkg.version = '$TAG';
    fs.writeFileSync('$DIST_DIR/package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
fi

echo ""
echo "=== Build complete ==="
echo "Distribution ready at: $DIST_DIR"
[[ -n "$TAG" ]] && echo "Version: $TAG"
echo ""
echo "To publish: cd $DIST_DIR && npm publish"
