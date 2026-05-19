# Multi-tenant Isolation

BeautyOS treats every Hermes call as **tenant-scoped**. A single Tool
Server / API instance can serve many tenants; isolation is enforced at
the request boundary and in the audit trail, not by spinning up
separate processes per tenant.

## Identity model

Every inbound call from Hermes carries these headers:

| Header           | Required | Meaning                                       |
|------------------|----------|-----------------------------------------------|
| `x-tenant-id`    | yes      | logical tenant (e.g. `salon_001`)             |
| `x-agent-id`     | yes      | Hermes profile id (e.g. `sales_assistant_v1`) |
| `x-user-id`      | no       | end user impersonated by Hermes, if any       |
| `x-request-id`   | yes      | client-generated, opaque, idempotency key     |
| `x-trace-id`     | no       | distributed trace id; defaults to request-id  |
| `authorization`  | yes      | bearer token; not user-facing                 |

Missing required headers => 400. Unknown tenant => 403.

## Authorisation flow (Tool Server)

```
inbound request
  └─► auth middleware
        ├─ verify bearer
        ├─ resolve tenant from token claims
        └─ assert claim.tenant == header tenant
  └─► policy middleware (#24)
        ├─ load Hermes profile
        └─ check allow/forbid for tool
  └─► tool config middleware (#25)
        ├─ enforce risk vs profile.riskTolerance
        └─ enforce requiresConfirm / dryRun gating
  └─► rate-limit middleware
        ├─ key = (tenant, tool)
        └─ token bucket per minute, from tool config
  └─► handler (in-process or proxied)
  └─► audit middleware
        └─ recordAudit({tenant, agent, user, request, trace, tool, outcome})
```

## Data-plane isolation

* **PostgreSQL:** every tenant-scoped table has a `tenant_id` column.
  Drizzle queries always filter on `tenantId` from the request context.
  Cross-tenant access requires an `ops_guard` role and writes a
  high-severity audit entry.
* **Redis:** keys are namespaced `t:<tenant_id>:<...>`. Cross-namespace
  access is a bug.
* **Object storage:** tenant-prefixed paths.
* **Audit log:** the in-memory ring buffer (#21) carries `tenantId` on
  every entry. The forthcoming persistent audit sink will partition by
  tenant at write time so per-tenant exports are cheap.

## Rate limiting

Token bucket, per `(tenant, tool)`, refill rate from
`config/tools/<tool>.yaml#rateLimitPerMin`. Burst = 2× rate. Buckets
live in memory for MVP; Redis-backed when we scale beyond a single
node. Exceeding the limit returns `429 Too Many Requests` with a
`retry-after` header.

## Per-tenant policy override (future)

Out of scope for MVP, but the file layout reserves space:
```
config/policies/hermes/sales-assistant.yaml          # base
config/policies/hermes/overrides/<tenantId>.yaml      # override (future)
```
Override merge rule (when implemented): scalar wins, lists
union-then-dedupe, `forbiddenTools` always union.

## Failure modes & responses

| Condition                         | HTTP | Body code                |
|-----------------------------------|------|--------------------------|
| Missing required header           | 400  | `missing_header`         |
| Bad bearer / tenant mismatch      | 401  | `auth_failed`            |
| Unknown tenant                    | 403  | `tenant_unknown`         |
| Tool forbidden by profile         | 403  | `policy_forbidden`       |
| Tool requires confirm             | 412  | `confirmation_required`  |
| Risk exceeds profile tolerance    | 403  | `risk_too_high`          |
| Rate limit exceeded               | 429  | `rate_limited`           |
| Handler timeout                   | 504  | `tool_timeout`           |

## What MVP ships

The middleware skeleton below is wired into the Tool Server but
intentionally permissive — auth defaults to `tenant=default`,
rate-limit bucket is in-memory and lazy. Hard enforcement (real bearer
verification, Redis buckets, cross-tenant detector) lands in follow-up
issues; the *shape* is locked now so Hermes can be built against it.
