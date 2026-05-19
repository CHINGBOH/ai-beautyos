# AI BeautyOS — Runtime Governance

> "Periodic restart is fallback, not a fix."

This document defines the resource, concurrency, and observability policy
for every BeautyOS runtime service. It is **policy** — concrete code lives
in `Dockerfile`, `docker-compose.yml`, `server/_core/metrics.ts`, and
(later) the Tool Server / Worker images.

## 1. Process boundaries

| Service     | Owns                                          | Talks to                                |
|-------------|-----------------------------------------------|-----------------------------------------|
| Web/API     | HTTP, tRPC, REST, OAuth, WeWork webhook       | Postgres, MCP Tool Server (later)       |
| Tool Server | MCP tools (controlled side effects)           | Postgres, Web/API (read-only loopback)  |
| Worker      | Long-running / scheduled tasks via queue      | Postgres, Tool Server                   |
| Hermes      | Agent runtime (separate repo)                 | MCP Tool Server, System Registry        |

The first deliverable is Web/API only (this PR). Tool Server, Worker, and
the Hermes adapter ship in later issues but inherit the policy below.

## 2. Memory caps

We cap memory at **two layers** so a leak surfaces as a clean OOM and never
spreads to neighbors:

| Layer            | Knob                                  | Default (Web/API) |
|------------------|---------------------------------------|-------------------|
| V8 heap          | `NODE_OPTIONS=--max-old-space-size`   | `512` MiB         |
| Container        | `mem_limit` in compose                | `768m`            |
| Container soft   | `mem_reservation`                     | `256m`            |
| Host             | (operator's job — leave headroom)     | n/a               |

Rule: **`max-old-space-size` < `mem_limit`** so V8 throws
`JavaScript heap out of memory` (with a stack trace) before the kernel
SIGKILLs the process opaquely.

## 3. CPU and restart policy

| Service     | `cpus` | `restart`         | `stop_grace_period` |
|-------------|--------|-------------------|---------------------|
| Web/API     | 1.5    | `unless-stopped`  | 20s                 |
| Postgres    | 1.5    | `unless-stopped`  | 30s                 |
| Tool Server | 1.0    | `unless-stopped`  | 20s (planned)       |
| Worker      | 1.0    | `unless-stopped`  | 60s (planned)       |

`unless-stopped` means: auto-recover on crash, **but** respect an explicit
operator-issued `docker compose stop`. Crash-loops bounded by Docker's
internal backoff.

## 4. Long tasks → queue, not HTTP

HTTP requests must finish in a bounded time. Anything longer goes to a
job queue.

| Aspect              | Policy                                                 |
|---------------------|--------------------------------------------------------|
| Request budget      | `<= 10s` end-to-end at the edge (LLM streaming aside)  |
| Long task           | enqueue → return job id → poll/SSE for status          |
| Queue depth alarm   | `> 1000` pending → page                                |
| Worker concurrency  | per-queue, capped (default 4)                          |
| Job timeout         | per-job, default 5 min, hard kill at 2× timeout        |
| Retry               | exponential backoff, max 5 attempts, then DLQ          |
| Dead letter queue   | inspect manually; never auto-replay without review     |

Implementation lands with the Worker image (later issue). For now the rule
is enforced at code review: if a tRPC procedure can take longer than 10s,
it must accept a job-id pattern.

## 5. Observability endpoints

### `/healthz` (liveness — implemented)
* Returns 200 as long as the event loop runs.
* Body: `{status, service, commit, startedAt, uptimeSec}`.
* **No DB hit.** Probes must not cascade-fail on DB outages.

### `/metrics` (process metrics — implemented in this PR)
* Returns JSON snapshot. Cheap (`process.memoryUsage()` + `perf_hooks`
  histogram). No DB hit.
* Fields:
  * `process.{rssMb, heapUsedMb, heapTotalMb, externalMb, pid, nodeVersion}`
  * `eventLoop.{sampleCount, min/mean/p50/p95/p99/maxMs}`
* Future: a Prometheus text exposition variant under `/metrics?format=prom`
  when we wire up a scrape stack.

### `/readyz` (readiness — planned)
* Will check DB connectivity and any other hard deps. Used to gate traffic
  during rolling deploys. Not implemented yet; `/healthz` is liveness only.

## 6. Alert thresholds (initial)

| Signal                       | Warn          | Page         |
|------------------------------|---------------|--------------|
| `process.rssMb`              | > 600 (5m)    | > 720 (5m)   |
| `eventLoop.p99Ms`            | > 200 (5m)    | > 1000 (1m)  |
| HTTP 5xx rate                | > 1% (5m)     | > 5% (1m)    |
| HTTP p95 latency             | > 1s (5m)     | > 3s (5m)    |
| Queue depth (when present)   | > 200 (5m)    | > 1000 (5m)  |
| Worker job error rate        | > 5% (5m)     | > 20% (5m)   |

Tune after a week of baseline.

## 7. Memory-leak triage

When `rssMb` trends up monotonically:

```
docker compose exec web sh -c \
  "node --inspect=0.0.0.0:9229 dist/index.js"   # ad-hoc, NOT production
```

Then attach Chrome DevTools, take heap snapshots at T+0 and T+10m, compare.
Common culprits: never-released DB cursors, listeners added per request,
unbounded in-memory caches.

**Restarting the container hides the symptom and erases the evidence.** Capture
a snapshot first.

## 8. What's out of scope (for now)

* APM tracing (Tempo / OTel) — separate issue.
* Log aggregation — operator can use `docker compose logs` or whatever
  shipper they prefer.
* Prometheus text format — `/metrics` is JSON until we have a scraper.
* Per-tenant resource quotas — multi-tenant model comes later.
