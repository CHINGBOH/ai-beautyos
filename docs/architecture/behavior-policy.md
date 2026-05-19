# Hermes Behavior Policy

A **Behavior Policy** is a profile that shapes what Hermes does when
running against BeautyOS. Profiles do not grant capability — code and
tool config do that. Profiles only **restrict, gate, and style**
already-allowed behaviour.

Files: `config/policies/hermes/<mode>.yaml`.

Hermes starts under exactly one policy. The policy is referenced from
the Hermes startup profile (`config/hermes/profile.yaml`, see #28).

## Schema (v1.0.0)

```yaml
schemaVersion: "1.0.0"
mode:             string   # e.g. sales_assistant, content_operator
goal:             string   # one-paragraph description Hermes can quote
riskTolerance:    very_low | low | medium | high
allowedTools:     string[] # exact tool names, or glob "module:*"
forbiddenTools:   string[] # same syntax. forbidden wins over allowed.
confirmRequired:  string[] # subset of allowedTools that still need OK
outputFormat:
  preferred:      string   # e.g. structured_then_prose
  language:       string   # e.g. zh-CN
  maxBullets?:    number
  maxParagraphs?: number
constraints:
  maxToolCallsPerTurn:  number
  maxTurnsPerSession:   number
  hardTimeoutSec:       number   # per tool call
  forbidExternalSend:   boolean  # WeCom / SMS / email
  forbidShellExec:      boolean  # always true; explicit for clarity
  forbidRawSql:         boolean  # always true; explicit for clarity
```

## Resolution

When Hermes wants to call tool `T`:

1. Reject if `T` ∈ `forbiddenTools`.
2. Reject if `T` ∉ `allowedTools` and `T` does not match any
   `allowedTools` glob.
3. If `T` ∈ `confirmRequired`, demand human confirmation (or `dry-run=true`).
4. Reject if `tool.risk > riskTolerance` (see Tool Server tool config, #25).
5. Enforce `constraints.hardTimeoutSec`.
6. Audit the call with `{ tenantId, agentId, userId, traceId, requestId, mode, tool, outcome }`.

## Same tool, different profile, different behaviour

`generate_followup_suggestion`:

| Mode              | Allowed? | Confirm? | Tone preset             |
|-------------------|----------|----------|-------------------------|
| sales_assistant   | yes      | yes      | warm_concierge          |
| content_operator  | no       | n/a      | n/a                     |
| business_analyst  | no       | n/a      | n/a                     |
| ops_guard         | no       | n/a      | n/a                     |

The tool itself implements one behaviour. The profile decides whether
to expose it and how to gate it.

## Hermes self-introspection

Hermes must be able to answer "what are my boundaries right now?". A
runtime endpoint `/system/permissions` (#21) exposes the union of policy
+ tool-config. When asked, Hermes paraphrases that JSON rather than
making things up.

## Out of scope (later issues)

* Per-tenant policy overrides (#18).
* Live policy reload without restart.
* Multiple policies per session ("escalate mode") — explicitly deferred;
  in MVP, restart with a new profile.
