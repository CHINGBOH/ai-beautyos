# AI BeautyOS — Static / Dynamic Configuration Architecture

> Code defines capability. Config defines behavior. Parameters decide outcome.
> Permissions decide boundary. Audit records fact.

## Why this split exists

A pure-code system is rigid (every policy tweak = redeploy). A
pure-config system is unsafe (anyone with config write access owns the
system). BeautyOS therefore separates the two on purpose.

## Four layers

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Static Core           — code, never config              │
│    schemas, permission checks, audit, risk gates, tool API │
├─────────────────────────────────────────────────────────────┤
│ 2. Dynamic Config        — version-controlled YAML / JSON  │
│    follow-up cadences, prompt templates, recommendation     │
│    weights, tool limits, tenant policies, Hermes policies   │
├─────────────────────────────────────────────────────────────┤
│ 3. Runtime Parameters    — per-call arguments              │
│    customer id, page size, dry-run flag                    │
├─────────────────────────────────────────────────────────────┤
│ 4. Audit Trail           — append-only fact log            │
│    who/what/when/result/traceId/requestId                  │
└─────────────────────────────────────────────────────────────┘
```

A change at layer N must never bypass the boundary at layer N-1.
*Config cannot grant capability the code does not implement. Parameters
cannot expand what config allows.*

## What MUST stay in code (static)

| Concern                              | Lives in                            |
|--------------------------------------|-------------------------------------|
| Database schema                      | `drizzle/schema.ts`                 |
| Permission check (auth / RBAC)       | `server/_core/*` (tRPC procedures)  |
| Audit recording                      | (planned) `server/_core/audit.ts`   |
| Risk-tier enforcement (confirm/dry-run gate) | Tool Server runtime         |
| Tool input/output schema definition  | `mcp-server/src/tools/*.ts`         |
| Encryption / signing primitives      | server/_core/* (not exported)       |

These cannot be made configurable. If you find yourself wanting to,
write a new code path with explicit feature flags instead.

## What SHOULD be configurable (dynamic)

| Concern                            | Lives in                              |
|------------------------------------|---------------------------------------|
| Sales follow-up cadences           | `config/policies/follow-up.yaml`     |
| Prompt templates                   | `config/prompts/*.yaml`              |
| Recommendation scoring weights     | `config/policies/recommendation.yaml`|
| Per-tool limits (timeout, maxRows) | `config/tools/*.yaml` (#25)          |
| Per-tenant quotas / policy         | `config/tenants/<id>.yaml` (#18)     |
| Hermes behavior policy             | `config/policies/hermes/*.yaml` (#24)|
| Customer-tier rules                | `config/policies/customer-tiers.yaml`|

## Directory layout

```
config/
├── system/        # cross-cutting system defaults
├── tenants/       # per-tenant overrides (gitignored when sensitive)
├── policies/      # behavioural rules; safe to commit
│   └── hermes/    # Hermes Behavior Policies (#24)
├── tools/         # per-tool runtime limits (#25)
└── prompts/       # LLM prompt templates
```

## Loading order (last wins)

```
1. compiled-in defaults              (server/_core/config-defaults.ts)
2. config/system/<file>.yaml         (env-independent baseline)
3. config/policies/<file>.yaml       (behaviour)
4. config/tools/<file>.yaml          (tool limits)
5. config/tenants/<tenantId>.yaml    (per-tenant override, when applicable)
6. environment variables             (last-resort knob, mostly secrets)
```

All layers are **validated against a Zod schema** at boot. A bad config
fails startup loud rather than running with silently-wrong behaviour.

## Change-management requirements

| Change kind                          | How it's tracked              |
|--------------------------------------|-------------------------------|
| Code change (Static Core)            | PR + review + CI              |
| `config/policies/*` change           | PR + review + CI              |
| `config/tools/*` change              | PR + review + CI              |
| `config/tenants/*` change            | PR + audit log entry          |
| Runtime parameter (per-call arg)     | Tool call audit log           |

Every config file change is a git commit. There is no "edit in
production UI" path for safety-relevant config (tool limits, policies).

## What Hermes is allowed to change

Hermes may *propose* changes to:
* `config/prompts/*` (its own prompts)
* `config/policies/follow-up.yaml` (subject to confirm)
* per-tenant non-safety policy fields

Hermes may **never** modify:
* Static Core code
* Tool risk levels
* Tenant quotas (only humans + ops)
* Permission boundaries
* Audit configuration

Proposed changes go through the same PR + review flow — Hermes opens a
PR, a human merges it.

## Worked example — follow-up suggestion

A "generate a follow-up message" capability is composed of all four layers:

| Layer       | Concrete artifact                                          |
|-------------|------------------------------------------------------------|
| Code        | `mcp-server/src/tools/generate-followup-suggestion.ts`     |
| Config      | `config/policies/follow-up.yaml` (cadence + tier rules)    |
|             | `config/prompts/followup.yaml` (LLM prompt template)       |
|             | `config/tools/generate-followup-suggestion.yaml` (limits)  |
| Parameter   | Tool call: `{customerId, tone?}`                           |
| Audit       | `audit_log` row: tool, args, tenantId, agentId, traceId    |

A marketing operator can change *cadence* and *tone defaults* by editing
`config/policies/follow-up.yaml`. They cannot make the tool send WeCom
messages — that capability is gated in code and not exposed in MVP.
