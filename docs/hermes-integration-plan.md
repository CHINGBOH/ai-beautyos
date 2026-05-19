# Hermes Integration Plan

This branch is for integrating AI BeautyOS with Hermes as an agent-native operating layer. The goal is not to rewrite BeautyOS around Hermes, but to expose stable system capabilities that Hermes can discover, reason about, and call safely.

## Branch

```text
feature/hermes-integration
```

Use this branch for:

- deployment baseline work
- system manifest and registry work
- MCP / Tool Server experiments
- Hermes skill tap definitions
- runtime guard and memory architecture research

Keep `main` focused on stable app behavior and only merge back after each stage has a deployable checkpoint.

## Architecture Direction

```text
beautyos-hermes
  -> Hermes SKILL.md workflows
  -> BeautyOS MCP / Tool Server
  -> BeautyOS System Registry
  -> BeautyOS Core Services
  -> PostgreSQL / pgvector / object storage / audit logs
```

Hermes should not directly write the production database or execute unbounded shell commands. It should operate through explicit tools, policies, dry-run flows, and audit logs.

## Repository Strategy

Use a two-repository model:

```text
CHINGBOH/ai-beautyos
  -> BeautyOS business app
  -> Web/API
  -> MCP / Tool Server
  -> System Registry
  -> BeautyOS Hermes skill tap
  -> deployment-side contracts

CHINGBOH/beautyos-hermes
  -> customized Hermes runtime profile
  -> BeautyOS adapter
  -> Hermes startup and policy defaults
  -> Hermes container image
  -> upstream Hermes sync notes
```

Do not copy Hermes runtime source directly into this repository as the long-term integration model. Keep upstream Hermes traceable and isolate BeautyOS-specific runtime customizations in `beautyos-hermes`.

The adapter contract between the two repositories should be:

```text
BeautyOS exposes:
  /system/manifest
  /system/modules
  /system/tools
  /system/permissions
  /system/health
  /system/deployment
  /system/audit/recent
  MCP / Tool Server endpoint

beautyos-hermes provides:
  beautyos profile
  default MCP connection
  default skill tap installation
  safety policy defaults
  startup health checks
```

## Repo Additions

Recommended new areas:

```text
docs/
  hermes-integration-plan.md
  system-manifest.yaml

hermes-skills/
  skills/
    beautyo-system-map/
      SKILL.md
    beautyo-deploy-runbook/
      SKILL.md
    beautyo-crm-operator/
      SKILL.md
    beautyo-content-operator/
      SKILL.md

mcp-server/
  index.ts
  tools/
  schemas/
  auth/

config/
  tools/
  policies/
  tenants/
  prompts/
```

## Execution Stages

### Stage A: Deployment Baseline

Issues: #13, #14, #15, #19, #16

Deliverables:

- PostgreSQL-oriented environment configuration
- Dockerfile for Web/API
- `/healthz` endpoint
- docker-compose single-server runtime
- memory and concurrency limits
- GHCR image publishing

### Stage B: System Map and Dynamic Configuration

Issues: #22, #23, #21, #24

Deliverables:

- static system manifest
- dynamic configuration model
- System Registry JSON endpoints
- Hermes behavior policy model

### Stage C: Tool Server and Hermes Skills

Issues: #17, #25, #18

Deliverables:

- BeautyOS MCP / Tool Server MVP
- tool metadata and risk configuration
- tenant/user/agent/request tracing
- Hermes skill tap for operating BeautyOS safely

### Stage C2: Customized Hermes Adapter

Issues: #27, #28, #29

Deliverables:

- `beautyos-hermes` repository strategy
- upstream Hermes sync process
- BeautyOS adapter protocol
- Hermes `beautyos` startup profile
- multi-service deployment model
- independent rollback path for BeautyOS and Hermes

### Stage D: Memory and Long-Running Operation

Future issues should cover:

- Hermes memory layering
- pgvector/Qdrant semantic memory evaluation
- historical run summaries and failure postmortems
- context budget strategy
- skill sprawl governance using Hermes-native progressive disclosure

### Stage E: Runtime Guard Evaluation

Issue: #20

Deliverables:

- decision document for Go Runtime Guard / Tool Gateway
- clear boundary between TypeScript business services and Go operational support
- no main-system rewrite unless supported by measured pressure

## Design Rules

- Code defines capability.
- Config defines behavior.
- Runtime params define the current result.
- Policy defines what is allowed.
- Audit logs record what happened.

Static core:

- database schema
- tool input/output schema
- permission checks
- audit event format
- risk-level mechanism
- dry-run and confirm flow

Dynamic config:

- prompt templates
- follow-up rules
- tool limits
- tenant policies
- behavior modes
- recommendation weights
- content style presets

## Hermes Integration Rules

- Use Hermes native skills for runbooks and workflows.
- Use MCP / HTTP tools for executable BeautyOS capabilities.
- Use System Registry as Hermes' first system-discovery endpoint.
- Do not store business data in Hermes skills.
- Do not expose secrets through manifests or registry endpoints.
- Require dry-run or confirmation for external messaging and destructive actions.
- Keep each SKILL.md focused; avoid one huge universal skill.

## First Checkpoint

The first useful checkpoint is not full Hermes automation. It is:

1. Web/API runs from containers.
2. System manifest exists.
3. Hermes can read a BeautyOS skill that tells it where to inspect the system.
4. Tool Server has at least one safe read-only tool.
5. Every tool call has traceable metadata.

## Joint Deployment Target

The repository strategy is two repositories. The runtime shape is not fixed to two containers. It should be decomposed by service boundaries and can grow over time.

Candidate server shape:

```text
server
  reverse-proxy
  beautyos-web
  beautyos-tool-server
  beautyos-worker
  beautyos-system-registry
  beautyos-hermes
  hermes-runtime-guard
  postgres
  redis
  metrics/logging
```

Deployment principles:

- `ai-beautyos` and `beautyos-hermes` are separate repositories, but each repository may produce one or more service images.
- Each production image tag should map to its source repository and Git commit SHA.
- `beautyos-hermes` should talk to BeautyOS over Docker network / localhost-only endpoints.
- Tool Server, PostgreSQL, and Redis should not be exposed directly to the public internet.
- BeautyOS services and Hermes services must be independently upgradeable and independently rollbackable where practical.
- Do not hard-code the deployment model as "two containers"; keep it as a multi-service runtime.
