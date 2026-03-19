# P03 Meeting Prep Autopilot -- Deployment Configuration

## Overview

The P03 Meeting Prep Autopilot is a Python 3.12 FastAPI application with LangGraph agent orchestration implementing a parallel-gathering pattern. Four gatherer nodes (Calendar, Gmail, Notion, Drive) execute concurrently, feeding results to a synthesis prep-lead node that assembles meeting prep documents with framework-based talking points. Redis provides prep document caching with a configurable TTL (default 1 hour). The service supports both single-meeting prep and batch prep-today operations processing up to 20 meetings in parallel.

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/meeting/prep` | Single meeting prep with parallel gathering |
| POST | `/api/v1/meeting/prep-today` | Batch prep all today's qualifying meetings |
| GET | `/health` | Liveness probe |
| GET | `/health/ready` | Readiness probe (Redis + external APIs) |
| GET | `/health/sources` | Per-source availability status |

---

## Dockerfile

Recommended `.dockerignore` alongside the Dockerfile:

```text
__pycache__
*.pyc
.git
.env
.env.*
.venv
venv
tests/
*.md
.mypy_cache
.ruff_cache
.pytest_cache
```

Complete multi-stage Dockerfile:

```dockerfile
# ---- Build stage ----
FROM python:3.12-slim AS build

WORKDIR /build

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- Runtime stage ----
FROM python:3.12-slim AS runtime

LABEL maintainer="Founder OS <contact@founderos.dev>"
LABEL service="p03-meeting-prep-autopilot"
LABEL version="1.0.0"
LABEL description="Meeting Prep Autopilot LangGraph agent service"

RUN groupadd -r appuser && useradd -r -g appuser -d /app -s /sbin/nologin appuser

WORKDIR /app

COPY --from=build /install /usr/local
COPY src/ ./src/
COPY langgraph.json ./

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2", "--loop", "uvloop", "--http", "httptools"]
```

---

## .dockerignore

```text
__pycache__
*.pyc
.git
.env
.env.*
.venv
venv
tests/
*.md
.mypy_cache
.ruff_cache
.pytest_cache
```

---

## docker-compose.yml

```yaml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: p03-meeting-prep-autopilot
    env_file:
      - .env
    ports:
      - "${PORT:-8000}:8000"
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health/ready')"]
      interval: 30s
      timeout: 5s
      start_period: 15s
      retries: 3
    networks:
      - p03-net
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: p03-redis
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks:
      - p03-net
    restart: unless-stopped

volumes:
  redis-data:

networks:
  p03-net:
    driver: bridge
```

---

## requirements.txt

```text
fastapi>=0.110,<0.116
uvicorn[standard]>=0.27,<0.35
uvloop>=0.21,<0.22
httptools>=0.6,<0.7
pydantic>=2.0,<3.0
pydantic-settings>=2.7,<3.0
langgraph>=0.2,<0.4
langsmith>=0.1,<0.3
anthropic>=0.30,<1.0
openai>=1.0,<2.0
notion-client>=2.0,<3.0
google-api-python-client>=2.100,<3.0
google-auth>=2.37,<3.0
google-auth-oauthlib>=1.0,<2.0
google-auth-httplib2>=0.2,<1.0
redis[hiredis]>=5.0,<6.0
aiosqlite>=0.19,<1.0
structlog>=23.0,<25.0
httpx>=0.27,<0.29
python-dotenv>=1.0,<2.0
tenacity>=9.0,<10.0
```

---

## Railway Configuration

### railway.json

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn src.main:app --host 0.0.0.0 --port $PORT --workers 2 --loop uvloop --http httptools",
    "healthcheckPath": "/health/ready",
    "healthcheckTimeout": 10,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### Railway Redis addon

Add Redis via the Railway dashboard or CLI:

```bash
# Install Railway CLI if needed
railway login
railway link

# Add Redis addon
railway add --plugin redis

# The REDIS_URL variable is auto-injected into the service environment.
# Verify with:
railway variables
```

### Railway environment variable setup

```bash
# Required variables
railway variables set API_KEY=your-api-key-for-request-auth
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set ZAI_API_KEY=zai-...
railway variables set ZAI_BASE_URL=https://api.zai.com/v1
railway variables set NOTION_API_KEY=ntn_...
railway variables set GOOGLE_CREDENTIALS_JSON='<base64-encoded-json>'
railway variables set GOOGLE_TOKEN_JSON='<base64-encoded-json>'
# REDIS_URL is set automatically by the Redis addon

# Optional
railway variables set LANGSMITH_API_KEY=lsv2_...
railway variables set LANGSMITH_PROJECT=p03-meeting-prep
railway variables set CACHE_TTL=3600
railway variables set LOG_LEVEL=INFO
railway variables set MIN_GATHERERS=2
railway variables set GATHERER_TIMEOUT=30
railway variables set MAX_BATCH_SIZE=20
```

---

## LangGraph/LangSmith Deployment Configuration

### langgraph.json

```json
{
  "dependencies": ["."],
  "graphs": {
    "meeting_prep_autopilot": "./src/graph:build_graph"
  },
  "env": ".env",
  "python_version": "3.12",
  "pip_config_file": "pip.conf",
  "dockerfile_lines": []
}
```

### Graph registration

The LangGraph graph is registered in `src/graph.py` via a `build_graph()` factory function that returns a compiled `StateGraph`. The graph structure:

```
                              +-- calendar_agent --+
                              |                    |
START --> fan_out_gatherers -->+-- gmail_agent -----+--> prep_lead (synthesis) --> END
                              |                    |
                              +-- notion_agent ----+
                              |                    |
                              +-- drive_agent -----+
```

The `fan_out_gatherers` node dispatches all four gatherer nodes in parallel using LangGraph's `Send` API. Each gatherer has a configurable timeout (`GATHERER_TIMEOUT`, default 30s). The `prep_lead` synthesis node waits for all gatherers to complete (or timeout), validates that at least `MIN_GATHERERS` (default 2) returned successfully, then assembles the prep document.

For the `/api/v1/meeting/prep-today` endpoint, the graph is invoked once per qualifying meeting via `asyncio.gather` with a semaphore limiting concurrency to `MAX_BATCH_SIZE` (default 20).

### Talking points framework selection

The prep-lead node auto-selects a talking points framework based on meeting type detected by the calendar-agent:

| Meeting Type | Framework | Purpose |
|--------------|-----------|---------|
| External client | SPIN | Situation-Problem-Implication-Need payoff |
| One-on-one | GROW | Goal-Reality-Options-Will |
| Internal sync | SBI | Situation-Behavior-Impact |
| Ad-hoc | Context-Gathering | Open-ended discovery questions |
| Recurring | Delta-Based | Changes since last meeting |
| Group meeting | Contribution-Mapping | Per-attendee talking points |

### LangSmith Cloud deployment steps

```bash
# Install the LangGraph CLI
pip install langgraph-cli

# Authenticate
export LANGSMITH_API_KEY=lsv2_...

# Create the deployment (first time)
langgraph deploy --config langgraph.json \
  --name p03-meeting-prep-autopilot \
  --description "Meeting Prep Autopilot parallel-gathering agent"

# Update an existing deployment
langgraph deploy --config langgraph.json \
  --name p03-meeting-prep-autopilot \
  --update

# Verify
langgraph list
```

Set environment variables in the LangSmith Cloud dashboard under Deployments > p03-meeting-prep-autopilot > Settings > Environment Variables. All variables from the environment variables reference table below apply.

---

## Environment Variables Reference

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `PORT` | No | `8000` | HTTP server listen port | `8000` |
| `API_KEY` | Yes | -- | API key for authenticating inbound requests | `fos-p03-prod-...` |
| `ANTHROPIC_API_KEY` | Yes | -- | Claude API key for the synthesis (prep-lead) node | `sk-ant-api03-...` |
| `ZAI_API_KEY` | Yes | -- | Z.ai GLM-5 API key for gatherer extraction nodes | `zai-prod-...` |
| `ZAI_BASE_URL` | Yes | -- | Z.ai OpenAI-compatible endpoint URL | `https://api.zai.com/v1` |
| `GOOGLE_CREDENTIALS_JSON` | Yes | -- | Google OAuth2 credentials as base64-encoded JSON | `eyJ0eXBlIjoic2Vy...` |
| `GOOGLE_TOKEN_JSON` | Yes | -- | Google OAuth2 token as base64-encoded JSON | `eyJhY2Nlc3NfdG9r...` |
| `NOTION_API_KEY` | Yes | -- | Notion internal integration token for context reads and prep note writes | `ntn_...` |
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL for prep document caching | `redis://default:pw@host:6379/0` |
| `CACHE_TTL` | No | `3600` | Cache TTL in seconds (1 hour); `0` disables caching | `7200` |
| `LANGSMITH_API_KEY` | No | -- | LangSmith API key for tracing and observability | `lsv2_pt_...` |
| `LANGSMITH_PROJECT` | No | `p03-meeting-prep` | LangSmith project name for trace grouping | `p03-meeting-prep` |
| `LOG_LEVEL` | No | `INFO` | Python logging level | `DEBUG` |
| `MIN_GATHERERS` | No | `2` | Minimum gatherers that must succeed for a valid result | `2` |
| `GATHERER_TIMEOUT` | No | `30` | Timeout per gatherer node in seconds | `45` |
| `MAX_BATCH_SIZE` | No | `20` | Maximum meetings processed in a single prep-today batch | `10` |

---

## Health Check Endpoints

### GET /health -- Liveness

Returns 200 if the process is running. No dependency checks.

**Response (200):**

```json
{
  "status": "ok",
  "service": "p03-meeting-prep-autopilot",
  "version": "1.0.0"
}
```

### GET /health/ready -- Readiness

Checks connectivity to Redis, Notion API, Google Calendar API, and Gmail API. Returns 200 only when all required services are reachable. Each check has a 5-second timeout.

**Response (200 -- all healthy):**

```json
{
  "status": "ready",
  "checks": {
    "redis": { "status": "ok", "latency_ms": 2 },
    "notion_api": { "status": "ok", "latency_ms": 145 },
    "google_calendar_api": { "status": "ok", "latency_ms": 198 },
    "gmail_api": { "status": "ok", "latency_ms": 210 }
  }
}
```

**Response (503 -- degraded):**

```json
{
  "status": "not_ready",
  "checks": {
    "redis": { "status": "ok", "latency_ms": 3 },
    "notion_api": { "status": "ok", "latency_ms": 130 },
    "google_calendar_api": { "status": "error", "error": "401 Unauthorized - token expired" },
    "gmail_api": { "status": "ok", "latency_ms": 198 }
  }
}
```

### GET /health/sources -- Per-Source Availability

Reports which data sources are currently reachable, matching the parallel-gathering agents. Optional sources (Drive) may be `"unavailable"` without impacting readiness.

**Response (200):**

```json
{
  "sources": {
    "google_calendar": { "status": "available", "latency_ms": 195 },
    "gmail": { "status": "available", "latency_ms": 180 },
    "notion": { "status": "available", "latency_ms": 130 },
    "google_drive": { "status": "unavailable", "error": "scope not granted" }
  },
  "available_count": 3,
  "minimum_required": 2
}
```

The `minimum_required` field reflects the `MIN_GATHERERS` configuration (default 2). The service requires at least 2 gatherers to succeed for a valid prep document. Google Calendar and Gmail are always required; Notion is required; Drive is optional. If fewer than `minimum_required` gatherers succeed, the request returns a 422 with a list of failed sources.

---

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/p03-deploy.yml`):

```yaml
name: P03 Meeting Prep Autopilot CI/CD

on:
  push:
    branches: [main]
    paths:
      - "agent_specs/P03-meeting-prep-autopilot/**"
      - "src/**"
      - "Dockerfile"
      - "requirements.txt"
  pull_request:
    branches: [main]
    paths:
      - "agent_specs/P03-meeting-prep-autopilot/**"
      - "src/**"

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/p03-meeting-prep-autopilot

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install lint tools
        run: pip install ruff mypy

      - name: Ruff check
        run: ruff check src/

      - name: Ruff format check
        run: ruff format --check src/

      - name: Mypy
        run: mypy src/ --ignore-missing-imports

  test:
    runs-on: ubuntu-latest
    needs: lint
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-asyncio pytest-cov respx

      - name: Run tests
        env:
          REDIS_URL: redis://localhost:6379/0
          API_KEY: test-api-key
          ANTHROPIC_API_KEY: sk-ant-test-fake
          ZAI_API_KEY: zai-test-fake
          ZAI_BASE_URL: https://api.zai.test/v1
          NOTION_API_KEY: ntn_test_fake
          GOOGLE_CREDENTIALS_JSON: eyJ0eXBlIjoic2VydmljZV9hY2NvdW50IiwicHJvamVjdF9pZCI6InRlc3QifQ==
          GOOGLE_TOKEN_JSON: eyJhY2Nlc3NfdG9rZW4iOiJ0ZXN0In0=
          ENVIRONMENT: test
        run: pytest tests/ -v --cov=src --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          file: coverage.xml

  build:
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to staging
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_STAGING }}
        run: railway up --service p03-meeting-prep-autopilot --environment staging

  deploy-prod:
    runs-on: ubuntu-latest
    needs: deploy-staging
    environment:
      name: production
      # Manual approval gate configured in GitHub environment settings
    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to production
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN_PROD }}
        run: railway up --service p03-meeting-prep-autopilot --environment production

      - name: Verify deployment health
        run: |
          sleep 15
          curl --fail --max-time 10 "${{ secrets.PROD_URL }}/health/ready" || exit 1
```

### Required GitHub Secrets

| Secret | Used In | Description |
|--------|---------|-------------|
| `RAILWAY_TOKEN_STAGING` | deploy-staging | Railway project token for staging environment |
| `RAILWAY_TOKEN_PROD` | deploy-prod | Railway project token for production environment |
| `PROD_URL` | deploy-prod | Production base URL for post-deploy health verification |

All application secrets (`ANTHROPIC_API_KEY`, `ZAI_API_KEY`, `API_KEY`, etc.) are configured directly in Railway, not in GitHub.

---

## Local Development Setup

### Prerequisites

- Python 3.12+
- Docker and Docker Compose (for containerized development)
- Redis 7+ (or Docker handles it)
- API keys for Google (Calendar + Gmail + Drive), Notion, Anthropic, Z.ai

### 1. Clone and configure environment

```bash
cd /Users/lhalicki/coding_projects/founderOS
cd agent_specs/P03-meeting-prep-autopilot

# Copy the example env file and fill in values
cat > .env << 'EOF'
PORT=8000
API_KEY=dev-local-key
ANTHROPIC_API_KEY=sk-ant-api03-...
ZAI_API_KEY=zai-...
ZAI_BASE_URL=https://api.zai.com/v1
GOOGLE_CREDENTIALS_JSON=<base64-encoded-json>
GOOGLE_TOKEN_JSON=<base64-encoded-json>
NOTION_API_KEY=ntn_...
REDIS_URL=redis://localhost:6379/0
CACHE_TTL=3600
LANGSMITH_API_KEY=
LANGSMITH_PROJECT=p03-meeting-prep
LOG_LEVEL=DEBUG
MIN_GATHERERS=2
GATHERER_TIMEOUT=30
MAX_BATCH_SIZE=20
EOF
```

### 2. Running with Docker Compose

```bash
# Build and start all services
docker compose up --build

# Run in background
docker compose up --build -d

# View logs
docker compose logs -f app

# Tear down
docker compose down
```

### 3. Running without Docker (uvicorn directly)

```bash
# Create virtual environment
python3.12 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start Redis separately (or use a local install)
docker run -d --name p03-redis -p 6379:6379 redis:7-alpine

# Load environment and start
export $(grep -v '^#' .env | xargs)
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

For local development without Redis, set `CACHE_TTL=0` to disable caching entirely (the service falls back to no-cache mode, recomputing prep documents on every request). Alternatively, the service auto-detects Redis unavailability and falls back to `aiosqlite` as a local cache store in dev mode.

### 4. Testing endpoints

```bash
# Liveness
curl -s http://localhost:8000/health | python -m json.tool

# Readiness
curl -s http://localhost:8000/health/ready | python -m json.tool

# Source availability
curl -s http://localhost:8000/health/sources | python -m json.tool

# Single meeting prep (by event ID)
curl -s -X POST http://localhost:8000/api/v1/meeting/prep \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-local-key" \
  -d '{
    "event_id": "abc123def456",
    "output": "both"
  }' \
  | python -m json.tool

# Single meeting prep (by time range -- next upcoming)
curl -s -X POST http://localhost:8000/api/v1/meeting/prep \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-local-key" \
  -d '{
    "hours": 4,
    "output": "chat"
  }' \
  | python -m json.tool

# Batch prep all today's meetings
curl -s -X POST http://localhost:8000/api/v1/meeting/prep-today \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-local-key" \
  -d '{
    "skip_internal": true,
    "output": "notion"
  }' \
  | python -m json.tool

# Batch prep with auto-confirm (no interactive event picker)
curl -s -X POST http://localhost:8000/api/v1/meeting/prep-today \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-local-key" \
  -d '{
    "skip_internal": false,
    "auto_confirm": true,
    "output": "both"
  }' \
  | python -m json.tool
```

### 5. Running tests

```bash
source .venv/bin/activate
pip install pytest pytest-asyncio pytest-cov respx

# All tests (external services mocked)
pytest tests/ -v

# With coverage
pytest tests/ -v --cov=src --cov-report=term-missing
```

---

## Production Deployment Checklist

### Pre-deployment

- [ ] All environment variables set in Railway (see Environment Variables Reference)
- [ ] `API_KEY` is a strong, unique value (not reused from other services)
- [ ] `GOOGLE_CREDENTIALS_JSON` and `GOOGLE_TOKEN_JSON` are valid base64-encoded OAuth2 credentials with Calendar, Gmail, and Drive scopes
- [ ] `NOTION_API_KEY` has access to the target workspace and "Meeting Prep Autopilot - Prep Notes" database (or permission to create it)
- [ ] Redis addon provisioned and `REDIS_URL` auto-injected by Railway
- [ ] `LANGSMITH_API_KEY` set for production tracing (strongly recommended)
- [ ] `LOG_LEVEL` set to `INFO` (not `DEBUG`) for production
- [ ] CI/CD pipeline passes: lint, type-check, test, build stages all green

### Deployment verification

- [ ] `GET /health` returns 200 with `"status": "ok"`
- [ ] `GET /health/ready` returns 200 with all required checks passing
- [ ] `GET /health/sources` shows at least `MIN_GATHERERS` sources available
- [ ] `POST /api/v1/meeting/prep` with a known event ID returns a valid prep document
- [ ] `POST /api/v1/meeting/prep-today` returns prep docs for today's meetings
- [ ] LangSmith dashboard shows traces appearing under `p03-meeting-prep` project
- [ ] Redis is accepting connections (visible in readiness check)
- [ ] Unauthenticated requests to API endpoints return 401

### Post-deployment

- [ ] Monitor error rate for first 30 minutes -- should stay under 5%
- [ ] Verify P95 latency for `/api/v1/meeting/prep` stays under 20s
- [ ] Verify P95 latency for `/api/v1/meeting/prep-today` stays under 60s (batch)
- [ ] Confirm cache hit ratio increases after initial cold-start period
- [ ] Check Google API quota usage is within limits
- [ ] Verify Notion "Meeting Prep Autopilot - Prep Notes" database is created/populated correctly
- [ ] Confirm idempotent behavior: re-running prep for same event updates existing record, does not duplicate

---

## Monitoring and Alerts

### LangSmith Dashboard

When `LANGSMITH_API_KEY` is set, every graph invocation is traced end-to-end in LangSmith under the configured project. The dashboard provides:

- **Run traces** -- Full execution graph with per-node timings, inputs, and outputs
- **Gatherer success rates** -- Track which sources succeed vs return `status: "unavailable"` (Drive expected to be optional)
- **Token usage** -- Per-node LLM token consumption (Claude for synthesis/talking points, GLM-5 for extraction)
- **Latency distribution** -- P50/P95/P99 for `/meeting/prep` and `/meeting/prep-today`
- **Error rates** -- Failed runs with full stack traces
- **Framework selection distribution** -- Track which talking point frameworks are selected (SPIN vs GROW vs SBI etc.)

### Key Metrics to Track

| Metric | Source | Purpose |
|--------|--------|---------|
| Request latency (P50, P95, P99) | FastAPI middleware / LangSmith | Ensure single prep stays under 20s, batch under 60s |
| Gatherer success rate per source | LangSmith node traces | Detect API credential expiry or rate limits |
| Cache hit ratio | Redis `INFO stats` (keyspace_hits / total) | Validate TTL tuning; low ratio wastes API calls |
| Token consumption per request | LangSmith | Cost monitoring and budget alerts |
| Error rate (5xx) | Railway metrics / health endpoint | Service reliability |
| Redis memory usage | Redis `INFO memory` | Prevent OOM from unbounded cache growth |
| Google API quota remaining | Google Cloud Console | Preempt quota exhaustion (Calendar + Gmail + Drive) |
| Batch size distribution | Application logs | Track typical prep-today meeting counts |
| Framework selection frequency | LangSmith tags | Detect if meeting type detection is skewing |

### Alerting Thresholds

| Condition | Severity | Action |
|-----------|----------|--------|
| `/health/ready` returns 503 for > 2 minutes | Critical | Page on-call; check Redis and API keys |
| P95 latency > 20s for single prep, 5 consecutive minutes | Warning | Check slow gatherer nodes in LangSmith traces |
| P95 latency > 60s for batch prep-today | Warning | Reduce `MAX_BATCH_SIZE` or check API rate limits |
| Error rate > 5% over 10-minute window | Critical | Check logs; possible API outage or bad deploy |
| Cache hit ratio < 20% over 24 hours | Info | Review `CACHE_TTL` setting; may need increase |
| Redis memory > 80% of available | Warning | Prune stale keys or increase Redis plan |
| Token cost per request > $0.10 (P95) | Warning | Review gatherer extraction prompts for bloat |
| Any required gatherer (Calendar/Gmail/Notion) failing > 25% of runs | Critical | Check specific API credentials and quotas |
| Drive gatherer failing > 75% of runs | Info | Verify Drive OAuth scope is granted |
| Batch prep-today exceeds `MAX_BATCH_SIZE` throttle | Info | User has many meetings; consider increasing limit |

Configure alerts in Railway (Metrics > Alerts) for infrastructure metrics, and in LangSmith (Monitoring > Rules) for agent-level metrics.
