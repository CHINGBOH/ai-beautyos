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
| Database | PostgreSQL + pgvector + Redis |
| AI | DeepSeek / Qwen / RAG |
| Deploy | Docker + Docker Compose |

---

# Quick Start

```bash
git clone https://github.com/CHINGBOH/medical-beauty-crm-landing.git
cd medical-beauty-crm-landing
cp .env.example .env && docker compose up -d
```

Open:

```text
http://localhost:3000
```

> Note: the canonical package name is `ai-beauty-crm`. The GitHub
> repository rename to `ai-beauty-crm` is an admin-only operation; once
> done, update the clone URL above accordingly.

---

# Screenshots

SaaS product screenshots live in [`docs/screenshots/`](docs/screenshots/).
See the capture checklist and visual style guide in
[SCREENSHOT_GUIDE.md](SCREENSHOT_GUIDE.md).

| View | File |
| --- | --- |
| Login page | `docs/screenshots/01-login.png` |
| Dashboard overview | `docs/screenshots/02-dashboard.png` |
| Customer management | `docs/screenshots/03-customers.png` |
| AI analysis interface | `docs/screenshots/04-ai-analysis.png` |
| Follow-up workflow | `docs/screenshots/05-followup.png` |
| Analytics dashboard | `docs/screenshots/06-analytics.png` |
| Mobile UI | `docs/screenshots/07-mobile.png` |

---

# Documentation

- [Business Positioning](BUSINESS_POSITIONING.md)
- [Branding & Naming Strategy](GITHUB_PROFILE_BRANDING.md)
- [GitHub Profile README Template](PROFILE_README_TEMPLATE.md)
- [Demo Recording Script](DEMO_SCRIPT.md)
- [Screenshot Guide](SCREENSHOT_GUIDE.md)
