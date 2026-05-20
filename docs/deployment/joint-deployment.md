# Joint Deployment — BeautyOS + Hermes

End-to-end recipe for running the **full** Agent-Native stack on a
single host: web, postgres, redis, custom hermes.

## Files

| File                         | Purpose                                 |
|------------------------------|-----------------------------------------|
| `docker-compose.yml`         | base: web + postgres (single-host MVP)  |
| `docker-compose.full.yml`    | overlay: + redis + hermes               |
| `.env`                       | secrets and tunables (not committed)    |
| `config/`                    | policies, tool configs, Hermes profiles |
| `docs/system-manifest.yaml`  | system map Hermes reads at boot         |

## Prerequisites

1. Both images published to GHCR (see #16):
   - `ghcr.io/chingboh/ai-beautyos:sha-<short>`
   - `ghcr.io/chingboh/beautyos-hermes:sha-<short>`
2. `.env` populated. Required additions for the overlay:
   ```
   IMAGE_TAG=sha-abc123              # web image tag
   IMAGE_TAG_HERMES=sha-def456       # hermes image tag
   BEAUTYOS_TENANT_ID=salon_001
   HERMES_PROFILE=hermes-app-profile.yaml
   HERMES_POLICY=content-operator    # filename minus .yaml
   ```

## Bring up

```
docker compose \
  -f docker-compose.yml \
  -f docker-compose.full.yml \
  pull
docker compose \
  -f docker-compose.yml \
  -f docker-compose.full.yml \
  up -d
docker compose ps
```

Expect all four services to reach `healthy`:

```
NAME                 STATUS
beautyos-postgres    Up (healthy)
beautyos-redis       Up (healthy)
beautyos-web         Up (healthy)
beautyos-hermes      Up (healthy)
```

## Smoke test

From the host:

```
# Web is up
curl -s http://localhost:3000/healthz | jq

# System map is reachable
curl -s http://localhost:3000/system/manifest | jq '.meta.version'

# Tool catalogue
curl -s http://localhost:3000/tools | jq '.tools | length'
```

From inside the network (Hermes-App does this automatically at boot):

```
docker compose exec hermes wget -q -O - http://web:3000/system/manifest
```

## Rollback

One env var, restart Hermes only:

```
sed -i 's/^IMAGE_TAG_HERMES=.*/IMAGE_TAG_HERMES=sha-previous/' .env
docker compose -f docker-compose.yml -f docker-compose.full.yml up -d hermes
```

For web:

```
sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=sha-previous/' .env
docker compose -f docker-compose.yml -f docker-compose.full.yml up -d web
```

Postgres and Redis are stateful; rolling them back is a restore op, not
a tag swap.

## Hermes runtime split

The `hermes` service in `docker-compose.full.yml` is **Hermes-App**. It mounts
`config/hermes-app-profile.yaml` by default and reaches BeautyOS through:

```text
BEAUTYOS_BASE=http://web:3000
BEAUTYOS_TOOL_BASE=http://tool-server:5001
```

Hermes-App is internal-only and should not receive GitHub tokens, SSH keys,
direct `DATABASE_URL`, or raw shell authority. It is for business queries,
reports, content drafts, and confirmed/dry-run Tool Server writes.

**Hermes-Ops is not this container.** Run Hermes-Ops from a workstation, CI,
self-hosted runner, or operations host with `config/hermes-ops-profile.yaml`.
Its deployment authority should flow through GitHub Actions or the whitelisted
runbooks below.

## What is NOT exposed to the host

* `postgres`  — internal only
* `redis`     — internal only
* `hermes`    — internal only; this is Hermes-App, not Hermes-Ops

Only `web` publishes a host port (default 3000). Put a TLS-terminating
reverse proxy in front. The Tool Server lives inside `web` for MVP
(#17) — it inherits this same boundary.

## Splitting the Tool Server (future)

When Tool Server is extracted to its own image (issue follow-up), add:

```yaml
services:
  tool-server:
    image: ghcr.io/chingboh/ai-beautyos-tool-server:${IMAGE_TAG_TS}
    networks: [beautyos-internal]
    # internal only; no ports
```

Then change Hermes's `BEAUTYOS_BASE` to point at `tool-server` for
`/tools/*` while keeping `web` for everything else. The manifest and
behaviour policies do not change.

## Operational rules

* **Pin every image by sha tag.** Never run `latest` in production
  except as a debug alias.
* **One env var rollback per service.** If a rollback needs code
  changes, the deployment process is broken.
* **Postgres + Redis are pets, not cattle.** Their volumes are the
  source of truth. Back up `postgres-data` daily.
* **The web container is cattle.** Kill and re-create freely.
* **Hermes is cattle.** Same.
* **Tenant data never crosses container boundaries except via the
  documented HTTP contract.**

## Hermes-Ops runbooks

Hermes-Ops must use `run_whitelist_script` instead of arbitrary shell. The
current whitelisted operational runbooks are:

| Script | Purpose |
|--------|---------|
| `ops-preflight.sh` | Inspect repo state, compose syntax, GitHub CLI status, and required deployment files |
| `ops-github-deploy-status.sh` | List recent GitHub workflow runs for the image build workflow |
| `ops-trigger-image-build.sh` | Trigger the GitHub image build workflow via `gh workflow run` |
| `ops-local-compose-status.sh` | Inspect local compose services, health endpoint, and recent web logs |
| `ops-local-compose-deploy.sh` | Pull latest Git branch and rebuild/restart `web` + `tool-server` |

Every runbook invocation through Tool Server requires confirmation. For local
server deployment, `ops-local-compose-deploy.sh` also refuses to run unless the
host environment sets:

```bash
BEAUTYOS_OPS_ALLOW_LOCAL_DEPLOY=1
```

Dry-runs are safe and return the planned command shape:

```json
{
  "dryRun": true,
  "input": { "name": "ops-local-compose-deploy.sh" }
}
```

Actual deploys still require:

```json
{
  "confirmed": true,
  "input": { "name": "ops-local-compose-deploy.sh" }
}
```
