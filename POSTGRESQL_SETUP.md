# PostgreSQL + pgvector 迁移完成

## ✅ 已完成的工作

1. **依赖更新**
   - 移除 `mysql2`
   - 添加 `pg` 和 `postgres` 驱动
   - 更新 `drizzle.config.ts` 为 PostgreSQL dialect

2. **Schema 转换**
   - 所有表从 `mysqlTable` 改为 `pgTable`
   - `int().autoincrement()` 改为 `serial()`
   - `mysqlEnum` 改为 `varchar`（PostgreSQL enum 需要额外处理）
   - `onUpdateNow()` 改为 `$onUpdateFn(() => new Date())`
   - 向量字段使用 `text` 类型（pgvector 扩展需要手动启用）

3. **数据库操作修复**
   - `onDuplicateKeyUpdate` 改为 `onConflictDoUpdate`
   - `insertId` 改为使用 `returning()` 获取插入的 ID
   - 修复所有重复声明的变量

4. **配置文件**
   - 创建 `.env` 文件，包含 PostgreSQL 连接字符串
   - 配置 Airtable API Key 和 Base ID

## 🔧 需要手动完成的步骤

### 1. 配置 PostgreSQL 数据库

确保 PostgreSQL 已安装并运行：

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 如果未运行，启动服务
sudo systemctl start postgresql
```

### 2. 创建数据库和启用 pgvector

```bash
# 创建数据库
sudo -u postgres psql -c "CREATE DATABASE medical_beauty_crm;"

# 连接到数据库并启用 pgvector 扩展
sudo -u postgres psql -d medical_beauty_crm -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 3. 配置数据库连接

编辑 `.env` 文件，根据你的 PostgreSQL 配置修改 `DATABASE_URL`：

```env
DATABASE_URL=postgresql://用户名:密码@localhost:5432/medical_beauty_crm
```

### 4. 运行数据库迁移

```bash
npm run db:push
```

如果遇到迁移问题，可以手动执行：

```bash
# 生成迁移文件
npx drizzle-kit generate

# 应用迁移
npx drizzle-kit migrate
```

### 5. 初始化配置

```bash
# 初始化 Airtable 配置
npx tsx scripts/init-airtable-config.ts

# 初始化企业微信配置（如果需要）
npm run wework:init
```

### 6. 启动服务器

```bash
npm run dev
```

## 📝 注意事项

1. **pgvector 扩展**：如果未安装 pgvector，向量搜索功能将不可用。安装方法：
   ```bash
   # Ubuntu/Debian
   sudo apt-get install postgresql-15-pgvector

   # 或从源码编译
   git clone https://github.com/pgvector/pgvector.git
   cd pgvector
   make
   sudo make install
   ```

2. **数据库认证**：如果遇到认证问题，检查 PostgreSQL 的 `pg_hba.conf` 配置。

3. **迁移历史**：旧的 MySQL 迁移文件已清理，需要重新生成 PostgreSQL 迁移。

## 🎯 验证步骤

1. 检查数据库连接：
   ```bash
   psql $DATABASE_URL -c "SELECT version();"
   ```

2. 检查表是否创建：
   ```bash
   psql $DATABASE_URL -c "\dt"
   ```

3. 检查服务器是否正常启动：
   ```bash
   curl http://localhost:3000
   ```

## 🐛 常见问题

- **连接失败**：检查 PostgreSQL 服务是否运行，用户名密码是否正确
- **迁移失败**：确保数据库已创建，用户有足够权限
- **类型错误**：确保所有 TypeScript 类型已更新（运行 `npm run check`）
