---
description: Generate agent deployment spec documents (PRD, tech-spec, architecture, deployment) for converting a Founder OS plugin into a standalone LangGraph API service
argument-hint: "Plugin prefix (e.g., P05, P12) or plugin folder name"
---

# Generate Agent Deployment Specs

Generate 4 specification documents for converting a Founder OS plugin into a deployable LangGraph-based API service with FastAPI REST endpoints.

## Input

Parse `$ARGUMENTS` for the plugin identifier — either a plugin number (e.g., P05, P12) or a folder name (e.g., founder-os-weekly-review-compiler).

If no argument provided, ask: "Which plugin do you want to generate agent specs for?"

## Step 1: Locate Plugin

Find the plugin directory:
- If a number like `P05` or `#05`, search for `founder-os-*/` directories and match by the plugin number in `.claude-plugin/plugin.json` (`release_week` or `display_name`)
- If a folder name, use directly

Confirm the plugin exists and read its `.claude-plugin/plugin.json` to get the plugin metadata (name, pattern, difficulty, dependencies).

## Step 2: Read All Plugin Source Files

Read these files (skip any that don't exist):

1. `.claude-plugin/plugin.json` — manifest, pattern, dependencies
2. `.mcp.json` — MCP server integrations (maps to Python SDK requirements)
3. `teams/config.json` — agent pipeline topology (if agent teams exist)
4. `teams/agents/*.md` — all agent definitions with output schemas
5. `skills/*/SKILL.md` — all skill files with domain logic
6. `commands/*.md` — all command definitions with args and output formats
7. `tests/integration-test-plan.md` — test coverage (if exists)
8. Matching `_infrastructure/notion-db-templates/*.json` — Notion DB schemas

Collect everything into a structured summary of:
- Plugin name, number, pattern type
- Commands with their arguments and output formats
- Agent pipeline (if teams exist): agents, topology, coordination rules
- Skills: business logic, formulas, scoring rules
- MCP servers: which are required vs optional
- Notion DB schemas
- Data models / output schemas from agent definitions

## Step 3: Read P20 Reference Specs

Read the first 50 lines of each P20 reference document to understand the structure and depth expected:
- `agent_specs/P20-client-context-loader/prd.md`
- `agent_specs/P20-client-context-loader/tech-spec.md`
- `agent_specs/P20-client-context-loader/architecture.md`
- `agent_specs/P20-client-context-loader/deployment.md`

## Step 4: Determine Architecture

Based on the plugin's pattern and MCP servers, determine:

**LangGraph node mapping:**
- Standalone plugins (no agent teams): map commands to a simpler graph (input_validation -> check_cache -> process -> cache_result -> END)
- Pipeline plugins: map each agent to a sequential node chain
- Parallel Gathering plugins: map gatherers to parallel Send() nodes with lead synthesis
- Competing Hypotheses plugins: map to parallel hypothesis nodes with synthesis

**SDK mapping** (MCP server -> Python SDK):
- Notion MCP -> `notion-client`
- Gmail MCP -> `google-api-python-client` (Gmail API)
- Google Calendar MCP -> `google-api-python-client` (Calendar API)
- Google Drive MCP -> `google-api-python-client` (Drive API)
- Slack MCP -> `slack-sdk`
- Filesystem MCP -> Python `pathlib` / `aiofiles`
- WebSearch MCP -> `httpx` + search API

**Endpoint mapping** (commands -> REST API):
- Each slash command becomes a `POST /api/v1/{namespace}/{action}` endpoint
- Command arguments become request body JSON fields
- Command output format becomes response schema

**LLM assignment:**
- Claude API: synthesis, complex reasoning, final output generation
- Z.ai GLM-5: extraction, classification, simpler gatherer tasks
- Fallback routing on 429/500 errors

**Cache strategy:**
- Redis (prod) + SQLite (dev) for fast access
- Notion DB for persistent human-readable storage (if plugin uses Notion caching)

## Step 5: Create Output Directory

```
mkdir -p agent_specs/{plugin-id}-{plugin-short-name}/
```

Example: `agent_specs/P05-weekly-review-compiler/`

## Step 6: Generate All 4 Documents in Parallel

Dispatch 4 parallel subagents (use the Agent tool with `run_in_background: true`), each writing one file. Pass each agent:
- The full plugin source summary from Step 2
- The architecture decisions from Step 4
- Instructions to follow the P20 reference structure

### 6.1 `prd.md` — Product Requirements Document
- Problem statement (plugin locked to Claude Code)
- User stories (API consumer, webhook trigger, automation, monitoring)
- Functional requirements: command-to-endpoint mapping with full param specs
- API contract: request/response JSON schemas derived from command output formats
- Non-functional requirements: latency targets, failure tolerance, rate limits
- Success metrics

### 6.2 `tech-spec.md` — Technical Specification
- Pydantic state schema with all data models from agent output schemas
- LangGraph node definitions: one per agent + cache/validation nodes
- Edge topology with conditional routing
- Tool definitions: Python SDK wrappers for each external service
- Multi-provider LLM config (Claude + Z.ai)
- Caching strategy (Redis + Notion + SQLite)
- Error handling and observability

### 6.3 `architecture.md` — System Architecture
- Component diagram (Mermaid): FastAPI -> LangGraph -> Nodes -> SDKs + Cache + LLMs
- Data flow diagram (Mermaid): full pipeline with parallel/sequential flows
- Sequence diagram (Mermaid): request lifecycle through all nodes
- State schema visual: node read/write matrix
- Node & edge definition tables

### 6.4 `deployment.md` — Deployment Configuration
- Dockerfile (python:3.12-slim, multi-stage, non-root)
- docker-compose.yml (app + redis)
- requirements.txt with all dependencies
- Railway config (railway.json, langgraph.json)
- LangSmith deployment config
- Environment variables table
- Health check endpoints
- CI/CD outline (GitHub Actions)

## Step 7: Verify

After all agents complete:
1. Confirm all 4 files exist with `ls -la agent_specs/{dir}/`
2. Report line counts for each file
3. Summarize what was generated

## Output

Report the generated files:
```
agent_specs/{plugin-id}-{plugin-short-name}/
  prd.md           — Product Requirements Document
  tech-spec.md     — Technical Specification
  architecture.md  — System Architecture
  deployment.md    — Deployment Configuration
```
