<div align="center">

# 💄 AI BeautyOS

**Agent-Native 美业经营系统 — 面向美业、医美、养生与母婴门店的 AI CRM 操作系统**  
*An agent-native AI CRM operating system for beauty, medical beauty, wellness, and mother-baby businesses*

<p>
<img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white">
<img alt="React" src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black">
<img alt="FastAPI" src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white">
<img alt="PostgreSQL" src="https://img.shields.io/badge/PostgreSQL%20%2B%20pgvector-316192?style=for-the-badge&logo=postgresql&logoColor=white">
</p>

<p>
<img alt="status" src="https://img.shields.io/badge/status-active-success?style=flat-square">
<img alt="architecture" src="https://img.shields.io/badge/architecture-Agent--Native-blue?style=flat-square">
<img alt="license" src="https://img.shields.io/badge/license-MIT-green?style=flat-square">
</p>

</div>

---

## 📖 简介 · About

**AI BeautyOS** 是一个 **Agent-Native 美业经营系统**，聚焦客户跟进、私域运营、知识库问答、经营看板与门店工作流自动化。面向美容院、医美诊所、养生馆与母婴门店，帮助门店减少人工跟进遗漏、沉淀客户资产并提升复购与转化。

---

## 🏛️ 核心目录架构 · Repository Layout

```text
ai-beautyos/
├── client/               # 🎨 前端 React 交互界面与门店工作台
├── server/               # 🚀 后端 FastAPI 业务路由与 Hermes Agent 运行时核心
├── shared/               # 🔄 前后端共享的数据契约与 TypeScript 类型定义
├── docs/                 # 📚 核心架构设计、领域模型与 Agent 工具规范
├── main.ts               # ⚡ 顶级显式主入口 (引导核心服务启动)
├── requirements.txt      # 📦 后端与 AI 依赖清单
├── package.json          # ⚙️ 前后端基础依赖声明
├── tsconfig.json         # ⚙️ TypeScript 语言配置
└── README.md             # 🌟 项目门面与快速上手
```

---

## 🚀 快速开始 · Quickstart

### 1. 安装依赖
```bash
# 后端 Python 依赖
pip install -r requirements.txt

# 前端与 Node 依赖
pnpm install
```

### 2. 启动核心系统
```bash
npx tsx main.ts
```
