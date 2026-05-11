# 美业CRM系统 - 技术栈骨架落地文档

## 一、系统架构概览

### 1.1 技术栈组成

#### 前端技术栈
- **框架**: React 19 + TypeScript
- **构建工具**: Vite
- **路由**: Wouter
- **样式**: Tailwind CSS 4
- **UI组件库**: shadcn/ui
- **API通信**: tRPC Client
- **状态管理**: React Hooks (useState, useEffect)
- **Markdown渲染**: Streamdown

#### 后端技术栈
- **运行时**: Node.js
- **Web框架**: Express
- **API框架**: tRPC Server
- **数据库**: MySQL/TiDB
- **ORM**: Drizzle ORM
- **定时任务**: node-cron
- **XML解析**: xml2js
- **加密**: crypto (Node.js内置)
- **HTTP客户端**: axios

#### AI集成
- **客户端AI客服**: DeepSeek API (`deepseek-chat`模型)
- **后台数据分析**: Qwen API (`qwen-plus`模型)

#### 第三方集成
- **CRM数据同步**: Airtable API
- **企业微信**: 企业微信API + Webhook回调
- **未来扩展**: 天气API、小红书API

---

## 二、核心功能模块

### 2.1 前端咨询拓客模块

#### 功能清单
1. **AI智能客服对话**
   - 文件: `client/src/pages/Chat.tsx`
   - 功能: 实时对话、自动提取客户信息、知识库检索
   - API: `trpc.chat.createSession`, `trpc.chat.sendMessage`

2. **落地页线索收集**
   - 文件: `client/src/pages/Home.tsx`
   - 功能: 表单提交、来源追踪、SEO优化
   - API: `trpc.chat.convertToLead`

3. **客户管理看板**
   - 文件: `client/src/pages/DashboardCustomers.tsx`
   - 功能: 客户列表、筛选、详情查看
   - API: `trpc.customers.list`, `trpc.customers.getById`

4. **数据分析看板**
   - 文件: `client/src/pages/Analytics.tsx`
   - 功能: 线索报告、营销建议、客户画像生成
   - API: `trpc.analytics.*`

#### 数据流
```
用户访问 → AI对话 → 信息提取 → 线索创建 → Airtable同步 → 客户画像分析
```

---

### 2.2 后端客户画像模块

#### 功能清单
1. **心理分析引擎**
   - 文件: `server/psychology-analyzer.ts`
   - 功能: 自动分析客户心理类型（恐惧型/贪婪型/安全型/敏感型）、预算评估、客户分层
   - 触发条件: 对话达到5条或10条消息

2. **数据分析服务**
   - 文件: `server/qwen.ts`, `server/routers/analytics.ts`
   - 功能: 线索数据分析、营销策略生成、客户画像生成
   - API端点: `/api/trpc/analytics.*`

3. **客户数据管理**
   - 文件: `server/routers/customers.ts`, `server/db.ts`
   - 功能: 客户CRUD、统计数据查询
   - 数据库表: `leads`, `conversations`, `messages`

#### 数据流
```
对话数据 → 心理分析 → 标签提取 → 客户分层 → 数据库存储 → 报表生成
```

---

### 2.3 企业微信集成模块 ⭐

#### 功能清单
1. **配置管理**
   - 文件: `server/routers/wework.ts`, `server/wework-db.ts`
   - 功能: 企业微信配置保存、Access Token管理
   - 数据库表: `weworkConfig`
   - 当前配置:
     - 企业ID: `ww3ceb59d6b08f5957`
     - SECRET: `AStMpkL4CaQ-alCPk_PrCBCxm-5_2h3mxFfIBXyGVZc`
     - 模式: 真实模式（非模拟）

2. **联系我二维码**
   - 文件: `server/routers/wework.ts`, `server/wework-api.ts`
   - 功能: 创建/列表/删除"联系我"二维码
   - API: `trpc.wework.createContactWay`, `trpc.wework.listContactWays`
   - 数据库表: `weworkContactWay`
   - 真实API: `POST /cgi-bin/externalcontact/add_contact_way`

3. **客户管理**
   - 文件: `server/routers/wework.ts`, `server/wework-db.ts`, `server/wework-api.ts`
   - 功能: 外部联系人列表、详情查询
   - 数据库表: `weworkCustomers`
   - 真实API: `GET /cgi-bin/externalcontact/get`

4. **消息管理**
   - 文件: `server/routers/wework.ts`, `server/wework-api.ts`
   - 功能: 发送消息、消息历史查询
   - 数据库表: `weworkMessages`
   - 真实API: `POST /cgi-bin/message/send` (文本消息)

5. **Webhook回调处理** ⭐ (已实现)
   - 文件: `server/wework-webhook.ts`
   - 功能: 
     - URL验证 (GET `/api/wework/webhook`)
     - 事件接收 (POST `/api/wework/webhook`)
     - 客户添加事件处理 (`change_external_contact`)
     - 消息事件处理 (`text`, `image`)
   - 事件流程:
     ```
     企业微信 → Webhook回调 → 签名验证 → XML解析 → 事件处理 → 数据库存储
     ```

#### Webhook实现细节

**URL验证流程**:
1. 企业微信发送GET请求: `/api/wework/webhook?msg_signature=xxx&timestamp=xxx&nonce=xxx&echostr=xxx`
2. 服务器验证签名（简化版，生产环境需完善）
3. 返回 `echostr` 完成验证

**事件接收流程**:
1. 企业微信发送POST请求: `/api/wework/webhook?msg_signature=xxx&timestamp=xxx&nonce=xxx`
2. 请求体为XML格式的加密数据
3. 服务器验证签名
4. 解析XML获取事件类型和数据
5. 根据事件类型调用相应处理函数
6. 返回 `success` 告知企业微信已接收

**支持的事件类型**:
- `change_external_contact` → `add_external_contact`: 客户添加
- `change_external_contact` → `del_external_contact`: 客户删除
- `text`: 文本消息
- `image`: 图片消息

**文件结构**:
```
server/
├── wework-api.ts          # 真实企业微信API调用
├── wework-webhook.ts      # Webhook回调处理
├── wework-db.ts           # 数据库操作
├── wework-mock.ts         # 模拟API（用于测试）
└── routers/
    └── wework.ts          # tRPC路由
```

---

## 三、数据库架构

### 3.1 核心表结构

#### 客户相关表
- **leads**: 线索表（客户基础信息、画像数据）
- **conversations**: 对话会话表（心理类型、标签、预算等级）
- **messages**: 消息表（对话内容）

#### 企业微信相关表
- **weworkConfig**: 企业微信配置表
  - `corpId`: 企业ID
  - `corpSecret`: 应用Secret
  - `agentId`: 应用AgentID
  - `token`: 回调Token
  - `encodingAesKey`: 回调加密密钥
  - `accessToken`: Access Token（缓存）
  - `tokenExpiresAt`: Token过期时间
  - `isMockMode`: 是否模拟模式（0=真实，1=模拟）

- **weworkContactWay**: 联系我二维码表
- **weworkCustomers**: 外部联系人表
- **weworkMessages**: 企业微信消息表

#### 其他表
- **users**: 用户表
- **knowledgeBase**: 知识库表
- **triggers**: 触发器表
- **triggerExecutions**: 触发器执行记录表
- **xiaohongshuPosts**: 小红书帖子表
- **xiaohongshuComments**: 小红书评论表

### 3.2 数据关系
```
leads ←→ conversations ←→ messages
weworkCustomers ←→ weworkMessages
weworkContactWay → weworkCustomers (通过state字段关联)
```

---

## 四、API接口设计

### 4.1 tRPC路由结构

```
appRouter
├── chat.*          # AI对话相关
│   ├── createSession
│   ├── sendMessage
│   └── convertToLead
├── customers.*     # 客户管理
│   ├── list
│   ├── getById
│   └── getStats
├── analytics.*     # 数据分析
│   ├── generateLeadsReport
│   ├── generateMarketingSuggestions
│   ├── generateCustomerProfile
│   └── getOverview
└── wework.*        # 企业微信
    ├── getConfig
    ├── saveConfig
    ├── createContactWay
    ├── listContactWays
    ├── deleteContactWay
    ├── listCustomers
    ├── getCustomer
    ├── sendMessage
    └── listMessages
```

### 4.2 RESTful接口

```
GET  /api/wework/webhook    # Webhook URL验证
POST /api/wework/webhook     # Webhook事件接收
GET  /api/oauth/callback     # OAuth回调
```

---

## 五、部署与配置

### 5.1 环境变量

```env
# 数据库
DATABASE_URL=mysql://user:password@host:port/database

# AI服务
DEEPSEEK_API_KEY=sk-xxx
DEEPSEEK_API_URL=https://api.deepseek.com
QWEN_API_KEY=xxx
QWEN_API_URL=https://dashscope.aliyuncs.com

# Airtable
AIRTABLE_API_KEY=xxx
AIRTABLE_BASE_ID=xxx

# 企业微信（已配置）
WEWORK_CORP_ID=ww3ceb59d6b08f5957
WEWORK_CORP_SECRET=AStMpkL4CaQ-alCPk_PrCBCxm-5_2h3mxFfIBXyGVZc
WEWORK_AGENT_ID=xxx  # 需要在企业微信管理后台获取
WEWORK_TOKEN=xxx     # 需要在企业微信管理后台配置回调时设置
WEWORK_ENCODING_AES_KEY=xxx  # 需要在企业微信管理后台配置回调时设置

# 服务器
PORT=3000
NODE_ENV=production
```

### 5.2 依赖安装

```bash
# 核心依赖（已安装）
npm install express @trpc/server drizzle-orm mysql2
npm install react react-dom wouter
npm install tailwindcss @tailwindcss/vite

# AI集成（已安装）
npm install axios

# 企业微信Webhook（需要安装）
npm install xml2js @types/xml2js

# 定时任务（可选）
npm install node-cron

# Airtable（已安装）
npm install airtable
```

### 5.3 初始化企业微信配置

运行初始化脚本：
```bash
npm run dev  # 先启动服务器（确保数据库连接正常）
# 然后在另一个终端运行：
tsx scripts/init-wework-config.ts
```

或者通过tRPC API设置：
```typescript
await trpc.wework.saveConfig.mutate({
  corpId: "ww3ceb59d6b08f5957",
  corpSecret: "AStMpkL4CaQ-alCPk_PrCBCxm-5_2h3mxFfIBXyGVZc",
  isMockMode: 0, // 0=真实模式
});
```

### 5.4 数据库迁移

```bash
# 使用Drizzle生成迁移
npm run db:push
```

---

## 六、开发工作流

### 6.1 前端开发
```bash
cd client
npm run dev  # 启动Vite开发服务器
```

### 6.2 后端开发
```bash
npm run dev  # 启动Express服务器（带热重载）
```

### 6.3 企业微信Webhook测试

**本地测试**:
1. 使用ngrok等工具暴露本地端口: `ngrok http 3000`
2. 在企业微信管理后台配置回调URL: `https://your-ngrok-url.ngrok.io/api/wework/webhook`
3. 设置Token和EncodingAESKey（需要在数据库 `weworkConfig` 表中保存）
4. 触发测试事件（添加客户、发送消息）

**生产环境**:
1. 确保服务器有公网IP或域名
2. 配置HTTPS（企业微信要求）
3. 在企业微信管理后台配置回调URL: `https://your-domain.com/api/wework/webhook`
4. 设置Token和EncodingAESKey

**Mock模式测试**:
- 开发环境默认可使用Mock模式
- 在数据库 `weworkConfig` 表中设置 `isMockMode = 1`
- 使用 `trpc.wework.mockAddCustomer` API测试客户添加

---

## 七、代码文件清单

### 7.1 企业微信相关文件

```
server/
├── wework-api.ts          # ✅ 真实企业微信API调用
├── wework-webhook.ts      # ✅ Webhook回调处理
├── wework-db.ts           # ✅ 数据库操作
├── wework-mock.ts         # ✅ 模拟API
└── routers/
    └── wework.ts          # ✅ tRPC路由（已更新使用真实API）

server/_core/
└── index.ts               # ✅ 已添加Webhook路由注册

scripts/
└── init-wework-config.ts  # ✅ 初始化配置脚本
```

### 7.2 核心功能文件

```
server/
├── routers/
│   ├── chat.ts            # AI对话路由
│   ├── customers.ts        # 客户管理路由
│   ├── analytics.ts        # 数据分析路由
│   └── wework.ts           # 企业微信路由
├── psychology-analyzer.ts  # 心理分析引擎
├── deepseek.ts            # DeepSeek API集成
├── qwen.ts                # Qwen API集成
├── airtable.ts            # Airtable集成
└── db.ts                  # 数据库访问层

client/src/pages/
├── Chat.tsx               # AI客服对话页面
├── Home.tsx               # 落地页
├── DashboardCustomers.tsx # 客户管理看板
└── Analytics.tsx          # 数据分析看板
```

---

## 八、扩展计划

### 8.1 短期优化
- [x] 完善企业微信Webhook的真实API集成（替换Mock）
- [ ] 实现AES解密（企业微信回调数据加密）
- [ ] 添加自动回复功能（AI生成回复）
- [ ] 完善客户删除事件处理
- [ ] 添加AgentId配置（用于消息发送）

### 8.2 中期扩展
- [ ] 自动化营销触发器（时间/行为/天气触发）
- [ ] 小红书内容生成与发布
- [ ] 客户画像可视化图表
- [ ] 多租户支持

### 8.3 长期规划
- [ ] 移动端App（React Native）
- [ ] 数据分析大屏
- [ ] 智能推荐系统
- [ ] 多渠道整合（微信、抖音、小红书）

---

## 九、技术债务与注意事项

### 9.1 当前限制
1. **企业微信Webhook**: 签名验证为简化版，生产环境需使用官方SDK或完善AES解密
2. **AES解密**: 当前未实现完整解密，需要添加 `wework-js-sdk` 或类似库
3. **AgentId配置**: 需要在企业微信管理后台获取并配置
4. **错误处理**: 部分API错误处理不够完善
5. **日志系统**: 缺少结构化日志（建议使用Winston或Pino）

### 9.2 安全建议
1. 生产环境必须启用HTTPS
2. Webhook签名验证必须严格实现
3. 敏感配置应使用环境变量或密钥管理服务
4. 数据库连接应使用连接池
5. API应添加速率限制

### 9.3 已知问题
1. Webhook的XML解析可能需要处理更多边界情况
2. Access Token刷新机制需要更完善的错误处理
3. 消息发送API可能需要根据企业微信版本调整

---

## 十、测试指南

### 10.1 单元测试
```bash
npm test
```

### 10.2 集成测试
1. 测试企业微信配置保存和读取
2. 测试Access Token获取和缓存
3. 测试"联系我"二维码创建
4. 测试Webhook URL验证
5. 测试客户添加事件处理

### 10.3 端到端测试
1. 创建"联系我"二维码
2. 扫码添加客户
3. 验证客户信息同步到数据库
4. 发送消息给客户
5. 验证消息记录

---

## 十一、参考资料

- [企业微信API文档](https://developer.work.weixin.qq.com/document)
- [tRPC文档](https://trpc.io/)
- [Drizzle ORM文档](https://orm.drizzle.team/)
- [DeepSeek API文档](https://platform.deepseek.com/)
- [Qwen API文档](https://help.aliyun.com/zh/dashscope/)

---

**文档版本**: v1.0  
**最后更新**: 2026-02-07  
**维护者**: 开发团队

**当前状态**: ✅ 企业微信Webhook功能已实现并集成真实API
