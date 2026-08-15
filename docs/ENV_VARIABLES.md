# Environment Variables

Authoritative reference for AI BeautyOS environment variables.
The runnable template is [`.env.example`](./.env.example); this document
explains each variable, its category, and why it exists. Startup validation is
implemented in [`server/_core/env-validation.ts`](./server/_core/env-validation.ts).

## Categories

| Category | Meaning |
| --- | --- |
| **REQUIRED** | Service refuses to start if missing or invalid |
| **RECOMMENDED** | Has a default, but should be set explicitly in production |
| **OPTIONAL** | Only needed for the related integration |
| **DEV-ONLY** | Must NOT be set in production |

## REQUIRED

### `DATABASE_URL`

- Format: `postgresql://<user>:<password>@<host>:<port>/<database>`
  (the `postgres://` scheme is also accepted)
- The project is **PostgreSQL-only** — MySQL is not supported. The Drizzle
  dialect is fixed to `postgresql` in [`drizzle.config.ts`](./drizzle.config.ts)
  and the `pg` / `postgres` drivers are the only ones bundled.
- The **pgvector** extension is required for knowledge / RAG features
  (embeddings, vector search). It is enabled by `pnpm db:pgvector`
  ([`scripts/enable-pgvector.ts`](./scripts/enable-pgvector.ts)).
  In Docker, use `pgvector/pgvector:pg16` or any Postgres image that ships the
  extension.

### `JWT_SECRET`

- Minimum length: 32 characters (validated at startup).
- Used to sign session cookies and OAuth state tokens.
- Generate with: `openssl rand -base64 48`.
- Rotating this value invalidates all active sessions.

### `DEEPSEEK_API_KEY`

- Powers the AI customer / chat agent (`server/_core/llm.ts` + `chatRouter`).
- Obtain from <https://platform.deepseek.com>.

## RECOMMENDED

### `NODE_ENV`

- Values: `development` | `production`
- Default: `development`
- In `production`, Vite middleware is disabled and the built static assets are
  served from disk.

### `PORT`

- Default: `3000`
- The server currently auto-scans for a free port starting at `PORT` (see
  `findAvailablePort` in `server/_core/index.ts`). This will become a strict
  bind under `NODE_ENV=production` once issue #14 lands, so health probes can
  rely on the configured port.

## OPTIONAL — AI providers (Qwen / OpenAI / embeddings)

The chat path needs DeepSeek; the **knowledge / RAG** path needs an embedding
provider. Configure one of Qwen or OpenAI.

| Variable | Purpose |
| --- | --- |
| `QWEN_API_KEY` | Qwen chat / analytics |
| `QWEN_API_URL` | Override Qwen chat endpoint |
| `QWEN_BASE_URL` | Qwen OpenAI-compatible base URL |
| `QWEN_EMBEDDING_BASE_URL` | Qwen embedding endpoint base URL |
| `QWEN_EMBEDDING_MODEL` | e.g. `text-embedding-v3` |
| `OPENAI_API_KEY` | OpenAI / OpenAI-compatible key |
| `OPENAI_BASE_URL` | OpenAI base URL (override for compatibles) |
| `OPENAI_EMBEDDING_MODEL` | e.g. `text-embedding-3-small` |
| `EMBEDDING_PROVIDER` | `qwen` or `openai` — picks which provider to use |
| `EMBEDDING_MODEL` | Generic fallback embedding model name |
| `DEEPSEEK_API_URL` | Override DeepSeek endpoint |

## OPTIONAL — Airtable (legacy import / sync)

Used by the legacy customer-import path and the admin Airtable setup helper.
WeWork-related Airtable usage is configured through the admin UI; these env
vars only seed the bootstrap script.

| Variable | Purpose |
| --- | --- |
| `AIRTABLE_API_TOKEN` | Personal access token (replaces deprecated `AIRTABLE_API_KEY`) |
| `AIRTABLE_BASE_ID` | Target base ID |

> **Note:** Earlier docs referenced `AIRTABLE_API_KEY`. The canonical name is
> now `AIRTABLE_API_TOKEN` to match Airtable's PAT terminology and the test
> suite. If you have an old `.env`, rename the variable.

## OPTIONAL — Manus / Forge platform

These are auto-injected when the app is deployed on the Manus platform and
should be left empty for self-hosted Docker deployments.

| Variable | Purpose |
| --- | --- |
| `VITE_APP_ID` | App identifier surfaced to the frontend |
| `OAUTH_SERVER_URL` | Upstream OAuth provider |
| `OWNER_OPEN_ID` | Owner identity used by `_core/oauth.ts` |
| `BUILT_IN_FORGE_API_URL` | Forge API endpoint |
| `BUILT_IN_FORGE_API_KEY` | Forge API key |

## DEV-ONLY

### `DISABLE_AUTH`

- Setting `DISABLE_AUTH=1` bypasses authentication for local development.
- **Must never be set in production.** Compose / Kubernetes manifests should
  not propagate it.

## WeChat Work (企业微信)

WeWork tenant credentials (`corpId`, secrets, agent IDs, encoding AES keys,
tokens) are **deliberately not environment variables**. They are stored in
the database and managed via the admin UI / `weworkRouter`.

Bootstrap with `pnpm wework:init`
([`scripts/init-wework-config.ts`](./scripts/init-wework-config.ts)).

## Minimum required secrets for production deployment

```text
DATABASE_URL=postgresql://beautyos:<strong-password>@postgres:5432/beautyos
JWT_SECRET=<openssl rand -base64 48>
DEEPSEEK_API_KEY=<from deepseek dashboard>
NODE_ENV=production
PORT=3000
```

Add Qwen/OpenAI credentials only if the knowledge / RAG features are enabled.

## Security checklist

- `.env` is in `.gitignore`; never commit real values.
- Use a different `JWT_SECRET` per environment.
- Use a secrets manager (Vault / AWS Secrets Manager / GitHub Actions secrets)
  for production; the Compose `.env` workflow is for single-host deployments.
- Rotate `DEEPSEEK_API_KEY` / `QWEN_API_KEY` / `OPENAI_API_KEY` periodically.
