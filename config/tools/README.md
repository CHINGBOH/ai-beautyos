# Tool Configuration

Each YAML in this directory configures **one** tool exposed by the
BeautyOS Tool Server / MCP layer. The tool's *implementation* lives in
code (`server/_tools/<name>.ts` or `mcp-server/src/tools/<name>.ts`).
Its *behaviour* lives here.

Loaded at process startup by the Tool Server registry. Surfaced via
`GET /system/tools` (#21).

## Schema (v1.0.0)

```yaml
schemaVersion: "1.0.0"
name:               string   # must equal filename minus .yaml
description:        string   # one-line, Hermes shows this to the user
risk:               low | medium | high | very_high
access:             ro | rw
timeoutMs:          number   # hard timeout per call
maxRows:            number   # rows / items returned per call (0 = N/A)
rateLimitPerMin:    number   # per-tenant, per-tool
requiresConfirm:    boolean  # tool insists on human OK regardless of profile
supportsDryRun:     boolean  # tool can return preview without side-effect
input:              { ...zod-style description, for docs only }
output:             { ...zod-style description, for docs only }
audit:              full | summary | none
tags:               string[] # used by behavior-policy glob matching
```

`requiresConfirm: true` always overrides a policy's looseness. A policy
*can* tighten further by listing the tool in its `confirmRequired`.
