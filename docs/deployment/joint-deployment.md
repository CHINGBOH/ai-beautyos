# Joint Deployment — BeautyOS + Hermes

End-to-end recipe for running the **full** Agent-Native stack on a
single host: web, postgres, redis, custom hermes.

## Files

| File                         | Purpose                                 |
|------------------------------|-----------------------------------------|
| `docker-compose.yml`         | base: web + postgres (single-host MVP)  |
| `docker-compose.full.yml`    | overlay: + redis + hermes               |
| `.env`                       | secrets and tunables (not committed)    |
| `config/`                    | policies, tool configs, hermes profile  |
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
   HERMES_POLICY=sales-assistant     # filename minus .yaml
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

From inside the network (Hermes does this automatically at boot):

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

## What is NOT exposed to the host

* `postgres`  — internal only
* `redis`     — internal only
* `hermes`    — internal only

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
