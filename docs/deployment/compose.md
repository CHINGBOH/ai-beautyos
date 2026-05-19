# AI BeautyOS — Compose Deployment

Single-host reference deployment using Docker Compose. Suitable for staging
and small production installs. For multi-node / HA setups use the same image
and wire it up with your orchestrator of choice.

## Recommended host layout

```
/opt/beautyos/
├── ai-beautyos/          # git checkout (this repo)
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── .env              # NOT committed — copy from .env.example
└── backups/              # pg_dump output, rotated by cron
```

Run all `docker compose ...` commands from inside `/opt/beautyos/ai-beautyos/`.

## First-time setup

```bash
cd /opt/beautyos/ai-beautyos
cp .env.example .env
# fill in: JWT_SECRET, DEEPSEEK_API_KEY, POSTGRES_PASSWORD, plus any
# integration creds you actually use (Airtable / WeWork / etc.).

export GIT_COMMIT=$(git rev-parse --short HEAD)
docker compose up -d --build

docker compose ps                  # both services should report `healthy`
curl -s http://127.0.0.1:3000/healthz | jq .
docker compose exec web pnpm db:push      # apply drizzle schema
docker compose exec web pnpm db:pgvector  # enable the vector extension
```

## Day-2 operations

| Task | Command |
|------|---------|
| Tail logs | `docker compose logs -f web` |
| Restart web only | `docker compose restart web` |
| Upgrade to new commit | `git pull && GIT_COMMIT=$(git rev-parse --short HEAD) docker compose up -d --build web` |
| `psql` into the DB | `docker compose exec postgres psql -U beautyos beautyos` |
| Backup DB | `docker compose exec -T postgres pg_dump -U beautyos beautyos \| gzip > ../backups/$(date +%F).sql.gz` |
| Stop everything | `docker compose down` (volume survives) |
| Wipe everything | `docker compose down -v` (DESTROYS data) |

## Boundaries

* **Network** — `beautyos-internal` is a private Compose bridge. Only the
  `web` service publishes a port (`${WEB_PORT}:3000`). Postgres is reachable
  only from inside the network.
* **Data** — only the `postgres-data` named volume holds state. Snapshot
  this for backups.
* **Config** — read only from `.env`. Never bake secrets into the image.
* **Image traceability** — `GIT_COMMIT` is baked at build time, surfaced at
  `GET /healthz`, and set as the image label
  `org.opencontainers.image.revision`.

## When to add Redis / Tool Server / Hermes

This file is intentionally minimal (web + db). Later phases will extend it
with a separate `docker-compose.tools.yml` overlay for the MCP Tool Server,
the System Registry, and the Hermes adapter. Do **not** inline those into
this file — keep the core small enough to reason about.
