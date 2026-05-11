# 快速启动指南

## 🚀 服务器已启动

服务器正在运行在: **http://localhost:3000**

浏览器应该已经自动打开。如果没有，请手动访问: http://localhost:3000

## 📋 当前状态

✅ 服务器已启动  
✅ UI界面可访问  
⚠️ 数据库需要配置（DATABASE_URL）  
⚠️ 需要配置数据库才能使用AI聊天功能

## 🔧 配置数据库（必需）

### 方式1: 使用MySQL/MariaDB

1. 确保MySQL服务正在运行
2. 创建数据库：
   ```bash
   mysql -u root -p
   CREATE DATABASE medical_beauty_crm;
   ```

3. 创建 `.env` 文件：
   ```bash
   cp .env.example .env
   ```

4. 编辑 `.env` 文件，设置数据库连接：
   ```env
   DATABASE_URL=mysql://用户名:密码@localhost:3306/medical_beauty_crm
   DEEPSEEK_API_KEY=replace_with_your_deepseek_key
   ```

5. 创建数据库表：
   ```bash
   npm run db:push
   ```

6. 重启服务器（如果已启动）

### 方式2: 使用SQLite（开发测试）

如果需要快速测试，可以修改代码使用SQLite（需要修改drizzle配置）。

## 🧪 测试功能

### 1. 测试AI聊天功能

访问: http://localhost:3000/chat

**功能说明**:
- 自动创建对话会话
- AI客服自动回复
- 支持知识库检索
- 自动提取客户信息

**测试步骤**:
1. 打开聊天页面
2. 输入问题，例如："我想咨询超皮秒祛斑项目"
3. AI会自动回复
4. 继续对话测试信息提取功能

### 2. 测试企业微信功能

访问: http://localhost:3000/dashboard（需要登录）

**功能说明**:
- 企业微信配置管理
- 创建"联系我"二维码
- 客户管理
- 消息发送

**测试步骤**:
1. 初始化企业微信配置：
   ```bash
   npm run wework:init
   ```

2. 测试API连接：
   ```bash
   npm run wework:test
   ```

3. 在管理后台创建"联系我"二维码

### 3. 测试客户管理功能

访问: http://localhost:3000/dashboard/customers

**功能说明**:
- 客户列表查看
- 客户搜索和筛选
- 客户详情查看
- 客户画像展示

## 📱 UI界面说明

### 主要页面

1. **首页** (`/`) - 引流落地页
   - 项目展示
   - 在线预约表单
   - 跳转AI客服

2. **AI客服** (`/chat`) - 智能对话
   - 实时对话
   - 知识库检索
   - 信息提取

3. **管理后台** (`/dashboard/*`) - 需要登录
   - 客户管理
   - 数据分析
   - 企业微信配置
   - 触发器管理

## 🔍 故障排查

### 数据库连接失败

错误: `Database not available`

**解决方法**:
1. 检查 `.env` 文件中的 `DATABASE_URL` 是否正确
2. 确认数据库服务正在运行
3. 检查数据库用户权限
4. 运行 `npm run db:push` 创建表结构

### AI功能不可用

**解决方法**:
1. 检查 `DEEPSEEK_API_KEY` 是否配置
2. 默认API key已内置，应该可以直接使用
3. 检查网络连接

### 企业微信功能报错

**解决方法**:
1. 运行 `npm run wework:init` 初始化配置
2. 检查企业微信配置是否正确
3. 确认 `xml2js` 依赖已安装

## 📝 下一步

1. ✅ 配置数据库连接
2. ✅ 运行数据库迁移
3. ✅ 测试AI聊天功能
4. ✅ 测试企业微信功能
5. ✅ 添加测试数据

---

**提示**: 服务器正在后台运行，可以随时访问 http://localhost:3000
