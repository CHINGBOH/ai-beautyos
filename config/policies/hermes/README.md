# Hermes Behavior Policies

Each YAML in this directory defines one **behaviour profile** for the
custom Hermes agent. Hermes is started under exactly one profile at a
time. Profiles never grant capability — they restrict / shape what the
Tool Server already allows.

See `docs/architecture/behavior-policy.md` for the schema spec.

Profiles shipped:
* `sales-assistant.yaml`    — outbound-leaning, customer-facing tone
* `content-operator.yaml`   — Xiaohongshu content generation focus
* `business-analyst.yaml`   — analytics + reporting, read-only
* `ops-guard.yaml`          — system inspection, no business changes
