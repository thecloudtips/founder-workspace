#!/usr/bin/env bash
set -euo pipefail

# Founder OS NPM Release Script
# Assembles the npm package from the dev repo into the dist repo.
# Usage: ./scripts/release-npm.sh [--dist-dir <path>] [--tag <version>] [--publish]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEV_ROOT="$(dirname "$SCRIPT_DIR")"
DIST_DIR="${DEV_ROOT}/../founder-os-dist"
TAG=""
PUBLISH=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --dist-dir) DIST_DIR="$2"; shift 2 ;;
    --tag) TAG="$2"; shift 2 ;;
    --publish) PUBLISH=true; shift ;;
    -h|--help)
      echo "Usage: ./scripts/release-npm.sh [--dist-dir <path>] [--tag <version>] [--publish]"
      echo "  --dist-dir  Path to founder-os-dist repo (default: ../founder-os-dist)"
      echo "  --tag       Version to set in package.json (e.g., 1.0.0)"
      echo "  --publish   Run npm publish after syncing"
      exit 0 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# Validate
if [[ ! -e "$DIST_DIR/.git" ]]; then
  echo "ERROR: Distribution repo not found at $DIST_DIR"
  echo "Clone it first: git clone <dist-repo-url> $DIST_DIR"
  exit 1
fi

echo "=== Founder OS NPM Release ==="
echo "Dev repo:  $DEV_ROOT"
echo "Dist repo: $DIST_DIR"
echo ""

# Create clean build directory
BUILD_DIR="$(mktemp -d)"
trap "rm -rf $BUILD_DIR" EXIT

echo "Building in $BUILD_DIR ..."

# --- Assemble template/.claude/ ---
echo "Assembling .claude/ template..."
mkdir -p "$BUILD_DIR/template/.claude"

for dir in commands skills agents; do
  if [[ -d "$DEV_ROOT/$dir" ]]; then
    cp -R "$DEV_ROOT/$dir" "$BUILD_DIR/template/.claude/$dir"
  fi
done

# --- Assemble template/.founderOS/ ---
echo "Assembling .founderOS/ template..."
mkdir -p "$BUILD_DIR/template/.founderOS/infrastructure"
mkdir -p "$BUILD_DIR/template/.founderOS/scripts"
mkdir -p "$BUILD_DIR/template/.founderOS/config"
mkdir -p "$BUILD_DIR/template/.founderOS/context"
mkdir -p "$BUILD_DIR/template/.founderOS/auth"
mkdir -p "$BUILD_DIR/template/.founderOS/db"

# Infrastructure directories to include
INFRA_DIRS=(
  dispatcher memory preflight intelligence scheduling
  context auth humanize-content scout gws-skills late-skills mcp-configs
)

for dir in "${INFRA_DIRS[@]}"; do
  if [[ -d "$DEV_ROOT/_infrastructure/$dir" ]]; then
    cp -R "$DEV_ROOT/_infrastructure/$dir" "$BUILD_DIR/template/.founderOS/infrastructure/$dir"
  fi
done

# Scripts to include (not release scripts)
for script in notion-tool.mjs late-tool.mjs package.json; do
  if [[ -f "$DEV_ROOT/scripts/$script" ]]; then
    cp "$DEV_ROOT/scripts/$script" "$BUILD_DIR/template/.founderOS/scripts/$script"
  fi
done

# --- Rewrite ${CLAUDE_PLUGIN_ROOT} paths ---
echo "Rewriting \${CLAUDE_PLUGIN_ROOT} paths..."

# In .claude/ files: strip the prefix for same-directory references
find "$BUILD_DIR/template/.claude" -name '*.md' -type f -exec \
  sed -i '' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/skills/|skills/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/commands/|commands/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/agents/|agents/|g' \
    {} +

# Infrastructure, scripts, templates, config references need depth-aware rewriting
# Commands are at .claude/commands/<ns>/<action>.md (depth 2 below .claude/)
# Skills are at .claude/skills/<ns>/<name>/SKILL.md (depth 3 below .claude/)
# Agents are at .claude/agents/<ns>/<file>.md (depth 2 below .claude/)

# For commands (depth 2 below .claude/):
find "$BUILD_DIR/template/.claude/commands" -name '*.md' -type f -exec \
  sed -i '' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/_infrastructure/|../../../.founderOS/infrastructure/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/scripts/|../../../.founderOS/scripts/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/templates/|../../../.founderOS/templates/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/config/|../../../.founderOS/config/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}|../../../.founderOS|g' \
    {} + 2>/dev/null || true

# For skills (depth 3 below .claude/):
find "$BUILD_DIR/template/.claude/skills" -name '*.md' -type f -exec \
  sed -i '' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/_infrastructure/|../../../../.founderOS/infrastructure/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/scripts/|../../../../.founderOS/scripts/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/templates/|../../../../.founderOS/templates/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/config/|../../../../.founderOS/config/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}|../../../../.founderOS|g' \
    {} + 2>/dev/null || true

# For agents (depth 2 below .claude/):
find "$BUILD_DIR/template/.claude/agents" -name '*.md' -type f -exec \
  sed -i '' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/_infrastructure/|../../../.founderOS/infrastructure/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/scripts/|../../../.founderOS/scripts/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/templates/|../../../.founderOS/templates/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}/config/|../../../.founderOS/config/|g' \
    -e 's|\${CLAUDE_PLUGIN_ROOT}|../../../.founderOS|g' \
    {} + 2>/dev/null || true

# Catch any remaining CLAUDE_PLUGIN_ROOT references (shouldn't happen, but safety net)
REMAINING=$(grep -r 'CLAUDE_PLUGIN_ROOT' "$BUILD_DIR/template/.claude/" --include='*.md' -l 2>/dev/null || true)
if [[ -n "$REMAINING" ]]; then
  echo "WARNING: Unrewritten \${CLAUDE_PLUGIN_ROOT} references found in:"
  echo "$REMAINING"
fi

# --- Generate CLAUDE.md and settings.json ---
# These are already in the dist repo's template/ — copy from there if they exist,
# otherwise they'll be created as part of the initial dist repo setup
if [[ -f "$DIST_DIR/template/.claude/CLAUDE.md" ]]; then
  cp "$DIST_DIR/template/.claude/CLAUDE.md" "$BUILD_DIR/template/.claude/CLAUDE.md"
fi
if [[ -f "$DIST_DIR/template/.claude/settings.json" ]]; then
  cp "$DIST_DIR/template/.claude/settings.json" "$BUILD_DIR/template/.claude/settings.json"
fi

# --- Copy CLI and package files ---
echo "Copying CLI and metadata..."
mkdir -p "$BUILD_DIR/bin"
cp -R "$DIST_DIR/bin/"* "$BUILD_DIR/bin/" 2>/dev/null || true
cp -R "$DIST_DIR/lib" "$BUILD_DIR/lib" 2>/dev/null || true

for file in package.json README.md LICENSE CHANGELOG.md .npmignore; do
  [[ -f "$DIST_DIR/$file" ]] && cp "$DIST_DIR/$file" "$BUILD_DIR/$file"
done

# --- Bump version if --tag provided ---
if [[ -n "$TAG" ]]; then
  echo "Setting version to $TAG..."
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('$BUILD_DIR/package.json', 'utf8'));
    pkg.version = '$TAG';
    fs.writeFileSync('$BUILD_DIR/package.json', JSON.stringify(pkg, null, 2) + '\n');
  "
fi

# --- Sync to dist repo ---
echo "Syncing to dist repo..."
rsync -a --delete \
  --exclude='.git' \
  --exclude='.git/' \
  --exclude='node_modules' \
  --exclude='tests' \
  "$BUILD_DIR/" "$DIST_DIR/"

# Restore tests dir (not part of release build but should stay in dist repo)
# Tests are for development, not included in npm package

# --- Commit in dist repo ---
cd "$DIST_DIR"
if [[ -n "$(git status --porcelain)" ]]; then
  git add -A
  COMMIT_MSG="release: sync from dev repo"
  [[ -n "$TAG" ]] && COMMIT_MSG="release: v$TAG"
  git commit -m "$COMMIT_MSG"
  echo "Committed changes in dist repo."
fi

# --- Tag ---
if [[ -n "$TAG" ]]; then
  git tag -a "v$TAG" -m "Release v$TAG"
  echo "Tagged: v$TAG"
fi

# --- Publish ---
if [[ "$PUBLISH" == true ]]; then
  echo "Publishing to npm..."
  npm publish
  echo "Published founder-os@$(node -e "console.log(require('./package.json').version)")"
fi

echo ""
echo "=== Done ==="
echo "Dist repo: $DIST_DIR"
[[ -n "$TAG" ]] && echo "Version: $TAG"
