# AI BeautyOS — Image Release & Rollback

CI publishes container images to **GitHub Container Registry (GHCR)**
on every push to `main` and on every `v*` tag.

## Image coordinates

```
ghcr.io/chingboh/ai-beautyos:latest        # tip of main
ghcr.io/chingboh/ai-beautyos:sha-<short>   # every commit (immutable)
ghcr.io/chingboh/ai-beautyos:vX.Y.Z        # release tags
```

`sha-<short>` is the **only** tag safe for production pinning — it is
immutable. `latest` moves and must never be used for prod.

## Pulling on the server

```bash
echo "$GHCR_READ_TOKEN" | docker login ghcr.io -u <gh-username> --password-stdin
docker pull ghcr.io/chingboh/ai-beautyos:sha-abcdef0

# .env on the host:
IMAGE_TAG=sha-abcdef0
GIT_COMMIT=abcdef0      # surfaces in /healthz.commit

docker compose pull web
docker compose up -d web
curl -s :3000/healthz | jq .commit   # should equal abcdef0
```

## Rollback

Images are immutable; rollback = re-pull a previous `sha-` tag.

```bash
# Find the previous good commit (e.g. from your release log)
PREV=sha-1234567
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$PREV/" .env
docker compose pull web
docker compose up -d web

# Verify
curl -s :3000/healthz | jq .commit    # should equal 1234567
docker compose ps                     # web -> healthy
```

If the rollback target has DB schema *backwards-incompatible* changes,
restore from `pg_dump` first (see `compose.md`).

## GHCR token requirements

For **CI publishing**: nothing to configure. The workflow uses the
default `GITHUB_TOKEN`; the `permissions: packages: write` block in the
workflow grants the necessary scope.

For **server pulls** (private package):
1. Create a **classic** PAT (or fine-grained PAT with `packages:read`)
   from a deploy bot account.
2. Store it on the server outside the repo (e.g. `/etc/beautyos/ghcr.token`).
3. `docker login ghcr.io` once; Docker caches the credential.

For **public package** (recommended for the OSS path): make the package
public on GHCR — no token needed for pull.

## CI gates

The workflow runs on every PR (build only, no push) so a broken Docker
build fails the PR. On `main` and tags it also publishes.

| Step          | PR | main | tag |
|---------------|----|------|-----|
| install + build | ✓ | ✓ | ✓ |
| docker build  | ✓  | ✓    | ✓   |
| push to GHCR  | ✗  | ✓    | ✓   |
| tag `latest`  | ✗  | ✓    | ✗   |
| tag `sha-X`   | ✗  | ✓    | ✓   |
| tag `vX.Y.Z`  | ✗  | ✗    | ✓   |
