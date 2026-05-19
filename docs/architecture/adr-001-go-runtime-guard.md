# ADR-001 — 是否引入 Go Runtime Guard / Tool Gateway

- 状态: **已决策 — 暂不引入,保留二次评估窗口**
- 日期: 2026-05
- 关联 Issue: #20 (parent: #12)
- 决策人: BeautyOS Core 维护者

## 1. 背景

主系统 `ai-beautyos` 用 TypeScript / Node + Express 承载业务逻辑,目前所有
Agent 支撑层(Tool Server、审计、限流、策略闸)都以 in-process 模块挂在同一个
Node 进程里(参见 `server/_core/tool-server.ts`、`agent-persistence.ts`、
`tenant-context.ts`)。

随着 Hermes 多用户、多工具、多租户压力上来,issue #20 提出:

> 多用户 Hermes、工具调用网关、限流、队列 worker、运维守护等长期运行支撑能力,
> 未来可能更适合用 Go 实现。

本文档评估是否、何时、以什么形态引入 Go。

## 2. 候选职责梳理

| 候选职责 | 当前实现 | Go 化潜在收益 | 评估 |
|---|---|---|---|
| **Tool Gateway** — 认证 / 限流 / 熔断 / 审计 / 转发 | `tool-server.ts` in-process,token-bucket 限流在 `tenant-context.ts` | 单一进程内存占用更低,长连接 / 高并发更稳 | **暂不**,见 §3.1 |
| **Runtime Guard** — 健康巡检 / 资源观测 / 受控脚本 | docker compose healthcheck + ad-hoc 脚本 | 比 Node 守护进程更轻、更"操作系统级" | **可考虑**,但用 Prometheus exporter + node_exporter 已能覆盖大半 |
| **Queue Worker** — 高并发低耦合任务 | outbox 由 Node 进程定时器消费 | Go 的并发模型(goroutine + channel)对 fan-out 友好 | **暂不**,outbox 当前 QPS 远低于瓶颈 |
| **Deployment Agent** — 拉镜像 / 重启 / 回滚 | 直接 `docker compose up -d` + 人工 | Go 易做 systemd-style 守护,跨平台 binary 分发 | **不在 BeautyOS 范围内**,这是 PaaS 层职责 |

## 3. 评估维度

### 3.1 与现有 TypeScript Tool Server 的边界

Tool Server 当前承担三类工作:

1. **业务工具的实现**(查客户、改订单、发企微) — 必须留在 TS,因为它直接复用
   Drizzle schema、tRPC context、tenant RLS 上下文。Go 化会带来重复实现 +
   维护两套 ORM 的成本。
2. **网关侧关注点**(认证、限流、审计、超时、`requiresConfirm` 网关) — 这部分
   可以剥到 Go。
3. **策略闸**(`config/policies/hermes/*.yaml` 装载 + 决策) — YAML + Zod,
   迁 Go 需重写 schema 校验,边际收益低。

**结论:只有 §3.1.2 是 Go 化候选**,且只有在 Tool Server 出现可证伪的性能
瓶颈时才动手。

### 3.2 内存 / 并发压力

Node 进程目前常驻 ~180MB,单 worker、Hermes 调用峰值不超过 5 QPS。瓶颈不在
运行时,而在:

- **LLM 调用延迟**(2–8s/次,Go 改不了)
- **DB I/O**(已是 Drizzle + pg pool,Go 不会更快)
- **YAML / Zod 校验**(已缓存,纳秒级)

**Go 在当前规模下不会带来可测量的性能提升。**

### 3.3 开发复杂度与维护成本

- 团队当前 TS 单技术栈;引入 Go 会让 contributor 心智成本翻倍。
- Tool 定义需要保持 schema 与 TS 一致 → 需要 codegen 或 OpenAPI 共享层。
- Hermes 本身是 Python(已是异构),再叠一个 Go 会让本地起服务的依赖从
  Node + Postgres + Redis 涨到 Node + Postgres + Redis + Go。

### 3.4 部署复杂度

`docker-compose.yml` 当前 3 个服务(web / postgres / redis)。引入 Go gateway
会变成 4 个,且要在 Node 与 Go 之间设计内部 RPC(gRPC?HTTP?)。运维边界
**变多不变清晰**。

### 3.5 安全边界

支持引入 Go 的最强论点:**Tool Server 与业务进程同进程,意味着工具沙箱被同
进程的业务代码污染时无隔离。** Go 单独跑可以做到:

- Tool Gateway 进程不持有业务 DB 写权限,只对受信 Node 业务进程鉴权转发。
- Hermes 直连 Tool Gateway,业务进程只在内网。

但:**同样的隔离用进程边界 + RLS role + network policy 也能做到**,无须换语言。
当前 `beautyos_hermes` Postgres role 已经做了第一层 RLS 隔离。

## 4. 决策

**暂不引入 Go**。理由:

1. 当前规模下,Go 的性能 / 内存优势不可测;
2. 现有 TS Tool Server 通过 RLS role + 进程隔离 + 策略闸已能覆盖安全边界
   90% 的需求;
3. 异构语言栈对单人 / 小团队维护负担显著;
4. issue #20 验收明确允许"输出决策文档"且"短期不重写主系统"。

## 5. 二次评估触发条件(任一即重启此 ADR)

- Node 进程在生产环境出现可重现 OOM / GC 抖动,且 profiling 指向 Tool
  Gateway 路径而非 LLM / DB I/O;
- 单租户并发 Hermes 调用稳定 > 50 QPS,且 token-bucket 限流成为瓶颈;
- 出现需在工具层执行白名单 shell / 拉镜像 / 重启服务的运维需求(此时直接
  写一个 Go binary 比扩 Node 子进程更干净);
- 同进程隔离被审计认定为合规风险(例如等保 / SOC2 要求工具网关进程独立)。

## 6. 短期行动(替代 Go 化的低成本动作)

这些动作能在不引入 Go 的前提下,覆盖 #20 的核心诉求:

- [x] Tool Gateway 边界已经在 `tool-server.ts` 集中化(timeout / dryRun /
      requiresConfirm / 审计)— 维持不动。
- [ ] 把 `tenant-context.ts` 的 token-bucket 从内存换 Redis(已埋 hook),
      为多副本部署做准备 — **issue 待开**。
- [ ] 给 Tool Server 单独开 `/health/tool-server` 子探针,便于未来切独立
      进程时无痛迁移 — **issue 待开**。
- [ ] 把 outbox worker 抽成独立 `node --experimental-...` 子进程或独立
      compose service,先验证"工具/网关进程独立"是否真的需要换语言。

## 7. PoC 范围(若未来决策反转)

若 §5 任一条件触发,最小 PoC 范围:

1. 单一 Go binary,只承担: 鉴权(JWT / mTLS) + token-bucket 限流 +
   `requiresConfirm` 网关 + 审计落 Postgres。**不做工具实现**,工具调用
   一律 reverse-proxy 到 TS 业务进程。
2. 端口前置在 Node web 进程之前,Hermes 只看到 Go gateway。
3. 通过 `tool_invocation` 表对比 Go gateway vs in-process 路径的 p99
   延迟与错误率,数据驱动决定是否扩面。

PoC 验收:p99 不退化、错误率不升、运维心智成本可接受。

## 8. 决策影响

- **代码侧**: 维持单语言(TS)路线,所有 #20 之后的 Agent 支撑层增强继续在
  `server/_core/` 推进。
- **架构文档侧**: `docs/architecture/repo-strategy.md` 已说明双仓库
  (`ai-beautyos` + `beautyos-hermes`)足以承载;无需第三仓库存放 Go gateway。
- **Roadmap**: 从 #12 计划中**移除** Go 必选项,保留为二次评估候选。
