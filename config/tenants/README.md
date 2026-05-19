# Tenant Configuration (Issue #26)

Each file here defines the **business behaviour** for one tenant:
follow-up cadences, customer tiering rules, project recommendation
weights, content style, forbidden words, and compliance disclaimers.

```
config/tenants/
├── _default.yaml      # base; merged FIRST under every tenant
├── <tenant-uuid>.yaml # per-tenant overrides
└── README.md          # this file
```

## Lookup order

```
final = deepMerge(
  _default.yaml,
  <tenant-uuid>.yaml,           # if exists
)
```

Anything missing from the tenant file falls back to `_default.yaml`.
The merged result is validated against `TenantConfigSchema`
(`server/_core/tenant-config.ts`) — invalid configs are rejected
**at load time**, not at request time.

## What goes here vs. elsewhere

| Concern                            | Lives in                          |
|-----------------------------------|------------------------------------|
| Cadence values, tier thresholds   | here (`config/tenants/*.yaml`)     |
| Cross-tenant Hermes behaviour     | `config/policies/hermes/*.yaml`    |
| Tool definitions, risk tier       | `config/tools/*.yaml` + code       |
| Prompt template **text**          | `config/prompts/*.md.tmpl`         |
| Schema / validation               | code (`tenant-config.ts`)          |

## Hermes-driven edits (planned)

Hermes is permitted to **propose** changes to low-risk fields
(content style, follow-up tone, suggestion templates) by writing a
draft to the `tenant_config_drafts` table. A human must approve before
the change is committed back to YAML. High-risk fields
(forbidden_words, compliance disclaimers, risk thresholds) are
read-only to Hermes.

## Reload

Files are loaded lazily and cached in-process. To force a reload
without restarting, hit `POST /system/tenant-config/reload` with the
`admin` role (planned). For now, restart the web container.
