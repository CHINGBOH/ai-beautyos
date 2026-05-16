# Medical Beauty CRM Landing — 医美客户关系管理落地页系统

面向医美机构的全栈 CRM 系统，集成客户线索管理、知识库 RAG 检索增强生成、AI 智能客服与管理仪表盘，助力机构高效获客与精细化运营。

## 核心功能

- **客户管理** — 线索跟踪、客户画像、跟进记录，全生命周期管理
- **知识库 + RAG** — 基于 pgvector / Qdrant 的向量检索，结合大模型实现智能问答
- **AI 聊天客服** — 接入 DeepSeek / Qwen 大模型，7×24 小时在线应答
- **管理仪表盘** — 数据可视化、运营分析、转化漏斗一览无余
- **第三方集成** — Airtable 数据同步、企业微信消息推送

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 前端 | React + TypeScript + Vite + Tailwind CSS |
| 业务后端 | Node.js + Express + Drizzle ORM |
| AI 后端 | Python + FastAPI |
| 数据库 | PostgreSQL + pgvector + Qdrant |
| 缓存 | Redis |
| 部署 | Docker + Docker Compose |

## 架构

```
用户 → React 前端 → Express（业务 API）→ PostgreSQL + pgvector
                 ↘ FastAPI（AI 服务） → Qdrant + LLM
```

前端为 React SPA，后端采用双服务架构：Express 负责业务逻辑与数据持久化，FastAPI 专注 AI 推理与向量检索。

## 快速启动

```bash
git clone https://github.com/CHINGBOH/medical-beauty-crm-landing.git
cd medical-beauty-crm-landing
cp .env.example .env   # 填写数据库与 API 密钥
docker compose up -d   # 一键启动所有服务
```

启动后访问 `http://localhost:3000` 即可进入系统。

## 安全说明

本仓库 `main` 分支已清理所有敏感凭据。请使用 `.env` 文件与环境变量管理密钥，切勿将真实凭据提交至代码仓库。
