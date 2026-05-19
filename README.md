# AI Beauty CRM

AI customer management system for:

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
