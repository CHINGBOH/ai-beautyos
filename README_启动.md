# 🎯 美业CRM系统 - 启动说明

## ✅ 已完成

1. ✅ 代码已从MySQL迁移到PostgreSQL + pgvector
2. ✅ 所有TypeScript类型已修复
3. ✅ 服务器已启动在 http://localhost:3000
4. ✅ 配置文件已创建（.env）

## 🚀 立即使用

### 步骤1：初始化数据库（必须）

选择以下任一方式：

**方式A：使用SQL脚本（最简单）**
```bash
sudo -u postgres psql -c "CREATE DATABASE medical_beauty_crm;" 2>/dev/null || true
sudo -u postgres psql -d medical_beauty_crm -f scripts/init-database.sql
```

**方式B：使用Drizzle迁移**
```bash
# 先确保 .env 中的 DATABASE_URL 正确
npm run db:push
```

### 步骤2：验证系统

```bash
# 检查数据库表
psql $DATABASE_URL -c "\dt" 2>/dev/null || echo "请先初始化数据库"

# 检查服务器
curl http://localhost:3000
```

### 步骤3：访问系统

打开浏览器访问：**http://localhost:3000**

## 📋 当前配置

- **数据库**: PostgreSQL (需要初始化)
- **Airtable**: 通过本地环境变量配置
- **DeepSeek API**: 通过本地环境变量配置
- **服务器端口**: 3000

## 🔧 如果数据库连接失败

编辑 `.env` 文件，修改 `DATABASE_URL`：

```env
# 选项1：使用postgres用户（需要密码）
DATABASE_URL=postgresql://postgres:你的密码@localhost:5432/medical_beauty_crm

# 选项2：使用当前用户（peer认证）
DATABASE_URL=postgresql://l@localhost:5432/medical_beauty_crm

# 选项3：使用socket（如果配置了）
DATABASE_URL=postgresql:///medical_beauty_crm
```

## 📝 功能清单

初始化数据库后，以下功能可用：

- ✅ AI客服对话（前端）
- ✅ 客户线索管理
- ✅ 客户画像分析
- ✅ 知识库RAG
- ✅ 企业微信Webhook
- ✅ Airtable同步
- ✅ 自动化触发器

## 🎉 开始使用

1. 初始化数据库（见步骤1）
2. 访问 http://localhost:3000
3. 开始使用！
