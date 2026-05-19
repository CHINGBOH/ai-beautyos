# Dual-Repository Strategy

BeautyOS is split across two Git repositories. This document is the
single source of truth for **what lives where** and **how upstream
Hermes changes flow in**.

## Repositories

### 1. `CHINGBOH/ai-beautyos` (this repo)

The business system. Owns:

* Web / API (express + tRPC + Vite client)
* PostgreSQL schema and migrations (`drizzle/`)
* MCP / Tool Server runtime (`server/_core/tool-server.ts`,
  `mcp-server/` when extracted)
* System Registry (`server/_core/system-registry.ts`)
* System manifest (`docs/system-manifest.yaml`)
* Behaviour policies (`config/policies/`)
* Tool configs (`config/tools/`)
* Hermes adapter contracts (`docs/architecture/hermes-adapter.md`,
  `config/hermes-profile.yaml`)
* Production Dockerfile + compose files
* CI: GHCR image publish
* Hermes **skills** — repo-local definitions Hermes loads at startup

### 2. [`CHINGBOH/beautyos-hermes`](https://github.com/CHINGBOH/beautyos-hermes) (sibling repo, separate)

The custom Hermes runtime. Owns:

* A Git remote pointing at the upstream Hermes project
* The custom **runtime profile** that boots Hermes for BeautyOS
* Adapter glue that wires Hermes to BeautyOS endpoints
  (`/system/*`, `/tools/*`)
* Hermes-side Dockerfile and image publish workflow

`beautyos-hermes` is a thin wrapper. It does **not** fork Hermes
internals; it tracks upstream via rebase.

## What never crosses

| Thing                             | Lives in        | Never goes in        |
|-----------------------------------|-----------------|----------------------|
| Customer / business data schemas  | ai-beautyos     | beautyos-hermes      |
| Tool implementations              | ai-beautyos     | beautyos-hermes      |
| Hermes runtime source             | beautyos-hermes | ai-beautyos          |
| LLM API keys                      | env at deploy   | either repo's code   |
| Hermes upstream patches           | beautyos-hermes | ai-beautyos          |

If a change touches both repos, open coordinated PRs and reference
each other in the body.

## Upstream Hermes sync (beautyos-hermes only)

```
# inside beautyos-hermes
git remote add upstream <hermes-upstream-url>
git fetch upstream
git checkout -b sync/upstream-<date>
git rebase upstream/main
# resolve conflicts in adapter / profile only; never edit upstream files
git push origin sync/upstream-<date>
# open PR; CI rebuilds the Hermes image with new sha
```

Rules:

* **Rebase, do not merge.** Keeps the history a clean ancestor of
  upstream so future syncs are mechanical.
* **Only adapter / profile / Dockerfile diverge from upstream.** Any
  other file change goes upstream first via a PR to the Hermes project.
* **Pin upstream by commit, not branch.** Record the upstream sha in
  `UPSTREAM_HERMES_SHA` build arg so the image is fully reproducible.

## Image naming

Both repos publish to GHCR with the same tagging convention (#16):

| Repo               | Image                                       |
|--------------------|---------------------------------------------|
| ai-beautyos        | `ghcr.io/chingboh/ai-beautyos:sha-<short>`  |
| beautyos-hermes    | `ghcr.io/chingboh/beautyos-hermes:sha-<short>` |

Compose files (#29) reference both by tag and pin via a single
`IMAGE_TAG_*` env so rollback is one variable change.

## Working with both at once

Local dev layout — checked out side by side:

```
projects/
├── ai-beautyos/         # this repo
└── beautyos-hermes/     # sibling
```

The joint compose file (#29) lives in `ai-beautyos`. To run end-to-end:

```
cd ai-beautyos
IMAGE_TAG_WEB=sha-abc IMAGE_TAG_HERMES=sha-def \
  docker compose -f docker-compose.full.yml up -d
```

Hermes consumes BeautyOS via Docker DNS — `http://web:3000/system/*`
and `http://web:3000/tools/*` from inside the compose network. No
public ingress for Tool Server. (See runtime-governance for binding
rules.)

## Why two repos and not one

* Hermes is upstream-tracked. A monorepo would make rebases painful.
* The two have very different release cadences — BeautyOS changes
  daily, Hermes weekly.
* CI scope stays small per repo, image build stays fast.
* Permissions can diverge: business code may have stricter review
  requirements than Hermes adapter tweaks.

## Why not three (or N) repos

Considered: a third repo for shared configs / schemas. Rejected: at
current size, the only shared artefact is the *contract* (manifest +
tool list), which lives in ai-beautyos and is consumed read-only by
Hermes over HTTP. No third repo needed until that contract becomes a
published package.
