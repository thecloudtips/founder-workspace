# P20 Client Context Loader -- Deployment Configuration

## Overview

The P20 Client Context Loader is a Python 3.12 FastAPI application with LangGraph agent orchestration implementing a parallel-gathering pattern. Five gatherer nodes (CRM, Email, Docs, Calendar, Notes) execute concurrently, feeding results to a synthesis lead node that assembles a unified client dossier. Redis provides dossier caching with a configurable TTL (default 24 hours).

**Endpoints:**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/client/load` | Full parallel-gathering dossier assembly |
| POST | `/api/v1/client/brief` | Lightweight CRM-only brief |
| GET | `/health` | Liveness probe |
| GET | `/health/ready` | Readiness probe (Redis + APIs) |
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
LABEL service="p20-client-context-loader"
LABEL version="1.0.0"
LABEL description="Client Context Loader LangGraph agent service"

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

## docker-compose.yml

```yaml
version: "3.9"

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: p20-client-context-loader
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
      - p20-net
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: p20-redis
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
      - p20-net
    restart: unless-stopped

volumes:
  redis-data:

networks:
  p20-net:
    driver: bridge
```

---

## requirements.txt

```text
fastapi>=0.115,<0.116
uvicorn[standard]>=0.34,<0.35
uvloop>=0.21,<0.22
httptools>=0.6,<0.7
langchain-core>=0.3,<0.4
langchain-anthropic>=0.3,<0.4
langgraph>=0.3,<0.4
langsmith>=0.2,<0.3
redis>=5.2,<6.0
notion-client>=2.2,<3.0
google-api-python-client>=2.160,<3.0
google-auth>=2.37,<3.0
google-auth-oauthlib>=1.2,<2.0
pydantic>=2.10,<3.0
pydantic-settings>=2.7,<3.0
httpx>=0.28,<0.29
python-dotenv>=1.0,<2.0
structlog>=24.4,<25.0
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
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set ZAI_API_KEY=zai-...
railway variables set NOTION_API_KEY=ntn_...
railway variables set GOOGLE_CREDENTIALS_JSON='{"type":"service_account",...}'
# REDIS_URL is set automatically by the Redis addon

# Optional
railway variables set LANGSMITH_API_KEY=lsv2_...
railway variables set LANGSMITH_PROJECT=p20-client-context-loader
railway variables set CACHE_TTL_HOURS=24
railway variables set LOG_LEVEL=INFO
railway variables set ENVIRONMENT=prod
```

---

## LangSmith Deployment Configuration

### langgraph.json

```json
{
  "dependencies": ["."],
  "graphs": {
    "client_context_loader": "./src/graph:build_graph"
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
START --> [crm_agent, email_agent, docs_agent, calendar_agent, notes_agent] (parallel)
      --> context_lead (synthesis)
      --> END
```

### LangSmith Cloud deployment steps

```bash
# Install the LangGraph CLI
pip install langgraph-cli

# Authenticate
export LANGSMITH_API_KEY=lsv2_...

# Create the deployment (first time)
langgraph deploy --config langgraph.json \
  --name p20-client-context-loader \
  --description "Client Context Loader parallel-gathering agent"

# Update an existing deployment
langgraph deploy --config langgraph.json \
  --name p20-client-context-loader \
  --update

# Verify
langgraph list
```

Set environment variables in the LangSmith Cloud dashboard under Deployments > p20-client-context-loader > Settings > Environment Variables. All variables from the environment variables reference table below apply.

---

## Environment Variables Reference

| Variable | Required | Default | Description | Example |
|----------|----------|---------|-------------|---------|
| `ANTHROPIC_API_KEY` | Yes | -- | Claude API key for the synthesis (context-lead) node | `sk-ant-api03-...` |
| `ZAI_API_KEY` | Yes | -- | Z.ai GLM-5 API key for gatherer extraction nodes | `zai-prod-...` |
| `NOTION_API_KEY` | Yes | -- | Notion internal integration token for CRM reads and dossier cache writes | `ntn_...` |
| `GOOGLE_CREDENTIALS_JSON` | Yes | -- | Google service account or OAuth credentials as a JSON string | `{"type":"service_account","project_id":"..."}` |
| `REDIS_URL` | Yes (prod) | `redis://localhost:6379/0` | Redis connection URL for dossier caching | `redis://default:pw@host:6379/0` |
| `LANGSMITH_API_KEY` | No | -- | LangSmith API key for tracing and observability | `lsv2_pt_...` |
| `LANGSMITH_PROJECT` | No | `p20-client-context-loader` | LangSmith project name for trace grouping | `p20-client-context-loader` |
| `CACHE_TTL_HOURS` | No | `24` | Dossier cache TTL in hours; `0` disables caching | `48` |
| `PORT` | No | `8000` | HTTP server listen port | `8000` |
| `LOG_LEVEL` | No | `INFO` | Python logging level | `DEBUG` |
| `ENVIRONMENT` | No | `prod` | Runtime environment identifier (`dev`, `staging`, `prod`) | `staging` |

---

## Health Check Endpoints

### GET /health -- Liveness

Returns 200 if the process is running. No dependency checks.

**Response (200):**

```json
{
  "status": "ok",
  "service": "p20-client-context-loader",
  "version": "1.0.0"
}
```

### GET /health/ready -- Readiness

Checks connectivity to Redis, Notion API, and Google APIs. Returns 200 only when all required services are reachable. Each check has a 5-second timeout.

**Response (200 -- all healthy):**

```json
{
  "status": "ready",
  "checks": {
    "redis": { "status": "ok", "latency_ms": 2 },
    "notion_api": { "status": "ok", "latency_ms": 145 },
    "google_api": { "status": "ok", "latency_ms": 210 }
  }
}
```

**Response (503 -- degraded):**

```json
{
  "status": "not_ready",
  "checks": {
    "redis": { "status": "ok", "latency_ms": 3 },
    "notion_api": { "status": "error", "error": "401 Unauthorized" },
    "google_api": { "status": "ok", "latency_ms": 198 }
  }
}
```

### GET /health/sources -- Per-Source Availability

Reports which data sources are currently reachable, matching the parallel-gathering agents. Optional sources (Drive, Calendar) may be `"unavailable"` without impacting readiness.

**Response (200):**

```json
{
  "sources": {
    "notion_crm": { "status": "available", "latency_ms": 130 },
    "gmail": { "status": "available", "latency_ms": 180 },
    "google_calendar": { "status": "available", "latency_ms": 195 },
    "google_drive": { "status": "unavailable", "error": "scope not granted" }
  },
  "available_count": 3,
  "minimum_required": 1
}
```

The `minimum_required` field reflects the `minimum_gatherers_required: 1` from the teams config. The service can produce a dossier with partial sources.

---

## CI/CD Pipeline

GitHub Actions workflow (`.github/workflows/p20-deploy.yml`):

```yaml
name: P20 Client Context Loader CI/CD

on:
  push:
    branches: [main]
    paths:
      - "agent_specs/P20-client-context-loader/**"
      - "src/**"
      - "Dockerfile"
      - "requirements.txt"
  pull_request:
    branches: [main]
    paths:
      - "agent_specs/P20-client-context-loader/**"
      - "src/**"

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}/p20-client-context-loader

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
          ANTHROPIC_API_KEY: sk-ant-test-fake
          ZAI_API_KEY: zai-test-fake
          NOTION_API_KEY: ntn_test_fake
          GOOGLE_CREDENTIALS_JSON: '{"type":"service_account","project_id":"test"}'
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
        run: railway up --service p20-client-context-loader --environment staging

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
        run: railway up --service p20-client-context-loader --environment production

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

All application secrets (`ANTHROPIC_API_KEY`, `ZAI_API_KEY`, etc.) are configured directly in Railway, not in GitHub.

---

## Local Development Setup

### Prerequisites

- Python 3.12+
- Docker and Docker Compose (for containerized development)
- Redis 7+ (or Docker handles it)
- API keys for Notion, Google, Anthropic, Z.ai

### 1. Clone and configure environment

```bash
cd /Users/lhalicki/coding_projects/founderOS
cd agent_specs/P20-client-context-loader

# Copy the example env file and fill in values
cat > .env << 'EOF'
ANTHROPIC_API_KEY=sk-ant-api03-...
ZAI_API_KEY=zai-...
NOTION_API_KEY=ntn_...
GOOGLE_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}
REDIS_URL=redis://localhost:6379/0
LANGSMITH_API_KEY=
LANGSMITH_PROJECT=p20-client-context-loader
CACHE_TTL_HOURS=24
PORT=8000
LOG_LEVEL=DEBUG
ENVIRONMENT=dev
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
docker run -d --name p20-redis -p 6379:6379 redis:7-alpine

# Load environment and start
export $(grep -v '^#' .env | xargs)
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
```

For local development without Redis, set `CACHE_TTL_HOURS=0` to disable caching entirely (the service falls back to no-cache mode, recomputing dossiers on every request).

### 4. Testing endpoints

```bash
# Liveness
curl -s http://localhost:8000/health | python -m json.tool

# Readiness
curl -s http://localhost:8000/health/ready | python -m json.tool

# Source availability
curl -s http://localhost:8000/health/sources | python -m json.tool

# Load full client dossier
curl -s -X POST http://localhost:8000/api/v1/client/load \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Acme Corp", "refresh": false}' \
  | python -m json.tool

# Load with cache bypass
curl -s -X POST http://localhost:8000/api/v1/client/load \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Acme Corp", "refresh": true}' \
  | python -m json.tool

# Generate lightweight brief
curl -s -X POST http://localhost:8000/api/v1/client/brief \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Acme Corp"}' \
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

## Monitoring and Alerts

### LangSmith Dashboard

When `LANGSMITH_API_KEY` is set, every graph invocation is traced end-to-end in LangSmith under the configured project. The dashboard provides:

- **Run traces** -- Full execution graph with per-node timings, inputs, and outputs
- **Gatherer success rates** -- Track which sources succeed vs return `status: "unavailable"`
- **Token usage** -- Per-node LLM token consumption (Claude for synthesis, GLM-5 for extraction)
- **Latency distribution** -- P50/P95/P99 for `/client/load` and `/client/brief`
- **Error rates** -- Failed runs with full stack traces

### Key Metrics to Track

| Metric | Source | Purpose |
|--------|--------|---------|
| Request latency (P50, P95, P99) | FastAPI middleware / LangSmith | Ensure dossier assembly stays under 30s target |
| Gatherer success rate per source | LangSmith node traces | Detect API credential expiry or rate limits |
| Cache hit ratio | Redis `INFO stats` (keyspace_hits / total) | Validate TTL tuning; low ratio wastes API calls |
| Token consumption per request | LangSmith | Cost monitoring and budget alerts |
| Error rate (5xx) | Railway metrics / health endpoint | Service reliability |
| Redis memory usage | Redis `INFO memory` | Prevent OOM from unbounded cache growth |
| Google API quota remaining | Google Cloud Console | Preempt quota exhaustion |

### Alerting Thresholds

| Condition | Severity | Action |
|-----------|----------|--------|
| `/health/ready` returns 503 for > 2 minutes | Critical | Page on-call; check Redis and API keys |
| P95 latency > 25s for 5 consecutive minutes | Warning | Check slow gatherer nodes in LangSmith traces |
| Error rate > 5% over 10-minute window | Critical | Check logs; possible API outage or bad deploy |
| Cache hit ratio < 30% over 24 hours | Info | Review `CACHE_TTL_HOURS` setting; may need increase |
| Redis memory > 80% of available | Warning | Prune stale keys or increase Redis plan |
| Token cost per request > $0.15 (P95) | Warning | Review gatherer extraction prompts for bloat |
| Any single gatherer failing > 50% of runs | Warning | Check specific API credentials and quotas |

Configure alerts in Railway (Metrics > Alerts) for infrastructure metrics, and in LangSmith (Monitoring > Rules) for agent-level metrics.
