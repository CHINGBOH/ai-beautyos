# AI BeautyOS

Agent-Native 美业经营系统 — 可由 Hermes 常驻 Agent 驱动的 AI CRM 工具系统。

适用于：

- Beauty salons
- Medical beauty clinics
- Wellness stores
- Mother & baby businesses

Focused on:

- customer follow-up
- private-domain operations
- AI-assisted workflows
- operational analytics

---

# Business Problems

Traditional stores often face:

- customer loss
- manual follow-up workflows
- messy customer management
- poor operational visibility
- inconsistent staff follow-up

AI Beauty CRM helps businesses improve operational efficiency and customer retention.

---

# Core Features

## AI Customer Management

- customer tagging
- lifecycle tracking
- follow-up history
- customer segmentation

## AI Follow-up Automation

- reminder workflows
- AI-generated scripts
- silent customer alerts
- automated follow-up tasks

## AI Knowledge Base + RAG

- internal knowledge base
- AI Q&A assistant
- product information retrieval
- staff support tools

## Dashboard & Analytics

- operational dashboard
- conversion analysis
- customer insights
- analytics reports

---

# Workflow

```text
Customer Registration
↓
AI Tag Analysis
↓
Follow-up Reminder
↓
AI-generated Scripts
↓
Customer Engagement
↓
Operational Analytics
```

---

# Use Cases

## Beauty Salons

- customer management
- follow-up automation
- private-domain operations

## Medical Beauty Clinics

- post-treatment follow-up
- AI knowledge base
- customer lifecycle management

## Wellness & Mother-Baby Stores

- long-term customer engagement
- customer analytics
- operational workflows

---

# Tech Stack

| Layer | Tech |
| --- | --- |
| Frontend | React + TypeScript + Vite |
| Backend | Express + Drizzle ORM |
| AI Backend | FastAPI |
| Database | PostgreSQL + pgvector |
| AI | DeepSeek / Qwen / RAG |
| Deploy | Docker + Docker Compose |

---

# 三层架构 (Agent-Native)

```text
┌──────────────────────────────┐
│        Hermes Agent          │  常驻 Agent：理解意图 / 调度工具 / 定时任务
└──────────────┬───────────────┘
               │ MCP / Tool Calls
┌──────────────▼───────────────┐
│    BeautyOS Tool Server       │  工具层：稳定 Schema / 权限审计 / Dry-run
│      /tools/* (port 5001)     │
└──────────────┬───────────────┘
               │ Service Calls
┌──────────────▼───────────────┐
│      BeautyOS Core (port 3000)│  核心层：CRM / 内容 / 知识库 / 企微 / Web
└──────────────────────────────┘
```

**部署原则**：仓库为唯一代码源，生产环境容器化运行，不允许在服务器直接热修未提交代码。

---

# Quick Start

```bash
git clone https://github.com/CHINGBOH/ai-beautyos.git
cd ai-beautyos
cp .env.example .env   # then fill in DATABASE_URL, JWT_SECRET, DEEPSEEK_API_KEY
docker compose up -d
```

Open:

```text
http://localhost:3000
```

## Required environment variables

Minimum set for the service to start (see [`ENV_VARIABLES.md`](./ENV_VARIABLES.md) for the full list and rationale):

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string (`postgresql://...`). pgvector required. |
| `JWT_SECRET` | ≥ 32 chars; signs session cookies. Generate with `openssl rand -base64 48`. |
| `DEEPSEEK_API_KEY` | DeepSeek key; powers the AI chat agent. |

The full template, including optional Qwen / OpenAI / Airtable / Manus-platform variables, lives in [`.env.example`](./.env.example).
