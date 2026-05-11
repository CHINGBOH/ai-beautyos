# 医美智能营销管理系统 - 完整实施计划

## 系统概述

本系统是一套完整的医美行业智能营销管理解决方案，整合了客户关系管理（CRM）、内容营销、自动化触发、数据分析等核心功能，旨在实现从公域引流到私域转化的全流程智能化管理。

## 核心功能模块

### 1. 统一管理后台（Dashboard）
- 侧边栏导航（配置、分析、对话、内容、客户）
- 数据概览看板
- 快捷操作入口

### 2. 客户生命周期管理（CLM）
- 客户画像（基础信息 + 心理标签）
- 客户分层分级（VIP/潜力/普通/流失）
- 消费周期追踪
- 重要事件关切

### 3. 自动化营销触发系统
- 时间触发（生日、节假日、回访、复购）
- 行为触发（流失预警、高价值识别）
- 天气触发（降温、台风、高温、空气质量）

### 4. 内容营销系统
- 一键生成小红书爽文
- 图文素材管理
- 发布计划管理

### 5. 小红书运营管理
- 账户数据监控
- 评论管理和回复
- 私信管理
- 公域转私域追踪

### 6. AI 智能对话
- DeepSeek 驱动的客户端 AI 客服
- Qwen 驱动的后台数据分析
- 对话历史管理
- 自动提取客户信息

### 7. Airtable 双向集成
- 线索自动同步
- 客户信息读取
- 跟进记录管理

---

## 实施计划（按优先级）

### 第一阶段：核心管理后台 ⭐⭐⭐⭐⭐（最高优先级）
**目标**：建立统一的管理入口，整合现有功能

**任务清单**：
1. 创建 DashboardLayout 组件（侧边栏 + 内容区）
2. 设计侧边栏导航结构
3. 重构 Admin 页面为 Dashboard 子页面
4. 重构 Analytics 页面为 Dashboard 子页面
5. 创建对话管理页面（Conversations）
6. 实现对话列表和详情查看
7. 实现 AI 对话自动写入 Airtable
8. 实现从 Airtable 读取客户信息增强 AI 回复

**数据库表**：
- 无需新增，使用现有表

**预计时间**：2-3 小时

---

### 第二阶段：内容营销系统 ⭐⭐⭐⭐（高优先级）
**目标**：实现一键生成小红书爽文，提升内容生产效率

**任务清单**：
1. 创建内容管理页面（Content）
2. 实现一键生成爽文功能（标题 + 正文 + 话题标签）
3. 实现图文素材管理（上传、编辑、删除）
4. 实现内容模板管理（不同项目的文案模板）
5. 集成图片生成功能（复用之前的小红书图文生成）
6. 实现内容预览和导出

**数据库表**：
```sql
CREATE TABLE content_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  tags VARCHAR(500),
  project_type VARCHAR(100),
  images JSON,
  status ENUM('draft', 'published') DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**预计时间**：2-3 小时

---

### 第三阶段：客户画像增强 ⭐⭐⭐⭐（高优先级）
**目标**：建立完整的客户心理画像和分层体系

**任务清单**：
1. 扩展客户表，添加心理标签字段
2. 创建客户管理页面（Customers）
3. 实现客户列表、筛选、搜索
4. 实现客户详情页（画像 + 消费记录 + 对话历史）
5. 实现心理标签自动识别（LLM 分析对话）
6. 实现客户分层分级逻辑
7. 实现重要事件标记和提醒

**数据库表**：
```sql
CREATE TABLE customer_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  tag_type ENUM('psychology', 'behavior', 'lifecycle', 'event') NOT NULL,
  tag_name VARCHAR(100) NOT NULL,
  tag_value VARCHAR(200),
  confidence FLOAT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);

CREATE TABLE customer_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  lead_id INT NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  event_date DATE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lead_id) REFERENCES leads(id)
);
```

**预计时间**：3-4 小时

---

### 第四阶段：自动化触发系统 ⭐⭐⭐（中优先级）
**目标**：实现基于时间、行为、天气的自动化营销触发

**任务清单**：
1. 创建触发规则管理页面
2. 实现时间触发规则配置（生日、节假日、回访、复购）
3. 实现行为触发规则配置（流失预警、高价值识别）
4. 集成天气 API（和风天气/高德天气）
5. 实现天气触发规则配置（降温、台风、高温、空气质量）
6. 创建定时任务系统（Node.js cron）
7. 实现触发动作执行（企业微信推送、AI 主动对话、分配顾问）
8. 实现触发历史记录和效果追踪

**数据库表**：
```sql
CREATE TABLE trigger_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_name VARCHAR(200) NOT NULL,
  trigger_type ENUM('time', 'behavior', 'weather') NOT NULL,
  trigger_condition JSON NOT NULL,
  action_type ENUM('wechat_push', 'ai_chat', 'assign_consultant', 'sms') NOT NULL,
  action_config JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trigger_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_id INT NOT NULL,
  lead_id INT,
  trigger_time TIMESTAMP NOT NULL,
  action_result JSON,
  status ENUM('success', 'failed') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (rule_id) REFERENCES trigger_rules(id)
);
```

**预计时间**：4-5 小时

---

### 第五阶段：小红书运营管理 ⭐⭐（中低优先级）
**目标**：实现小红书数据监控和评论管理

**任务清单**：
1. 创建小红书运营页面（Xiaohongshu）
2. 调研小红书 API 或第三方工具（如蝉妈妈、新红）
3. 实现账户数据监控（浏览、点赞、评论、收藏）
4. 实现评论列表和回复功能
5. 实现私信管理（如果 API 支持）
6. 实现公域转私域追踪（评论/私信 → 线索）
7. 实现数据报表和趋势分析

**数据库表**：
```sql
CREATE TABLE xiaohongshu_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id VARCHAR(100) UNIQUE NOT NULL,
  title VARCHAR(200),
  content TEXT,
  images JSON,
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  comments INT DEFAULT 0,
  collects INT DEFAULT 0,
  published_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE xiaohongshu_comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id VARCHAR(100) NOT NULL,
  comment_id VARCHAR(100) UNIQUE NOT NULL,
  user_name VARCHAR(100),
  content TEXT,
  replied BOOLEAN DEFAULT FALSE,
  is_potential_lead BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**预计时间**：3-4 小时

---

### 第六阶段：系统集成测试 ⭐⭐⭐⭐（高优先级）
**目标**：确保所有模块正常运行，编写完整文档

**任务清单**：
1. 端到端测试（引流 → 对话 → 留资 → Airtable → 触发 → 跟进）
2. 性能优化（数据库索引、查询优化）
3. 编写用户使用手册
4. 编写系统管理员手册
5. 编写 API 文档
6. 录制功能演示视频

**预计时间**：2-3 小时

---

## 技术架构

### 前端
- React 19 + TypeScript
- Tailwind CSS 4
- tRPC（类型安全的 API 调用）
- Wouter（路由）
- shadcn/ui（UI 组件）

### 后端
- Node.js + Express
- tRPC Server
- MySQL/TiDB（数据库）
- Node-cron（定时任务）

### AI 集成
- DeepSeek API（客户端 AI 客服）
- Qwen API（后台数据分析）

### 第三方集成
- Airtable API（CRM 数据同步）
- 和风天气 API（天气触发）
- 企业微信 Webhook（消息推送）
- 小红书 API（待调研）

---

## 数据库完整设计

### 现有表
1. `users` - 用户表
2. `knowledge_base` - 知识库表
3. `conversations` - 对话表
4. `messages` - 消息表
5. `leads` - 线索表
6. `system_config` - 系统配置表

### 新增表（按阶段）
**第二阶段**：
- `content_posts` - 内容发布表

**第三阶段**：
- `customer_tags` - 客户标签表
- `customer_events` - 客户事件表

**第四阶段**：
- `trigger_rules` - 触发规则表
- `trigger_logs` - 触发日志表

**第五阶段**：
- `xiaohongshu_posts` - 小红书发布表
- `xiaohongshu_comments` - 小红书评论表

---

## 总预计时间

- 第一阶段：2-3 小时
- 第二阶段：2-3 小时
- 第三阶段：3-4 小时
- 第四阶段：4-5 小时
- 第五阶段：3-4 小时
- 第六阶段：2-3 小时

**总计：16-22 小时**

---

## 立即开始

**当前优先级：第一阶段 - 核心管理后台**

我现在开始实施第一阶段，创建统一的 Dashboard 系统。完成后会立即交付给您测试，然后继续下一阶段。

---

*文档作者：Manus AI*  
*最后更新：2026-02-03*
