# Prompt Templates (Issue #26)

Each `.md.tmpl` file is a system / role / user prompt skeleton with
typed variable holes. The loader (`server/_core/tenant-config.ts:
renderPrompt`) substitutes `{{var.path}}` references from:

  - `tenant`   — merged tenant config (see `config/tenants/`)
  - `profile`  — Hermes behaviour profile (see `config/policies/hermes/`)
  - `session`  — current chat session metadata
  - `ctx`      — caller-provided extras (RAG hits, customer info, etc.)

Substitution rules:
  - `{{var.path}}`         literal lookup; missing path raises at load
  - `{{var.path | default: "..."}}` fallback if missing or empty
  - `{{# section}} ... {{/ section}}` rendered only if truthy
  - `{{! comment }}`       stripped from output

Templates are **validated on load** — every `{{...}}` reference must
resolve against the schema or have a `default:` clause. This catches
typos at deploy time, not at request time.

## Layout

```
config/prompts/
├── system/
│   ├── sales-assistant.md.tmpl
│   ├── business-analyst.md.tmpl
│   └── content-operator.md.tmpl
├── snippets/
│   ├── compliance-block.md.tmpl   # shared chunks
│   └── content-style.md.tmpl
└── README.md
```
