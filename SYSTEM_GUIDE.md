# 医美 CRM 系统使用指南

## 系统概述

这是一套完整的医美线索管理系统，集成了 AI 客服机器人、引流落地页、Airtable CRM 和知识库管理，实现从公域引流到私域转化的全流程智能管理。

## 核心功能

### 1. 引流落地页（/）

**功能特点：**
- 超皮秒祛斑项目展示
- 项目优势、适合人群、客户评价展示
- 在线预约表单
- 一键跳转 AI 客服咨询

**表单字段：**
- 姓名（必填）
- 手机号（必填）
- 微信号（选填）
- 预算区间（选填）
- 需求留言（选填）

**来源追踪：**
系统支持通过 URL 参数追踪来源渠道，例如：
- `/?source=小红书` - 小红书渠道
- `/?source=抖音` - 抖音渠道
- `/?source=朋友圈` - 微信朋友圈

### 2. AI 客服机器人（/chat）

**核心能力：**
- 基于 DeepSeek API 的智能对话
- 医美行业专业知识库（RAG）
- 自动提取客户信息（姓名、手机、微信、意向项目、预算）
- 对话转线索功能
- 自动同步到 Airtable

**知识库内容：**
- 超皮秒祛斑项目介绍
- 治疗效果和疗程
- 治疗过程和疼痛感
- 术后护理注意事项
- 价格参考和套餐
- 适合人群和禁忌症
- 与传统激光对比
- 常见问题 FAQ

**使用流程：**
1. 访客进入聊天页面，系统自动创建会话
2. AI 顾问发送欢迎消息
3. 访客咨询问题，AI 基于知识库回答
4. 对话中自动识别客户信息
5. 访客点击"预约面诊"按钮，填写完整信息
6. 系统自动创建线索并同步到 Airtable

### 3. Airtable 集成

**数据同步：**
系统将线索数据实时同步到 Airtable，包括：
- 客户基本信息（姓名、手机、微信）
- 意向项目和预算
- 来源渠道
- 留言内容
- 对话记录关联

**Airtable 表结构建议：**

#### 线索池表（Leads）
- 姓名（Single line text）
- 手机号（Phone number）
- 微信号（Single line text）
- 意向项目（Multiple select）
- 预算区间（Single select）
- 来源渠道（Single select）
- 来源详情（Long text）
- 留言（Long text）
- 状态（Single select：新线索、已联系、已预约、已到店、已成交、无效）
- 分配顾问（Link to 员工表）
- 创建时间（Created time）
- 最后更新（Last modified time）

#### 客户库表（Customers）
- 客户姓名（Single line text）
- 手机号（Phone number）
- 微信号（Single line text）
- 客户等级（Single select：潜在客户、普通客户、VIP客户、黑名单）
- 累计消费（Currency）
- 消费次数（Number）
- 标签（Multiple select）
- 关联线索（Link to 线索池表）
- 关联订单（Link to 订单表）

#### 预约管理表（Appointments）
- 客户（Link to 客户库表）
- 预约项目（Single select）
- 预约时间（Date）
- 预约状态（Single select：待确认、已确认、已到店、已完成、已取消）
- 接待顾问（Link to 员工表）
- 备注（Long text）

#### 订单管理表（Orders）
- 订单编号（Single line text）
- 客户（Link to 客户库表）
- 项目名称（Single select）
- 订单金额（Currency）
- 实付金额（Currency）
- 支付状态（Single select：未支付、已支付、已退款）
- 订单状态（Single select：进行中、已完成、已取消）
- 创建时间（Created time）

### 4. 数据库架构

系统使用 MySQL 数据库存储本地数据，包含以下核心表：

#### knowledge_base（知识库表）
- id：主键
- title：标题
- content：内容
- category：分类（项目介绍、注意事项、价格政策、FAQ）
- tags：标签（JSON 数组）
- is_active：是否启用
- used_count：使用次数
- created_at：创建时间
- updated_at：更新时间

#### conversations（对话表）
- id：主键
- session_id：会话 ID（唯一）
- visitor_name：访客姓名
- visitor_phone：访客手机
- visitor_wechat：访客微信
- source：来源（web、wechat、enterprise_wechat）
- status：状态（active、converted、closed）
- lead_id：关联线索 ID（Airtable）
- created_at：创建时间
- updated_at：更新时间

#### messages（消息表）
- id：主键
- conversation_id：对话 ID
- role：角色（user、assistant）
- content：消息内容
- knowledge_used：使用的知识库 ID（JSON 数组）
- extracted_info：提取的客户信息（JSON）
- created_at：创建时间

#### leads（线索表）
- id：主键
- name：姓名
- phone：手机号
- wechat：微信号
- interested_services：意向项目（JSON 数组）
- budget：预算区间
- message：留言
- source：来源渠道
- source_content：来源详情
- status：状态
- airtable_id：Airtable 记录 ID
- conversation_id：关联对话 ID
- synced_at：同步时间
- created_at：创建时间

## 环境变量配置

系统需要配置以下环境变量（通过 Manus 管理界面配置）：

### 必需配置

**Airtable 集成：**
- `AIRTABLE_API_TOKEN`：Airtable Personal Access Token
- `AIRTABLE_BASE_ID`：Airtable Base ID

**DeepSeek API：**
- `DEEPSEEK_API_KEY`：DeepSeek API Key（通过本地环境变量或部署平台密钥管理配置，不要提交真实密钥）

### 获取 Airtable 凭证

1. **创建 Airtable Base：**
   - 访问 https://airtable.com
   - 创建新的 Base，命名为"医美 CRM"
   - 按照上述表结构创建表格

2. **获取 Base ID：**
   - 打开 Base，查看 URL
   - URL 格式：`https://airtable.com/appXXXXXXXXXXXXXX/...`
   - `appXXXXXXXXXXXXXX` 就是 Base ID

3. **创建 Personal Access Token：**
   - 访问 https://airtable.com/create/tokens
   - 点击"Create new token"
   - 设置权限：`data.records:read` 和 `data.records:write`
   - 选择对应的 Base
   - 创建并复制 Token

4. **配置到系统：**
   - 在 Manus 管理界面，进入"Settings" → "Secrets"
   - 添加 `AIRTABLE_API_TOKEN` 和 `AIRTABLE_BASE_ID`

## 自动化工作流建议

### 1. 新线索自动分配

**触发条件：**新线索创建时

**操作步骤：**
1. 根据来源渠道自动分配销售顾问
2. 更新线索状态为"已分配"
3. 发送通知给分配的顾问（企业微信/邮件）

### 2. 线索跟进提醒

**触发条件：**线索创建 30 分钟后，状态仍为"新线索"

**操作步骤：**
1. 检查线索状态
2. 如果未联系，发送提醒给分配顾问
3. 更新提醒次数

### 3. 预约确认提醒

**触发条件：**预约时间前 24 小时

**操作步骤：**
1. 发送短信/微信提醒客户
2. 提醒接待顾问准备
3. 更新预约状态为"已提醒"

### 4. 到店未成交跟进

**触发条件：**预约完成后 2 小时，未创建订单

**操作步骤：**
1. 标记为"到店未成交"
2. 创建跟进任务
3. 发送满意度调查

### 5. 客户等级自动升级

**触发条件：**订单完成时

**操作步骤：**
1. 计算累计消费和消费次数
2. 根据规则自动升级客户等级
   - 累计消费 > 10000 元：VIP 客户
   - 累计消费 > 5000 元：普通客户
   - 其他：潜在客户
3. 更新客户标签

### 6. 知识库热度统计

**触发条件：**每天凌晨

**操作步骤：**
1. 统计昨日各知识条目使用次数
2. 生成知识库热度报告
3. 标记需要更新的知识条目

### 7. 对话质量监控

**触发条件：**对话结束时

**操作步骤：**
1. 分析对话轮次和时长
2. 检查是否成功转化为线索
3. 记录转化率数据

### 8. 渠道效果分析

**触发条件：**每周一

**操作步骤：**
1. 统计各渠道线索数量
2. 计算转化率和成交率
3. 生成渠道效果报告

## 企业微信集成（待开发）

### 功能规划

**消息接收：**
- 创建 webhook 接收企业微信消息
- 解析消息内容和发送者信息

**智能分流：**
- 判断当前时间是否为工作时间（9:00-21:00）
- 工作时间：转发给人工客服
- 非工作时间：AI 自动回复

**消息同步：**
- 将企业微信对话同步到系统
- 关联到对应的客户记录
- 记录对话历史

### 配置步骤（待实现）

1. 在企业微信后台配置应用
2. 获取 `Corp ID` 和 `Agent Secret`
3. 配置 webhook 回调 URL
4. 在系统中添加环境变量
5. 测试消息接收和回复

## 数据统计看板（待开发）

### 关键指标

**线索指标：**
- 今日新增线索数
- 本周新增线索数
- 本月新增线索数
- 线索来源分布（饼图）
- 线索状态分布（柱状图）

**转化指标：**
- 线索到预约转化率
- 预约到到店转化率
- 到店到成交转化率
- 整体转化漏斗（漏斗图）

**业绩指标：**
- 今日成交金额
- 本周成交金额
- 本月成交金额
- 客单价趋势（折线图）
- 各项目成交占比（饼图）

**AI 客服指标：**
- 对话总数
- 平均对话轮次
- 对话转线索率
- 知识库命中率
- 热门咨询问题 Top 10

## 使用建议

### 1. 落地页推广

**小红书推广：**
- 发布超皮秒祛斑图文内容（已生成）
- 在简介或评论区放置落地页链接
- 链接格式：`https://your-domain.com/?source=小红书`

**抖音推广：**
- 发布医美科普短视频
- 在主页链接或评论区引导访问
- 链接格式：`https://your-domain.com/?source=抖音`

**微信推广：**
- 朋友圈分享落地页
- 公众号文章插入链接
- 链接格式：`https://your-domain.com/?source=微信`

### 2. AI 客服使用

**初期配置：**
1. 完善知识库内容（添加更多项目和 FAQ）
2. 测试对话质量，优化 Prompt
3. 训练团队使用对话转线索功能

**日常运营：**
1. 每天查看对话记录，了解客户关注点
2. 根据高频问题补充知识库
3. 分析对话转化率，优化话术

### 3. Airtable 管理

**线索管理：**
1. 每天早上查看新线索，及时分配
2. 设置提醒，确保 30 分钟内联系
3. 更新线索状态，记录跟进情况

**客户管理：**
1. 定期维护客户信息，更新标签
2. 关注 VIP 客户，提供专属服务
3. 分析客户画像，优化营销策略

**数据分析：**
1. 每周查看渠道效果，调整投放策略
2. 每月分析转化漏斗，找出瓶颈
3. 季度复盘业绩，制定下季度目标

## 技术架构

### 前端技术栈
- React 19 + TypeScript
- Tailwind CSS 4（医美粉色系主题）
- tRPC（类型安全的 API 调用）
- Wouter（路由）
- shadcn/ui（UI 组件库）

### 后端技术栈
- Node.js + Express
- tRPC Server
- MySQL（TiDB）
- Drizzle ORM

### 第三方集成
- DeepSeek API（LLM 对话）
- Airtable API（CRM 数据同步）
- Manus 内置服务（认证、存储、通知）

## 常见问题

### Q: 如何添加新的医美项目？

A: 在知识库表中添加新项目的知识条目，包括项目介绍、效果、价格、注意事项等。AI 客服会自动学习并回答相关问题。

### Q: 如何修改 AI 客服的回复风格？

A: 编辑 `server/deepseek.ts` 文件中的 `MEDICAL_BEAUTY_SYSTEM_PROMPT` 常量，调整 Prompt 内容。

### Q: 如何查看对话历史？

A: 在数据库管理界面查询 `conversations` 和 `messages` 表，或通过 Airtable 查看关联的对话记录。

### Q: 如何处理重复线索？

A: 系统会根据手机号自动去重。如果同一手机号多次提交，会更新现有记录而不是创建新记录。

### Q: 如何导出数据？

A: 在 Airtable 中可以直接导出 CSV 或 Excel 文件。本地数据库可以通过 SQL 查询导出。

## 后续优化方向

1. **向量化知识库**：实现语义搜索，提升知识匹配准确度
2. **企业微信集成**：完成 webhook 开发，实现非工作时间自动回复
3. **管理后台**：开发可视化管理界面，方便查看和管理数据
4. **数据看板**：实现实时数据统计和可视化图表
5. **客户画像**：基于行为数据构建更精准的客户画像
6. **A/B 测试**：测试不同落地页版本和话术的转化效果
7. **多项目支持**：扩展系统支持更多医美项目
8. **移动端优化**：优化移动端体验，提升转化率

## 联系支持

如有问题或需要技术支持，请联系开发团队。

---

**系统版本：** 1.0.0  
**最后更新：** 2024-02-03
