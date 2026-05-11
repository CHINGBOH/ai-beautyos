# 启动检查清单

## ✅ 已完成的检查

### 1. 依赖安装 ✅
- [x] xml2js 和 @types/xml2js 已安装
- [x] 所有 package.json 中的依赖已安装

### 2. 环境变量配置 ✅
- [x] 创建了 `.env.example` 模板文件
- [x] 创建了启动验证脚本 `scripts/verify-startup.ts`

**必需的环境变量**:
- `DATABASE_URL` - 数据库连接字符串
- `DEEPSEEK_API_KEY` - DeepSeek API密钥（AI客服需要）

**可选的环境变量**:
- `QWEN_API_KEY` - Qwen API密钥（数据分析需要）
- `AIRTABLE_API_KEY` - Airtable API密钥（CRM同步）
- `AIRTABLE_BASE_ID` - Airtable Base ID
- `PORT` - 服务器端口（默认：3000）

### 3. 代码编译检查 ✅
- [x] TypeScript 编译检查通过（`npm run check`）
- [x] 修复了 `server/wework-webhook.ts` 中的类型错误
- [x] 修复了 `client/src/pages/DashboardTriggers.tsx` 中的类型错误

### 4. 启动验证脚本 ✅
- [x] 创建了 `scripts/verify-startup.ts` 验证脚本
- [x] 脚本可以检查环境变量、数据库连接、关键文件等

## 📋 启动步骤

### 1. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，至少配置：
- `DATABASE_URL` - 数据库连接字符串
- `DEEPSEEK_API_KEY` - DeepSeek API密钥

### 2. 初始化数据库

确保数据库服务正在运行，然后执行：

```bash
npm run db:push
```

这将创建所有必需的数据表。

### 3. 运行启动验证（可选）

```bash
npx tsx scripts/verify-startup.ts
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器将在 http://localhost:3000 启动（或下一个可用端口）。

## 🧪 功能测试清单

### AI对话功能测试
1. 访问 http://localhost:3000/chat
2. 测试创建对话会话
3. 发送消息并验证AI回复
4. 测试客户信息提取

### 客户管理功能测试
1. 访问 http://localhost:3000/dashboard/customers
2. 验证客户列表加载
3. 测试搜索和筛选功能
4. 查看客户详情

### 数据分析功能测试
1. 访问 http://localhost:3000/dashboard/analytics
2. 验证数据概览加载
3. 测试生成报告功能（需要配置QWEN_API_KEY）

### 企业微信功能测试
1. 运行 `npm run wework:init` 初始化配置
2. 运行 `npm run wework:test` 测试API连接
3. 访问企业微信管理页面测试配置保存

## ⚠️ 常见问题

### 服务器无法启动
- 检查 `DATABASE_URL` 是否正确配置
- 检查端口是否被占用
- 查看控制台错误日志

### 数据库连接失败
- 确认数据库服务正在运行
- 检查 `DATABASE_URL` 格式和权限
- 运行 `npm run db:push` 创建表结构

### AI功能不可用
- 检查 `DEEPSEEK_API_KEY` 是否配置
- 验证API密钥是否有效
- 检查网络连接

### 企业微信功能报错
- 确认 `xml2js` 依赖已安装
- 检查企业微信配置是否正确初始化
- 验证Webhook路由是否正确注册

## 📝 下一步

完成启动检查后，可以：
1. 测试各个功能模块
2. 配置Airtable集成（可选）
3. 配置企业微信回调（可选）
4. 添加测试数据

---

**最后更新**: 2026-02-07
