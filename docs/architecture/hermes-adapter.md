# Hermes Adapter Protocol

This document specifies the contract between the custom Hermes
runtime (`beautyos-hermes`) and the BeautyOS Web/API + Tool Server
(`ai-beautyos`). The adapter is **stateless HTTP**. There are no
shared sockets, no shared filesystems, no shared databases.

## Startup sequence (Hermes side)

```
1. Read config/hermes-profile.yaml (this repo) for endpoint + policy refs
2. GET  ${beautyos_base}/system/manifest         # confirm version match
3. GET  ${beautyos_base}/system/tools            # learn tool catalogue
4. GET  ${beautyos_base}/system/permissions      # learn allow/forbid
5. Load own behaviour policy (config/policies/hermes/<mode>.yaml)
6. Resolve effective tool set = policy.allowed ∩ system.tools \ policy.forbidden
7. Enter run loop
```

If step 2 fails or returns a manifest with a major-version mismatch,
Hermes refuses to start. Minor mismatches log a warning and continue.

## Per-turn flow

```
user prompt
  └─► Hermes plans
  └─► Hermes selects tool T from effective set
  └─► Hermes ensures: T allowed, not forbidden, risk within tolerance
  └─► If requiresConfirm: ask human or use dryRun first
  └─► POST ${beautyos_base}/tools/T/invoke
        headers: x-tenant-id, x-agent-id, x-user-id, x-request-id, x-trace-id, authorization
        body:    { input, dryRun?, confirmed? }
  └─► Receive result | error code -> branch deterministically
  └─► Audit (own side) + record in conversation
```

## Endpoints Hermes consumes

| Method | Path                          | Purpose                          |
|--------|-------------------------------|----------------------------------|
| GET    | `/system/manifest`            | Boot-time validation             |
| GET    | `/system/tools`               | Tool catalogue                   |
| GET    | `/system/permissions`         | Allow/forbid for Hermes profiles |
| GET    | `/system/health`              | Liveness; circuit-breaker input  |
| GET    | `/tools`                      | Same shape as /system/tools      |
| GET    | `/tools/:name`                | Full tool config                 |
| POST   | `/tools/:name/invoke`         | Execute                          |

Hermes never calls business REST or tRPC routes directly. If a needed
capability is missing, the answer is "add a tool", not "call the DB".

## Endpoints BeautyOS calls back (none, MVP)

MVP is pull-only: Hermes initiates everything. Push-style events
(webhooks BeautyOS -> Hermes) are out of scope. When they arrive
they'll be specified as a separate `/hermes/*` namespace with the
same identity headers reversed.

## Versioning

* `GET /system/manifest` returns `meta.version: "X.Y.Z"`.
* Hermes pins a minimum compatible major version in
  `config/hermes-profile.yaml#compatible.beautyosManifest`.
* Breaking changes bump major. Hermes refuses to start; ops upgrades
  `beautyos-hermes` and rebuilds the image.
* New tools or new optional fields are minor.

## Fallback behaviour

| Failure                          | Hermes reaction                       |
|----------------------------------|---------------------------------------|
| `/system/manifest` 5xx at boot   | retry with jittered backoff; refuse to enter run loop |
| Tool 5xx                         | one retry; on second failure, return graceful "tool unavailable" to user |
| Tool 429                         | back off `retry-after`; never retry without waiting |
| Tool 412 (confirm required)      | demand human OK; do not auto-confirm |
| Tool 504 (timeout)               | report; do not retry without backoff |
| Manifest major-version mismatch  | crash loudly                          |

## What the adapter is not

* Not a proxy — it does not own request bodies.
* Not a cache — `/system/manifest` cache is BeautyOS-side (30s).
* Not a translator — request/response shapes match Hermes's native
  tool calling format directly. If they diverge in future, the
  translation belongs in `beautyos-hermes`, never here.

## Profile file

The companion profile YAML in this repo
(`config/hermes-profile.yaml`) is the canonical bootstrap input for
`beautyos-hermes`. Copy / mount it into the Hermes image at runtime;
do not duplicate.
