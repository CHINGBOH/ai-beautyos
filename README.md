<div align="center">

# 💄 AI BeautyOS

**Agent-Native 美业经营系统 — 面向美业、医美、养生与母婴门店的 AI CRM 操作系统**
_An agent-native AI CRM operating system for beauty, medical beauty, wellness, and mother-baby businesses_

<p>
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
<img alt="React" src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black">
<img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white">
<img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white">
<img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL%20%2B%20pgvector-316192?style=for-the-badge&logo=postgresql&logoColor=white">
<img alt="Docker" src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white">
</p>

<p>
<img alt="status" src="https://img.shields.io/badge/status-mvp-orange?style=flat-square">
<img alt="license" src="https://img.shields.io/badge/license-private-lightgrey?style=flat-square">
<img alt="last commit" src="https://img.shields.io/github/last-commit/CHINGBOH/ai-beautyos?style=flat-square">
<img alt="repo size" src="https://img.shields.io/github/repo-size/CHINGBOH/ai-beautyos?style=flat-square">
</p>

</div>

---

## 📖 简介 · About

AI BeautyOS 是一个**Agent-Native 美业经营系统**,聚焦客户跟进、私域运营、知识库问答、经营看板与门店工作流自动化。它面向 beauty salons、medical beauty clinics、wellness stores 与 mother & baby businesses,帮助门店减少人工跟进遗漏、沉淀客户资产并提升复购与转化。

仓库采用三层架构:Hermes Agent 负责意图理解和工具调度,BeautyOS Tool Server 提供稳定工具接口与审计边界,BeautyOS Core 承载 CRM、内容、知识库、企微与 Web 业务能力。

## ✨ 特性 · Features

- �� **客户生命周期管理** — 客户标签、分层、跟进历史与客户分群
- 🤖 **AI 跟进自动化** — 提醒工作流、话术生成、沉默客户预警与任务生成
- 📚 **知识库 + RAG** — 内部知识库、产品资料检索与员工 AI Q&A
- 📊 **经营分析看板** — 转化分析、客户洞察与运营报表
- 🧰 **Hermes 工具层** — `/tools/*` Tool Server 支持 Agent 调度、权限审计与 dry-run
- 🐳 **单机容器化部署** — `docker-compose.yml` 编排 Web、PostgreSQL/pgvector 与 Tool Server

## 🏗️ 架构 · Architecture

```mermaid
flowchart LR
    Hermes["Hermes Agent<br/>意图理解 · 定时任务"] --> Tools["BeautyOS Tool Server<br/>server/tool-server-main.ts · /tools/*"]
    Tools --> Core["BeautyOS Core<br/>server/_core · Express"]
    Web["React + Vite UI<br/>client/"] --> Core
    Core --> DB[("PostgreSQL + pgvector<br/>docker-compose.yml · drizzle/")]
    Core --> AI["AI / RAG Backend<br/>DeepSeek · Qwen · FastAPI"]
    Core --> Shared["共享 Schema<br/>shared/ · drizzle.config.ts"]
    Scripts["scripts/<br/>migrations · knowledge · checks"] -. 运维 .-> Core
```

## 🚀 快速开始 · Quick Start

### 环境要求 · Prerequisites

- Node.js + pnpm
- Docker / Docker Compose
- PostgreSQL + pgvector（Compose 使用 `pgvector/pgvector:pg16`）
- Python 3（用于 `server/requirements.txt` 中的 FastAPI AI 后端能力）

### 安装 · Installation

```bash
# 1. 克隆并进入项目
git clone https://github.com/CHINGBOH/ai-beautyos.git
cd ai-beautyos

# 2. 安装 Node 依赖
pnpm install

# 3. 配置环境变量
cp .env.example .env   # 填写 DATABASE_URL、JWT_SECRET、DEEPSEEK_API_KEY

# 4. 本地开发
pnpm run dev

# 5. (可选) 容器化启动 Web + PostgreSQL + Tool Server
docker compose up -d --build
```

## 📂 目录结构 · Project Structure

```text
ai-beautyos/
├── .github/                 # GitHub 工作流与仓库配置
├── client/                  # React + TypeScript + Vite 前端
├── config/                  # 运行配置
├── data/                    # 业务与知识库数据资产
├── docs/                    # 部署、架构与运营文档
├── drizzle/                 # Drizzle / 数据库迁移资产
├── e2e/                     # 端到端测试
├── patches/                 # 依赖补丁
├── scripts/                 # 数据库、知识库、企微、检查脚本
├── server/                  # Express Core、Tool Server 与 Python AI 后端
├── shared/                  # 前后端共享类型与 schema
├── docker-compose.yml       # 单机生产 Compose
├── docker-compose.full.yml  # 完整部署 Compose
├── package.json             # pnpm 脚本与前端/后端依赖
├── drizzle.config.ts        # Drizzle 配置
└── vite.config.ts           # Vite 构建配置
```

## 🛠️ 技术栈 · Built With

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat&logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)

## 📄 License

私有仓库 · Private repository. 版权归作者所有。

---

<div align="center"><sub>📐 README 遵循 <a href="https://github.com/othneildrew/Best-README-Template">Best-README-Template</a> 标准</sub></div>
